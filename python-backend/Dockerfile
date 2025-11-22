FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    sox \
    libsox-fmt-all \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Create directories
RUN mkdir -p embeddings pretrained_models

# Expose port
EXPOSE 8000

# Set environment variables
ENV PORT=8000
ENV API_KEY=your-secret-api-key

# Run the application
CMD ["python", "main.py"]
