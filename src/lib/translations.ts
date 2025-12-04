export const translations = {
    ja: {
        common: {
            cancel: 'キャンセル',
            save: '設定を保存',
            saving: '保存中...',
            back: '戻る',
            download: 'ダウンロード',
            retry: '再試行',
            processing: '処理中...',
            loading: '読み込み中...',
            delete: '削除',
            edit: '編集',
            create: '作成',
            close: '閉じる',
            confirm: '確認',
            yes: 'はい',
            no: 'いいえ',
        },
        settings: {
            title: 'API設定',
            apiKeyLabel: 'Gemini APIキー',
            apiKeyPlaceholder: 'AIza...',
            getKeyLink: 'Google AI Studioからキーを取得',
            saveSuccess: '設定を保存しました！',
            saveError: '設定の保存に失敗しました',
            language: '言語設定',
            languageLabel: '表示言語',
        },
        meeting: {
            titlePlaceholder: '会議のタイトル',
            audioData: '音声データ',
            transcriptionCompleted: '文字起こし完了',
            transcriptionFailed: '文字起こし失敗',
            part: 'パート',
            total: '合計',
            referenceUrls: '参考URL',
            urlTitlePlaceholder: 'タイトル（任意）',
            decisions: '決定事項',
            todos: 'TODOリスト',
            sharedInfo: '重要な情報共有',
            aiChat: 'AIチャット',
            askAi: '会議の内容について質問する...',
            recording: '録音中',
            stopRecording: '録音停止',
            startRecording: '録音開始',
        },
        home: {
            newMeeting: '新しい会議',
            createMeetingError: '会議の作成に失敗しました',
            deleteMeetingConfirm: 'この会議を削除しますか？',
            deleteMeetingError: '会議の削除に失敗しました',
            autoStopMessage: '10分間音声が検出されなかったため、録音を自動停止しました。',
            startRecordingError: '録音の開始に失敗しました',
            stopRecordingError: '録音の停止に失敗しました',
            projectCreateError: 'プロジェクトの作成に失敗しました',
            projectDeleteConfirm: 'このプロジェクトを削除しますか？プロジェクト内の会議は残りますが、プロジェクトとの関連付けが解除されます。',
            projectDeleteError: 'プロジェクトの削除に失敗しました',
            projectUpdateError: 'プロジェクト名の変更に失敗しました',
            noAudio: '音声データが見つかりません。',
            downloadingAudio: '音声ファイルをダウンロード中...',
            downloadAudioError: '音声ファイルのダウンロードに失敗しました',
            retryError: '再試行に失敗しました。',
        },
        errors: {
            apiKeyRequired: 'Gemini APIキーを設定してください',
            apiKeyMissing: 'Gemini APIキーが設定されていません。設定画面からAPIキーを登録してください。',
            recordingEmpty: '録音データが空です。マイクの権限を確認してください。',
            segmentTooLarge: 'セグメント{index}のサイズが大きすぎます（{size} MB）。',
            uploadFailed: 'セグメント{index}のファイルアップロードに失敗しました: {error}',
            transcriptionFailed: 'セグメント{index}の文字起こしに失敗しました: {error}',
            uploadSegmentFailed: '音声セグメント{index}のアップロードに失敗しました: {error}',
            updateMeetingFailed: '会議レコードの更新に失敗しました: {error}',
            transcriptionEmpty: '文字起こし結果が空です。音声が録音されていない可能性があります。',
            minutesGenerationFailed: '議事録の生成に失敗しました',
            processingFailed: '録音の処理に失敗しました。APIキーを確認してください。',
            rateLimit: 'レート制限に達しました。数分待ってから再度お試しください。',
            apiOverloaded: 'Gemini APIが現在過負荷状態です（503エラー）。数分待ってから再度お試しください。',
        },
        prompts: {
            transcription: 'この音声ファイルを日本語で文字起こししてください。話された内容をそのまま正確にテキスト化してください。',
            minutes: `あなたはプロフェッショナルな議事録作成アシスタントです。以下の音声文字起こしデータを、読みやすく構造化された議事録に変換してください。

## 重要な指示

### 文章整形ルール（必須）：
1. **話し言葉を書き言葉に変換**
   - 「はい」「うん」「ええ」などの相槌は削除
   - 「〜じゃん」→「〜です」
   - 「〜かも」→「〜の可能性があります」
   - 「〜って感じ」→「〜という状況です」
   - 文末は「です・ます」調で統一

2. **冗長表現の整理**
   - 重複する内容は統合
   - 「あの」「えっと」などのフィラーは削除
   - 不完全な文は完全な文に整形

3. **内容の構造化**
   - 関連する話題をまとめる
   - 時系列や論理的な順序で整理
   - 重要度に応じて見出しを付ける

### 出力フォーマット：

マークダウン形式で以下の構造に従ってください：

## 目次
- [概要](#概要)
- [議論された主要テーマ1](#議論された主要テーマ1)
- [議論された主要テーマ2](#議論された主要テーマ2)
（必要に応じて追加）

## 概要
会議全体の要約を3-5文で記載

## 議論された主要テーマ1
整形された内容（話し言葉を書き言葉に変換済み）

## 議論された主要テーマ2
整形された内容（話し言葉を書き言葉に変換済み）

### 注意事項：
- すべての会話内容を漏らさず、**整形して**記載
- 見出しは必ず ## （h2）を使用
- 目次のリンクは見出しIDと一致させる
- 相槌や無意味な繰り返しは除外
- 文章は簡潔で読みやすく

---

次に、以下の3つの情報をJSON形式で抽出してください：

1. **決定事項**：会議で決まったこと、合意された事項、結論
2. **TODOリスト**：今後やるべきタスク、アクションアイテム、担当者が決まっている作業
3. **重要な情報共有**：新しい知識、事実、問題点、課題、参考情報（TODOと重複しないこと）

議事録の後に、以下のフォーマットで出力してください：

---DECISIONS---
["決定事項1", "決定事項2", "決定事項3"]
---END_DECISIONS---

---TODO_LIST---
["タスク1", "タスク2", "タスク3"]
---END_TODO_LIST---

---SHARED_INFO---
["情報1", "情報2", "情報3"]
---END_SHARED_INFO---

注意：重要な情報共有にはTODOと同じ内容を含めないこと。該当項目がない場合は空配列 [] を返すこと。

---

文字起こしデータ：

{transcript}`,
        },
        auth: {
            title: '会議議事録',
            createAccount: 'アカウントを作成',
            loginToContinue: 'ログインして続ける',
            email: 'メールアドレス',
            password: 'パスワード',
            login: 'ログイン',
            signup: '新規登録',
            loading: 'お待ちください...',
            haveAccount: 'アカウントをお持ちの方はこちら',
            noAccount: 'アカウントをお持ちでない方はこちら',
            error: '予期しないエラーが発生しました',
            emailPlaceholder: 'you@example.com',
            passwordPlaceholder: '••••••••',
        },
        calendar: {
            today: '今日',
            month: '月',
            day: '日',
            year: '年',
            meetingLog: '会議ログ',
            schedule: '予定',
        },
        speaker: {
            title: '話者管理',
            addSpeaker: '新しい話者を追加',
            speakerName: '話者名（例：山田太郎）',
            color: 'カラー',
            registeredSpeakers: '登録済み話者',
            noSpeakers: 'まだ話者が登録されていません',
            usage: '使い方',
            usageDesc: '話者を追加後、マイクボタンで3〜5秒程度の音声サンプルを録音してください。録音された音声は話者認識に使用されます。',
            registerVoice: '音声を登録',
            delete: '削除',
            recording: '音声を登録中...',
            registered: '音声を登録しました！',
            registerError: '音声登録に失敗しました',
            loadError: '話者の読み込みに失敗しました',
            addError: '話者の追加に失敗しました',
            deleteError: '話者の削除に失敗しました',
            deleteConfirm: 'この話者を削除しますか？',
            micError: 'マイクへのアクセスに失敗しました',
            added: '話者を追加しました',
            deleted: '話者を削除しました',
        },
        sharedInfo: {
            topic: 'Topic',
            title: '会議で共有された情報',
            placeholder: '情報を追加...',
            noInfo: 'まだ情報共有がありません',
            autoExtract: '文字起こし完了後、AIが自動で抽出します',
        },
        monthView: {
            items: '件',
            weekDays: ['日', '月', '火', '水', '木', '金', '土'],
        },
        transcriptionStatus: {
            completedTitle: '✅ 文字起こし完了',
            completedMessage: '音声データは正常に処理されました',
            failedTitle: '❌ 文字起こし失敗',
            failedMessage: '不明なエラーが発生しました',
            processingTitle: '🔵 処理中...',
            processingMessage: '音声データを文字起こし中です',
            pendingTitle: '⏳ 保留中',
            pendingMessage: '処理待機中です',
            fileSize: 'ファイルサイズ',
            retry: '再試行',
            download: '音声をダウンロード',
        },
    },
    en: {
        common: {
            cancel: 'Cancel',
            save: 'Save Settings',
            saving: 'Saving...',
            back: 'Back',
            download: 'Download',
            retry: 'Retry',
            processing: 'Processing...',
            loading: 'Loading...',
            delete: 'Delete',
            edit: 'Edit',
            create: 'Create',
            close: 'Close',
            confirm: 'Confirm',
            yes: 'Yes',
            no: 'No',
        },
        settings: {
            title: 'API Settings',
            apiKeyLabel: 'Gemini API Key',
            apiKeyPlaceholder: 'AIza...',
            getKeyLink: 'Get key from Google AI Studio',
            saveSuccess: 'Settings saved!',
            saveError: 'Failed to save settings',
            language: 'Language',
            languageLabel: 'Display Language',
        },
        meeting: {
            titlePlaceholder: 'Meeting Title',
            audioData: 'Audio Data',
            transcriptionCompleted: 'Transcription completed',
            transcriptionFailed: 'Transcription failed',
            part: 'Part',
            total: 'Total',
            referenceUrls: 'Reference URLs',
            urlTitlePlaceholder: 'Title (Optional)',
            decisions: 'Decisions',
            todos: 'Action Items',
            sharedInfo: 'Shared Information',
            aiChat: 'AI Chat',
            askAi: 'Ask about the meeting...',
            recording: 'Recording',
            stopRecording: 'Stop Recording',
            startRecording: 'Start Recording',
        },
        home: {
            newMeeting: 'New Meeting',
            createMeetingError: 'Failed to create meeting',
            deleteMeetingConfirm: 'Are you sure you want to delete this meeting?',
            deleteMeetingError: 'Failed to delete meeting',
            autoStopMessage: 'Recording automatically stopped after 10 minutes of silence.',
            startRecordingError: 'Failed to start recording',
            stopRecordingError: 'Failed to stop recording',
            projectCreateError: 'Failed to create project',
            projectDeleteConfirm: 'Are you sure you want to delete this project? Meetings will remain but will be unlinked.',
            projectDeleteError: 'Failed to delete project',
            projectUpdateError: 'Failed to update project name',
            noAudio: 'Audio data not found.',
            downloadingAudio: 'Downloading audio files...',
            downloadAudioError: 'Failed to download audio files',
            retryError: 'Failed to retry.',
        },
        errors: {
            apiKeyRequired: 'Please set Gemini API Key',
            apiKeyMissing: 'Gemini API Key is not set. Please register it in Settings.',
            recordingEmpty: 'Recording data is empty. Please check microphone permissions.',
            segmentTooLarge: 'Segment {index} size is too large ({size} MB).',
            uploadFailed: 'Failed to upload segment {index}: {error}',
            transcriptionFailed: 'Failed to transcribe segment {index}: {error}',
            uploadSegmentFailed: 'Failed to upload audio segment {index}: {error}',
            updateMeetingFailed: 'Failed to update meeting record: {error}',
            transcriptionEmpty: 'Transcription result is empty. Audio might be silent.',
            minutesGenerationFailed: 'Failed to generate minutes',
            processingFailed: 'Failed to process recording. Please check API Key.',
            rateLimit: 'Rate limit reached. Please wait a few minutes and try again.',
            apiOverloaded: 'Gemini API is currently overloaded (503). Please wait a few minutes and try again.',
        },
        prompts: {
            transcription: 'Please transcribe this audio file in English. Transcribe the spoken content exactly as it is.',
            minutes: `You are a professional meeting minutes assistant. Please convert the following audio transcription into readable and structured meeting minutes.

## Important Instructions

### Text Formatting Rules (Mandatory):
1. **Convert spoken language to written language**
   - Remove filler words like "um", "uh", "you know"
   - Fix incomplete sentences
   - Use professional tone

2. **Organize Redundancy**
   - Merge duplicate content
   - Remove meaningless repetitions

3. **Structure Content**
   - Group related topics
   - Organize chronologically or logically
   - Use headings based on importance

### Output Format:

Follow this Markdown structure:

## Table of Contents
- [Summary](#summary)
- [Main Topic 1](#main-topic-1)
- [Main Topic 2](#main-topic-2)
(Add as needed)

## Summary
Summarize the entire meeting in 3-5 sentences.

## Main Topic 1
Formatted content (spoken language converted to written)

## Main Topic 2
Formatted content (spoken language converted to written)

### Notes:
- Include all conversation content, **formatted**
- Always use ## (h2) for headings
- Table of Contents links must match heading IDs
- Keep sentences concise and readable

---

Next, extract the following 3 pieces of information in JSON format:

1. **Decisions**: Things decided, agreed upon, conclusions
2. **Action Items**: Tasks to be done, action items, assigned work
3. **Shared Information**: New knowledge, facts, problems, issues, reference info (do not duplicate Action Items)

Output in the following format after the minutes:

---DECISIONS---
["Decision 1", "Decision 2", "Decision 3"]
---END_DECISIONS---

---TODO_LIST---
["Task 1", "Task 2", "Task 3"]
---END_TODO_LIST---

---SHARED_INFO---
["Info 1", "Info 2", "Info 3"]
---END_SHARED_INFO---

Note: Do not include the same content in Shared Information as in Action Items. Return empty array [] if no items.

---

Transcription Data:

{transcript}`,
        },
        auth: {
            title: 'Meeting Minutes',
            createAccount: 'Create Account',
            loginToContinue: 'Log in to continue',
            email: 'Email Address',
            password: 'Password',
            login: 'Log In',
            signup: 'Sign Up',
            loading: 'Please wait...',
            haveAccount: 'Already have an account?',
            noAccount: 'Don\'t have an account?',
            error: 'An unexpected error occurred',
            emailPlaceholder: 'you@example.com',
            passwordPlaceholder: '••••••••',
        },
        calendar: {
            today: 'Today',
            month: 'Month',
            day: 'Day',
            year: '',
            meetingLog: 'Meeting Log',
            schedule: 'Schedule',
        },
        speaker: {
            title: 'Speaker Management',
            addSpeaker: 'Add New Speaker',
            speakerName: 'Speaker Name (e.g. John Doe)',
            color: 'Color',
            registeredSpeakers: 'Registered Speakers',
            noSpeakers: 'No speakers registered yet',
            usage: 'Usage',
            usageDesc: 'After adding a speaker, record a 3-5 second voice sample using the mic button. This will be used for speaker recognition.',
            registerVoice: 'Register Voice',
            delete: 'Delete',
            recording: 'Recording voice...',
            registered: 'Voice registered!',
            registerError: 'Failed to register voice',
            loadError: 'Failed to load speakers',
            addError: 'Failed to add speaker',
            deleteError: 'Failed to delete speaker',
            deleteConfirm: 'Are you sure you want to delete this speaker?',
            micError: 'Failed to access microphone',
            added: 'Speaker added',
            deleted: 'Speaker deleted',
        },
        sharedInfo: {
            topic: 'Topic',
            title: 'Shared Information',
            placeholder: 'Add info...',
            noInfo: 'No shared information yet',
            autoExtract: 'AI will automatically extract this after transcription',
        },
        monthView: {
            items: ' items',
            weekDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        },
        transcriptionStatus: {
            completedTitle: '✅ Transcription Completed',
            completedMessage: 'Audio data processed successfully',
            failedTitle: '❌ Transcription Failed',
            failedMessage: 'Unknown error occurred',
            processingTitle: '🔵 Processing...',
            processingMessage: 'Transcribing audio data...',
            pendingTitle: '⏳ Pending',
            pendingMessage: 'Waiting for processing',
            fileSize: 'File Size',
            retry: 'Retry',
            download: 'Download Audio',
        },
    }
};

export type Language = 'ja' | 'en';
export type TranslationKey = keyof typeof translations.ja;
