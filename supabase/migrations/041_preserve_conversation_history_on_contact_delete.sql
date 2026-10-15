-- Delete customer-specific data and WhatsApp history.
-- Preserve deals and broadcast recipient history.

ALTER TABLE public.contact_tags
  DROP CONSTRAINT IF EXISTS contact_tags_contact_id_fkey;
ALTER TABLE public.contact_tags
  ADD CONSTRAINT contact_tags_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE public.contact_custom_values
  DROP CONSTRAINT IF EXISTS contact_custom_values_contact_id_fkey;
ALTER TABLE public.contact_custom_values
  ADD CONSTRAINT contact_custom_values_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE public.contact_notes
  DROP CONSTRAINT IF EXISTS contact_notes_contact_id_fkey;
ALTER TABLE public.contact_notes
  ADD CONSTRAINT contact_notes_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_contact_id_fkey;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Remove the conversation link from deals before deleting a conversation,
-- while preserving the deal itself.
ALTER TABLE public.deals
  ALTER COLUMN contact_id DROP NOT NULL;

ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_contact_id_fkey;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_conversation_id_fkey;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;

-- Preserve broadcast history by removing only its contact reference.
ALTER TABLE public.broadcast_recipients
  ALTER COLUMN contact_id DROP NOT NULL;

ALTER TABLE public.broadcast_recipients
  DROP CONSTRAINT IF EXISTS broadcast_recipients_contact_id_fkey;
ALTER TABLE public.broadcast_recipients
  ADD CONSTRAINT broadcast_recipients_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;
