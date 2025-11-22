# SpeechBrain Speaker Recognition API

FastAPI server for speaker recognition using SpeechBrain ECAPA-TDNN model.

## Features

- **Speaker Registration**: Extract and store voice embeddings
- **Speaker Identification**: Match audio against all registered speakers
- **Speaker Verification**: Verify if audio matches a specific speaker
- **Speaker Management**: List and delete registered speakers

## Local Development

### Prerequisites

- Python 3.10+
- FFmpeg
- SoX

### Installation

```bash
cd python-backend
pip install -r requirements.txt
```

### Run Locally

```bash
export API_KEY=your-secret-api-key
python main.py
```

Server will start at `http://localhost:8000`

## Docker Deployment

### Build Image

```bash
docker build -t speaker-recognition-api .
```

### Run Container

```bash
docker run -p 8000:8000 \
  -e API_KEY=your-secret-api-key \
  -v $(pwd)/embeddings:/app/embeddings \
  speaker-recognition-api
```

## Cloud Deployment

### Deploy to Google Cloud Run

1. Build and push to Google Container Registry:

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/speaker-recognition-api
```

2. Deploy to Cloud Run:

```bash
gcloud run deploy speaker-recognition-api \
  --image gcr.io/YOUR_PROJECT_ID/speaker-recognition-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars API_KEY=your-secret-api-key \
  --memory 2Gi \
  --cpu 2
```

### Deploy to Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Select Docker as the environment
4. Set environment variable: `API_KEY=your-secret-api-key`
5. Deploy

### Deploy to Railway

1. Connect your GitHub repository to Railway
2. Create a new project from the repository
3. Set environment variable: `API_KEY=your-secret-api-key`
4. Deploy

## API Endpoints

### Health Check

```bash
GET /
```

### Register Speaker

```bash
POST /api/register-speaker
Headers:
  X-API-Key: your-secret-api-key
Body (multipart/form-data):
  speaker_id: unique_speaker_id
  audio: audio_file.wav
```

### Identify Speaker

```bash
POST /api/identify-speaker
Headers:
  X-API-Key: your-secret-api-key
Body (multipart/form-data):
  audio: audio_file.wav
  threshold: 0.5 (optional)
```

### Verify Speaker

```bash
POST /api/verify-speaker
Headers:
  X-API-Key: your-secret-api-key
Body (multipart/form-data):
  speaker_id: unique_speaker_id
  audio: audio_file.wav
  threshold: 0.5 (optional)
```

### List Speakers

```bash
GET /api/list-speakers
Headers:
  X-API-Key: your-secret-api-key
```

### Delete Speaker

```bash
DELETE /api/delete-speaker/{speaker_id}
Headers:
  X-API-Key: your-secret-api-key
```

## Environment Variables

- `API_KEY`: Secret key for API authentication (required)
- `PORT`: Server port (default: 8000)

## Security Notes

1. Always use HTTPS in production
2. Keep your API_KEY secret
3. Store embeddings in a persistent volume
4. Consider adding rate limiting for production use
5. Implement user authentication for multi-tenant scenarios

## Model Information

This API uses SpeechBrain's ECAPA-TDNN model trained on VoxCeleb:
- Model: `speechbrain/spkrec-ecapa-voxceleb`
- Paper: https://arxiv.org/abs/2005.07143
- License: Apache 2.0
