import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../../../../core/supabase/supabase.client';
import { RegistrationInsert } from '../../../../../models/registration.model';

type RegistrationRow = {
  id: string;
  event_id: string;
  user_id: string;
  ticket_type_id: string;
  status: string;
  created_at?: string;
};

@Injectable({ providedIn: 'root' })
export class RegistrationsService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE);

  async getByEventAndUser(eventId: string, userId: string): Promise<RegistrationRow | null> {
    const { data, error } = await this.supabase
      .from('registrations')
      .select('id,event_id,user_id,ticket_type_id,status,created_at')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`[registrations.getByEventAndUser] ${error.code ?? ''} ${error.message} ${error.details ?? ''}`.trim());
    }
    return (data as unknown as RegistrationRow) ?? null;
  }

  async createRegistration(registration: RegistrationInsert): Promise<string> {
    const { data, error } = await this.supabase
      .from('registrations')
      .insert(registration)
      .select('id')
      .single();
    if (error) {
      throw new Error(`[registrations.insert] ${error.code ?? ''} ${error.message} ${error.details ?? ''}`.trim());
    }
    return (data as unknown as { id: string }).id;
  }

  async uploadPaymentProof(file: File, eventId: string, userId: string): Promise<string> {
    if (file.size <= 0) throw new Error('[storage.upload] Archivo vacío');
    if (file.type && !file.type.startsWith('image/')) {
      throw new Error('[storage.upload] Tipo de archivo no permitido');
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const safeExt = (ext ?? 'jpg').toLowerCase();
    const path = `${eventId}/${userId}/${Date.now()}.${safeExt}`;

    const { error } = await this.supabase.storage.from('payment-proofs').upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
      cacheControl: '3600',
    });

    if (error) {
      const status = (error as unknown as { statusCode?: number }).statusCode;
      throw new Error(`[storage.upload] ${status ?? ''} ${error.message}`.trim());
    }

    // El bucket ahora es público: obtenemos y devolvemos la URL pública del archivo.
    const { data } = this.supabase.storage.from('payment-proofs').getPublicUrl(path);
    return data.publicUrl;
  }

  async validateCoupon(eventId: string, code: string): Promise<{ valid: boolean; id?: string; role?: 'ATTENDEE' | 'SPEAKER' | 'STAFF'; error?: string } | null> {
    const cleanCode = code.trim().toLowerCase();
    if (!cleanCode) return null;

    const { data: coupon, error } = await this.supabase
      .from('event_coupons')
      .select('id, role, max_uses')
      .eq('event_id', eventId)
      .ilike('code', cleanCode)
      .maybeSingle();

    if (error) {
      console.error('[RegistrationsService.validateCoupon] Error al buscar cupón:', error);
      return { valid: false, error: 'Error al verificar el cupón' };
    }

    if (!coupon) {
      return { valid: false, error: 'Código de invitación no válido o expirado.' };
    }

    // Contar los usos actuales del cupón de manera segura usando la función RPC
    const { data: usedCount, error: countErr } = await this.supabase
      .rpc('get_coupon_uses', { p_coupon_id: coupon.id });

    if (countErr) {
      console.error('[RegistrationsService.validateCoupon] Error al contar los usos del cupón:', countErr);
      return { valid: false, error: 'Error al validar los usos del cupón' };
    }

    const used = (usedCount as number) ?? 0;
    if (used >= coupon.max_uses) {
      return { valid: false, error: 'Este código de invitación ya ha superado el límite de usos permitidos.' };
    }

    return {
      valid: true,
      id: coupon.id as string,
      role: coupon.role as 'ATTENDEE' | 'SPEAKER' | 'STAFF',
    };
  }
}
