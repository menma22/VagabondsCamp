# 話者認識機能のデプロイメント手順

このガイドでは、SpeechBrainを使用した話者認識システムの完全なデプロイメント手順を説明します。

## 📋 前提条件

- Supabaseプロジェクトが作成済み
- Google Cloud Platform（またはRender、Railway）のアカウント
- Docker（ローカルテスト用）

## 🗄️ 1. Supabase Storage バケット作成

### 1.1 Supabase ダッシュボードでStorageを設定

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. プロジェクトを選択
3. 左メニューから「Storage」を選択
4. 「Create a new bucket」をクリック
5. バケット名: `speaker-voices`
6. Public bucket: **チェックを外す**（プライベートに設定）
7. 「Create bucket」をクリック

### 1.2 Storage ポリシー設定

「Policies」タブで以下のポリシーを作成:

**ポリシー1: ユーザーが自分の音声をアップロード**
```sql
CREATE POLICY "Users can upload own speaker voices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'speaker-voices'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**ポリシー2: ユーザーが自分の音声を読み取り**
```sql
CREATE POLICY "Users can read own speaker voices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'speaker-voices'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**ポリシー3: ユーザーが自分の音声を削除**
```sql
CREATE POLICY "Users can delete own speaker voices"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'speaker-voices'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

## 🐍 2. FastAPI + SpeechBrain サーバーのデプロイ

### オプションA: Google Cloud Run にデプロイ（推奨）

#### 2.1 Google Cloud プロジェクトのセットアップ

```bash
# Google Cloud SDKをインストール（まだの場合）
# https://cloud.google.com/sdk/docs/install

# ログイン
gcloud auth login

# プロジェクトを作成または選択
gcloud config set project YOUR_PROJECT_ID

# Container Registry APIを有効化
gcloud services enable containerregistry.googleapis.com
gcloud services enable run.googleapis.com
```

#### 2.2 Dockerイメージのビルドとプッシュ

```bash
cd python-backend

# イメージをビルド
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/speaker-recognition-api

# または、ローカルでビルドしてプッシュ
docker build -t gcr.io/YOUR_PROJECT_ID/speaker-recognition-api .
docker push gcr.io/YOUR_PROJECT_ID/speaker-recognition-api
```

#### 2.3 Cloud Run にデプロイ

```bash
# 強力なAPIキーを生成
API_KEY=$(openssl rand -base64 32)
echo "Save this API key: $API_KEY"

# Cloud Runにデプロイ
gcloud run deploy speaker-recognition-api \
  --image gcr.io/YOUR_PROJECT_ID/speaker-recognition-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars API_KEY=$API_KEY \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10

# デプロイされたURLを取得
gcloud run services describe speaker-recognition-api \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

デプロイが完了すると、URLが表示されます（例: `https://speaker-recognition-api-xxx-uc.a.run.app`）

### オプションB: Render.com にデプロイ

1. [Render Dashboard](https://dashboard.render.com) にログイン
2. 「New +」→「Web Service」を選択
3. GitHubリポジトリを接続
4. 設定:
   - **Name**: `speaker-recognition-api`
   - **Environment**: `Docker`
   - **Region**: 最寄りのリージョン
   - **Branch**: `main`
   - **Dockerfile Path**: `python-backend/Dockerfile`
   - **Instance Type**: `Standard` (2GB RAM推奨)
5. 環境変数を追加:
   - `API_KEY`: 強力なランダム文字列（32文字以上推奨）
6. 「Create Web Service」をクリック

### オプションC: Railway にデプロイ

1. [Railway Dashboard](https://railway.app) にログイン
2. 「New Project」→「Deploy from GitHub repo」
3. リポジトリを選択
4. 「Add variables」で環境変数を設定:
   - `API_KEY`: 強力なランダム文字列
5. Settings → Generate Domain でURLを取得
6. デプロイ

## 🔧 3. Supabase Environment Variables の設定

### 3.1 Supabase ダッシュボードで環境変数を設定

1. Supabase Dashboard → Settings → Edge Functions
2. 環境変数を追加:

```
SPEAKER_API_URL=https://your-api-url.com
SPEAKER_API_KEY=your-generated-api-key
```

**重要**:
- `SPEAKER_API_URL`: 上記でデプロイしたFastAPIのURL（末尾の`/`なし）
- `SPEAKER_API_KEY`: FastAPIデプロイ時に設定したAPI_KEYと同じ値

## ✅ 4. 動作確認

### 4.1 FastAPI サーバーの動作確認

```bash
# Health check
curl https://your-api-url.com/

# 期待されるレスポンス:
# {
#   "status": "online",
#   "service": "SpeechBrain Speaker Recognition API",
#   "model_loaded": true
# }
```

### 4.2 エンドツーエンドテスト

1. アプリケーションにログイン
2. 「話者管理」ボタンをクリック
3. 新しい話者を追加（例: 「山田太郎」）
4. マイクボタンをクリックして3-5秒録音
5. 「音声を登録しました！」メッセージが表示されることを確認

## 🔐 5. セキュリティ設定

### 5.1 API Keyの保護

- API Keyは絶対にGitにコミットしない
- 定期的にAPI Keyをローテーション
- 環境変数で管理（`.env`ファイルは`.gitignore`に追加）

### 5.2 CORS設定

FastAPIサーバーのCORS設定を本番環境に合わせて調整:

```python
# python-backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app-domain.com"],  # 本番環境のドメインのみ許可
    allow_credentials=True,
    allow_methods=["POST", "GET", "DELETE"],
    allow_headers=["*"],
)
```

## 📊 6. モニタリングとログ

### Google Cloud Run の場合

```bash
# ログを確認
gcloud run services logs read speaker-recognition-api \
  --region us-central1 \
  --limit 50
```

### Render / Railway の場合

ダッシュボードの「Logs」タブでリアルタイムログを確認

## 🔄 7. アップデート手順

### コードを更新した場合

```bash
cd python-backend

# イメージを再ビルド
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/speaker-recognition-api

# Cloud Runに再デプロイ（自動的に新しいバージョンが使用されます）
```

## 💰 8. コスト最適化

### Google Cloud Run

- リクエストがない時は課金されない
- 最小インスタンス数: 0（デフォルト）
- 最大インスタンス数: 適切に設定（例: 10）
- タイムアウト: 300秒（音声処理に十分な時間）

### メモリとCPU

- 推奨: 2GB RAM, 2 CPU
- 軽量な処理のみの場合: 1GB RAM, 1 CPU

## ❗ トラブルシューティング

### 問題1: モデルのダウンロードに失敗

**解決策**: メモリを増やす（2GB → 4GB）

```bash
gcloud run services update speaker-recognition-api \
  --memory 4Gi
```

### 問題2: タイムアウトエラー

**解決策**: タイムアウトを延長

```bash
gcloud run services update speaker-recognition-api \
  --timeout 600
```

### 問題3: 認証エラー

**解決策**: API Keyが正しく設定されているか確認

```bash
# Supabase環境変数を確認
supabase secrets list

# 必要に応じて再設定
supabase secrets set SPEAKER_API_KEY=your-key
```

## 📚 参考資料

- [SpeechBrain Documentation](https://speechbrain.github.io/)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## 🎉 完了

これで話者認識機能が完全にデプロイされました！

ユーザーは以下の機能を使用できます:
1. 話者を登録
2. 音声サンプルを録音して登録
3. 会議中に自動的に話者を識別（今後の実装）
