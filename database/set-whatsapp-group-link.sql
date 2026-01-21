-- Ajouter / mettre à jour le lien WhatsApp du groupe dans admin_settings
-- Table: public.admin_settings (value est en JSONB)

INSERT INTO public.admin_settings (key, value)
VALUES (
  'whatsapp_group_link',
  to_jsonb('https://chat.whatsapp.com/CKhHl2ebwyqGql0oIzx3Q0'::text)
)
ON CONFLICT (key)
DO UPDATE SET value = excluded.value;

