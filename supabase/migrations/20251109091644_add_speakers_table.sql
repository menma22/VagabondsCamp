/*
  # Add Speakers Table

  1. New Tables
    - `speakers`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Speaker name
      - `color` (text) - Color for UI display
      - `voice_embedding` (text, nullable) - For future SpeechBrain integration
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `meeting_speakers`
      - `id` (uuid, primary key)
      - `meeting_id` (uuid, foreign key to meetings)
      - `speaker_id` (uuid, foreign key to speakers)
      - `segments` (jsonb) - Array of {start_time, end_time, text} segments
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own speakers
    - Add policies for meeting speakers based on meeting ownership
*/

-- Create speakers table
CREATE TABLE IF NOT EXISTS speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#64748b',
  voice_embedding text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create meeting_speakers table
CREATE TABLE IF NOT EXISTS meeting_speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  speaker_id uuid REFERENCES speakers(id) ON DELETE CASCADE NOT NULL,
  segments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_speakers ENABLE ROW LEVEL SECURITY;

-- Speakers policies
CREATE POLICY "Users can view own speakers"
  ON speakers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own speakers"
  ON speakers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own speakers"
  ON speakers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own speakers"
  ON speakers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Meeting speakers policies
CREATE POLICY "Users can view meeting speakers for own meetings"
  ON meeting_speakers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_speakers.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert meeting speakers for own meetings"
  ON meeting_speakers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_speakers.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update meeting speakers for own meetings"
  ON meeting_speakers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_speakers.meeting_id
      AND meetings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_speakers.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete meeting speakers for own meetings"
  ON meeting_speakers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_speakers.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_speakers_user_id ON speakers(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_speakers_meeting_id ON meeting_speakers(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_speakers_speaker_id ON meeting_speakers(speaker_id);