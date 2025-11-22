/*
  # Add RLS Policies to meeting_minutes Table

  1. Security
    - The meeting_minutes table has RLS enabled but no policies
    - Add a user_id column to track ownership
    - Create comprehensive RLS policies for authenticated users
    - Ensure users can only access their own meeting minutes

  2. Changes
    - Add user_id column with foreign key to auth.users
    - Create SELECT, INSERT, UPDATE, DELETE policies
    - Add index for performance
*/

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_minutes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE meeting_minutes ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create RLS policies for meeting_minutes
CREATE POLICY "Users can view own meeting minutes"
  ON meeting_minutes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meeting minutes"
  ON meeting_minutes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meeting minutes"
  ON meeting_minutes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meeting minutes"
  ON meeting_minutes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_user_id ON meeting_minutes(user_id);
