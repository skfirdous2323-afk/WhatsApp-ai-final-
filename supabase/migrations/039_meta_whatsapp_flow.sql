-- Meta WhatsApp Flow configuration
-- One optional Meta Flow ID per WhatsApp account/clinic.

ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS meta_flow_id TEXT;

ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS meta_flow_token TEXT;

COMMENT ON COLUMN whatsapp_config.meta_flow_id
  IS 'Published Meta WhatsApp Flow ID used for appointment booking';

COMMENT ON COLUMN whatsapp_config.meta_flow_token
  IS 'Optional token passed to the Meta WhatsApp Flow';
