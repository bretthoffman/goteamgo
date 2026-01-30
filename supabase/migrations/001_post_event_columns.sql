-- Post Event Copy Review: add columns to keap_call_events (Option A).
-- Run this in the Supabase SQL editor against your project.

-- 1) confirmed (add if not already present; safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'keap_call_events' AND column_name = 'confirmed'
  ) THEN
    ALTER TABLE public.keap_call_events
    ADD COLUMN confirmed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2) post_event_enabled (on original event: whether to show the post-event on calendar)
ALTER TABLE public.keap_call_events
ADD COLUMN IF NOT EXISTS post_event_enabled boolean NOT NULL DEFAULT false;

-- 3) post_event_event_id (on original: FK to the description_copy event row)
ALTER TABLE public.keap_call_events
ADD COLUMN IF NOT EXISTS post_event_event_id uuid NULL;

-- 4) event_kind: 'call' = normal, 'description_copy' = post-event item
ALTER TABLE public.keap_call_events
ADD COLUMN IF NOT EXISTS event_kind text NOT NULL DEFAULT 'call';

-- 5) parent_event_id (on post-event row: FK to the original call event)
ALTER TABLE public.keap_call_events
ADD COLUMN IF NOT EXISTS parent_event_id uuid NULL;

-- Foreign keys (only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'keap_call_events_post_event_event_id_fkey'
  ) THEN
    ALTER TABLE public.keap_call_events
    ADD CONSTRAINT keap_call_events_post_event_event_id_fkey
    FOREIGN KEY (post_event_event_id) REFERENCES public.keap_call_events(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'keap_call_events_parent_event_id_fkey'
  ) THEN
    ALTER TABLE public.keap_call_events
    ADD CONSTRAINT keap_call_events_parent_event_id_fkey
    FOREIGN KEY (parent_event_id) REFERENCES public.keap_call_events(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Optional: ensure event_kind has a check for allowed values
-- ALTER TABLE public.keap_call_events DROP CONSTRAINT IF EXISTS keap_call_events_event_kind_check;
-- ALTER TABLE public.keap_call_events ADD CONSTRAINT keap_call_events_event_kind_check CHECK (event_kind IN ('call', 'description_copy'));
