"""
FastAPI + SpeechBrain Speaker Recognition API

This API provides endpoints for:
1. Speaker registration (voice embedding extraction and storage)
2. Speaker identification (matching audio against registered speakers)
3. Speaker diarization (separating multiple speakers in audio)
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
import torchaudio
import numpy as np
from speechbrain.pretrained import SpeakerRecognition, EncoderClassifier
import os
import json
import tempfile
import shutil
from pathlib import Path
from typing import Optional
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SpeechBrain Speaker Recognition API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security: API Key validation
API_KEY = os.getenv("API_KEY", "your-secret-api-key")

# Model initialization
MODEL_PATH = "pretrained_models/spkrec-ecapa-voxceleb"
EMBEDDINGS_DIR = Path("embeddings")
EMBEDDINGS_DIR.mkdir(exist_ok=True)

# Load SpeechBrain model
try:
    speaker_model = EncoderClassifier.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        savedir=MODEL_PATH
    )
    logger.info("SpeechBrain model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load SpeechBrain model: {e}")
    speaker_model = None


def verify_api_key(x_api_key: str = Header(...)):
    """Verify API key from request header"""
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


def extract_embedding(audio_path: str):
    """Extract speaker embedding from audio file"""
    try:
        # Load audio
        signal, sr = torchaudio.load(audio_path)

        # Resample if necessary (SpeechBrain expects 16kHz)
        if sr != 16000:
            resampler = torchaudio.transforms.Resample(sr, 16000)
            signal = resampler(signal)

        # Extract embedding
        with torch.no_grad():
            embedding = speaker_model.encode_batch(signal)

        return embedding.squeeze().cpu().numpy()
    except Exception as e:
        logger.error(f"Error extracting embedding: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract embedding: {str(e)}")


def cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    """Calculate cosine similarity between two embeddings"""
    return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "SpeechBrain Speaker Recognition API",
        "model_loaded": speaker_model is not None
    }


@app.post("/api/register-speaker")
async def register_speaker(
    speaker_id: str,
    audio: UploadFile = File(...),
    api_key: str = Header(..., alias="X-API-Key")
):
    """
    Register a new speaker by extracting and saving their voice embedding

    Args:
        speaker_id: Unique identifier for the speaker
        audio: Audio file containing the speaker's voice (WAV format recommended)
        api_key: API key for authentication

    Returns:
        JSON with speaker_id and embedding info
    """
    verify_api_key(api_key)

    if not speaker_model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
        shutil.copyfileobj(audio.file, tmp_file)
        tmp_path = tmp_file.name

    try:
        # Extract embedding
        embedding = extract_embedding(tmp_path)

        # Save embedding
        embedding_file = EMBEDDINGS_DIR / f"{speaker_id}.npy"
        np.save(embedding_file, embedding)

        logger.info(f"Registered speaker: {speaker_id}")

        return {
            "success": True,
            "speaker_id": speaker_id,
            "embedding_shape": embedding.shape,
            "message": "Speaker registered successfully"
        }
    except Exception as e:
        logger.error(f"Error registering speaker: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/api/identify-speaker")
async def identify_speaker(
    audio: UploadFile = File(...),
    threshold: float = 0.5,
    api_key: str = Header(..., alias="X-API-Key")
):
    """
    Identify a speaker by comparing audio against all registered speakers

    Args:
        audio: Audio file to identify
        threshold: Similarity threshold (0-1, default 0.5)
        api_key: API key for authentication

    Returns:
        JSON with matched speaker_id and similarity score
    """
    verify_api_key(api_key)

    if not speaker_model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
        shutil.copyfileobj(audio.file, tmp_file)
        tmp_path = tmp_file.name

    try:
        # Extract embedding from input audio
        input_embedding = extract_embedding(tmp_path)

        # Compare with all registered speakers
        best_match = None
        best_score = 0.0
        all_scores = {}

        for embedding_file in EMBEDDINGS_DIR.glob("*.npy"):
            speaker_id = embedding_file.stem
            registered_embedding = np.load(embedding_file)

            score = cosine_similarity(input_embedding, registered_embedding)
            all_scores[speaker_id] = float(score)

            if score > best_score:
                best_score = score
                best_match = speaker_id

        # Check if best match exceeds threshold
        identified = best_score >= threshold

        result = {
            "identified": identified,
            "speaker_id": best_match if identified else None,
            "confidence": best_score,
            "threshold": threshold,
            "all_scores": all_scores
        }

        logger.info(f"Identification result: {result}")
        return result

    except Exception as e:
        logger.error(f"Error identifying speaker: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/api/verify-speaker")
async def verify_speaker(
    speaker_id: str,
    audio: UploadFile = File(...),
    threshold: float = 0.5,
    api_key: str = Header(..., alias="X-API-Key")
):
    """
    Verify if audio matches a specific registered speaker

    Args:
        speaker_id: The speaker to verify against
        audio: Audio file to verify
        threshold: Similarity threshold (0-1, default 0.5)
        api_key: API key for authentication

    Returns:
        JSON with verification result and similarity score
    """
    verify_api_key(api_key)

    if not speaker_model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Check if speaker exists
    embedding_file = EMBEDDINGS_DIR / f"{speaker_id}.npy"
    if not embedding_file.exists():
        raise HTTPException(status_code=404, detail=f"Speaker {speaker_id} not found")

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
        shutil.copyfileobj(audio.file, tmp_file)
        tmp_path = tmp_file.name

    try:
        # Extract embedding from input audio
        input_embedding = extract_embedding(tmp_path)

        # Load registered embedding
        registered_embedding = np.load(embedding_file)

        # Calculate similarity
        score = cosine_similarity(input_embedding, registered_embedding)
        verified = score >= threshold

        result = {
            "verified": verified,
            "speaker_id": speaker_id,
            "similarity_score": float(score),
            "threshold": threshold
        }

        logger.info(f"Verification result: {result}")
        return result

    except Exception as e:
        logger.error(f"Error verifying speaker: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.delete("/api/delete-speaker/{speaker_id}")
async def delete_speaker(
    speaker_id: str,
    api_key: str = Header(..., alias="X-API-Key")
):
    """
    Delete a registered speaker's embedding

    Args:
        speaker_id: The speaker to delete
        api_key: API key for authentication

    Returns:
        JSON with deletion result
    """
    verify_api_key(api_key)

    embedding_file = EMBEDDINGS_DIR / f"{speaker_id}.npy"

    if not embedding_file.exists():
        raise HTTPException(status_code=404, detail=f"Speaker {speaker_id} not found")

    try:
        os.remove(embedding_file)
        logger.info(f"Deleted speaker: {speaker_id}")
        return {
            "success": True,
            "speaker_id": speaker_id,
            "message": "Speaker deleted successfully"
        }
    except Exception as e:
        logger.error(f"Error deleting speaker: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/list-speakers")
async def list_speakers(api_key: str = Header(..., alias="X-API-Key")):
    """
    List all registered speakers

    Args:
        api_key: API key for authentication

    Returns:
        JSON with list of speaker IDs
    """
    verify_api_key(api_key)

    speakers = [f.stem for f in EMBEDDINGS_DIR.glob("*.npy")]

    return {
        "speakers": speakers,
        "count": len(speakers)
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
