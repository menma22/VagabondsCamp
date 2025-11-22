/*
  # Add decisions and shared_information columns to meetings table

  1. Changes
    - Add `decisions` column to `meetings` table
      - Type: jsonb (array of decision items)
      - Default: empty array '[]'
      - Stores meeting decisions and conclusions
    
    - Add `shared_information` column to `meetings` table
      - Type: jsonb (array of information items)
      - Default: empty array '[]'
      - Stores important information shared during meetings
  
  2. Notes
    - These columns were previously added to meeting_minutes table by mistake
    - The application uses the meetings table for storing meeting data
    - Each item contains: id, text, and optional metadata
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'decisions'
  ) THEN
    ALTER TABLE meetings 
    ADD COLUMN decisions jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'shared_information'
  ) THEN
    ALTER TABLE meetings 
    ADD COLUMN shared_information jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
