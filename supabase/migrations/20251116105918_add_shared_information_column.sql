/*
  # Add shared_information column to meeting_minutes

  1. Changes
    - Add `shared_information` column to `meeting_minutes` table
      - Type: jsonb (array of information items)
      - Default: empty array '[]'
      - Allows storing important information shared during meetings
  
  2. Notes
    - Each information item contains:
      - id: unique identifier
      - text: the shared information content
      - category: optional category/type of information
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_minutes' AND column_name = 'shared_information'
  ) THEN
    ALTER TABLE meeting_minutes 
    ADD COLUMN shared_information jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
