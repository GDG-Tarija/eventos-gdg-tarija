import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../../../../../core/supabase/supabase.client';
import { EventRole, RegistrationInsert, RegistrationStatus } from '../../../../../models/registration.model';

interface RegistrationRow {
  id: string;
  event_id: string;
  user_id: string;
  ticket_type_id: string;
  status: RegistrationStatus;
  created_at?: string;
}

/** Código de error del trigger cuando el paquete o todas sus fases se quedaron sin cupo. */
export const TICKET_SOLD_OUT_CODE = 'P0010';

export class TicketSoldOutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TicketSoldOutError';
  }
}

export type CouponRole = EventRole;

export interface CouponValidation {
  valid: boolean;
  id?: string;
  role?: CouponRole;
  error?: string;
}

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

  async createRegistration(
    registration: RegistrationInsert,
  ): Promise<{ id: string; status: RegistrationStatus }> {
    const { data, error } = await this.supabase
      .from('registrations')
      .insert(registration)
      .select('id,status')
      .single();
    if (error) {
      if (error.code === TICKET_SOLD_OUT_CODE) throw new TicketSoldOutError(error.message);
      throw new Error(`[registrations.insert] ${error.code ?? ''} ${error.message} ${error.details ?? ''}`.trim());
    }
    return data as unknown as { id: string; status: RegistrationStatus };
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

  async validateCoupon(eventId: string, code: string): Promise<CouponValidation | null> {
    const cleanCode = code.trim();
    if (!cleanCode) return null;

    const { data, error } = await this.supabase.rpc('validate_coupon', {
      p_event_id: eventId,
      p_code: cleanCode,
    });

    if (error) {
      return { valid: false, error: 'Error al verificar el cupón' };
    }

    const coupon = Array.isArray(data) ? data[0] : null;
    if (!coupon) {
      return { valid: false, error: 'Código de invitación no válido o expirado.' };
    }

    if (coupon.uses_left <= 0) {
      return { valid: false, error: 'Este código de invitación ya ha superado el límite de usos permitidos.' };
    }

    return { valid: true, id: coupon.id, role: coupon.role as CouponRole };
  }
}
