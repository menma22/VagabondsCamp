/*
  # イベントタイプ列の型修正

  1. 変更内容
    - `calendar_events.event_type`列の型を`text`から`uuid`に変更
    - `event_types`テーブルへの外部キー制約を追加

  2. 重要事項
    - 既存データは一旦削除（テスト段階のため）
    - 本番環境では、既存データを移行する必要がある
*/

-- 既存のevent_type列を削除して再作成
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE calendar_events DROP COLUMN event_type;
  END IF;
END $$;

-- uuid型でevent_type列を追加
ALTER TABLE calendar_events 
ADD COLUMN event_type uuid REFERENCES event_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);