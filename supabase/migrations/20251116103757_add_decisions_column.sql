/*
  # Add decisions column to meeting_minutes table

  1. Changes
    - Add `decisions` column to `meeting_minutes` table
      - Type: jsonb (stores array of decision objects)
      - Default: empty array '[]'
      - Each decision object has: id, text (like todos but simpler)
  
  2. Purpose
    - Store meeting decisions extracted from transcript
    - Separate from todos (action items with progress tracking)
    - Decisions are conclusions/agreements reached in the meeting
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_minutes' AND column_name = 'decisions'
  ) THEN
    ALTER TABLE meeting_minutes ADD COLUMN decisions jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
