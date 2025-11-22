/*
  # Add meeting_date column to meetings table

  1. Changes
    - Add `meeting_date` column to `meetings` table
      - Type: date
      - Default: current date
      - Used for calendar filtering and organization
    - Add index on meeting_date for efficient querying

  2. Security
    - No RLS changes needed (existing policies still apply)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'meeting_date'
  ) THEN
    ALTER TABLE meetings ADD COLUMN meeting_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meetings_meeting_date ON meetings(meeting_date DESC);