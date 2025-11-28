/*
  # 音声データ保存と文字起こしステータス管理の追加

  1. 変更内容
    - `meetings`テーブルに音声関連のカラムを追加：
      - `audio_url` (text, nullable): 音声ファイルのSupabase Storageパス
      - `audio_size` (bigint, nullable): ファイルサイズ（バイト）
      - `transcription_status` (text, default 'completed'): 処理状態
      - `transcription_error` (text, nullable): エラーメッセージ

  2. 既存データへの影響
    - 既存の会議レコードは影響を受けません
    - audio_url と audio_size は NULL
    - transcription_status は 'completed' にデフォルト設定
    - transcription_error は NULL
*/

-- meetingsテーブルに音声関連カラムを追加
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_size bigint,
  ADD COLUMN IF NOT EXISTS transcription_status text DEFAULT 'completed' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS transcription_error text;

-- インデックスを追加（ステータスでフィルタリングする際のパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_meetings_transcription_status ON meetings(transcription_status);

-- コメントを追加
COMMENT ON COLUMN meetings.audio_url IS '音声ファイルのSupabase Storageパス（例: {userId}/{meetingId}_{timestamp}.webm）';
COMMENT ON COLUMN meetings.audio_size IS '音声ファイルのサイズ（バイト）';
COMMENT ON COLUMN meetings.transcription_status IS '文字起こしの処理状態: pending, processing, completed, failed';
COMMENT ON COLUMN meetings.transcription_error IS '文字起こし失敗時のエラーメッセージ';
