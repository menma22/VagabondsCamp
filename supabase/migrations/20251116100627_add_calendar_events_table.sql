/*
  # カレンダー予定機能の追加

  ## 新しいテーブル
    - `calendar_events` - カレンダーの予定を管理
      - `id` (uuid, primary key) - イベントID
      - `user_id` (uuid, foreign key) - ユーザーID
      - `title` (text) - 予定のタイトル
      - `description` (text, nullable) - 予定の詳細説明
      - `event_date` (date) - 予定の日付
      - `start_time` (time, nullable) - 開始時刻
      - `end_time` (time, nullable) - 終了時刻
      - `color` (text) - カラーコード（色分け用）
      - `event_type` (text) - イベントタイプ（会議、タスク、イベント等）
      - `created_at` (timestamptz) - 作成日時
      - `updated_at` (timestamptz) - 更新日時

  ## セキュリティ
    - RLSを有効化
    - ユーザーは自分の予定のみ閲覧・作成・更新・削除可能
*/

-- calendar_eventsテーブルの作成
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  event_date date NOT NULL,
  start_time time,
  end_time time,
  color text NOT NULL DEFAULT '#3b82f6',
  event_type text NOT NULL DEFAULT 'event',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLSを有効化
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の予定を閲覧可能
CREATE POLICY "Users can view own events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ユーザーは自分の予定を作成可能
CREATE POLICY "Users can create own events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の予定を更新可能
CREATE POLICY "Users can update own events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の予定を削除可能
CREATE POLICY "Users can delete own events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date 
  ON calendar_events(user_id, event_date);
