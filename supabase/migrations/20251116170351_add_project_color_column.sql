/*
  # Add color column to projects table

  1. Changes
    - Add `color` column to `projects` table with default value
    - Color will be stored as a hex color code string (e.g., '#FF5733')
    
  2. Notes
    - Default color is set to blue (#3B82F6)
    - Existing projects will automatically get the default color
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'color'
  ) THEN
    ALTER TABLE projects ADD COLUMN color text DEFAULT '#3B82F6' NOT NULL;
  END IF;
END $$;