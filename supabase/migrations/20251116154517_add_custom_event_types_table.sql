/*
  # カスタムイベントタイプテーブルの追加

  1. 新しいテーブル
    - `event_types`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - ユーザーID
      - `name` (text) - イベントタイプ名
      - `icon` (text) - アイコン（絵文字）
      - `is_custom` (boolean) - カスタムタイプかどうか
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. セキュリティ
    - RLSを有効化
    - ユーザーは自分のイベントタイプのみアクセス可能
    - デフォルトのイベントタイプを事前に挿入

  3. 重要事項
    - デフォルトのイベントタイプは全ユーザーで共有
    - カスタムイベントタイプは各ユーザー専用
*/

CREATE TABLE IF NOT EXISTS event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT '📝',
  is_custom boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own event types and defaults"
  ON event_types FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert own event types"
  ON event_types FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_custom = true);

CREATE POLICY "Users can update own event types"
  ON event_types FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_custom = true)
  WITH CHECK (user_id = auth.uid() AND is_custom = true);

CREATE POLICY "Users can delete own event types"
  ON event_types FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND is_custom = true);

CREATE INDEX IF NOT EXISTS idx_event_types_user_id ON event_types(user_id);
CREATE INDEX IF NOT EXISTS idx_event_types_is_custom ON event_types(is_custom);

INSERT INTO event_types (user_id, name, icon, is_custom) VALUES
  (NULL, '会議', '💼', false),
  (NULL, 'タスク', '✅', false),
  (NULL, 'イベント', '🎉', false),
  (NULL, '締め切り', '⏰', false),
  (NULL, 'リマインダー', '🔔', false),
  (NULL, 'その他', '📝', false)
ON CONFLICT DO NOTHING;