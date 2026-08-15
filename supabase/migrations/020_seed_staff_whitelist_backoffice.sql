-- El back-office (back-office-gdg-tarija) autoriza operadores vía un
-- AUTH_WHITELIST hardcodeado en frontend (pedro2528anze@gmail.com,
-- gdgtarija@gmail.com), independiente de users.is_staff. El hardening
-- de seguridad restringió events/ticket_types/scan_logs/etc a
-- is_staff(), que no reconocía a estos operadores -> back-office roto.
-- Se sincroniza vía staff_whitelist (ya contemplado por is_staff()).
INSERT INTO public.staff_whitelist (email, role)
VALUES
  ('pedro2528anze@gmail.com', 'SUPERADMIN'),
  ('gdgtarija@gmail.com', 'STAFF')
ON CONFLICT (email) DO NOTHING;
