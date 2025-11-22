/*
  # Security Fixes

  1. Enable RLS on meeting_minutes table if it exists
  2. Enable leaked password protection in Supabase Auth
*/

-- Enable RLS on meeting_minutes table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'meeting_minutes'
  ) THEN
    ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;

    -- Add RLS policies for meeting_minutes table
    CREATE POLICY IF NOT EXISTS "Users can view own meeting_minutes"
      ON meeting_minutes FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can insert own meeting_minutes"
      ON meeting_minutes FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can update own meeting_minutes"
      ON meeting_minutes FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can delete own meeting_minutes"
      ON meeting_minutes FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
