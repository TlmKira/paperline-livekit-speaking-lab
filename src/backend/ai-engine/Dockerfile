FROM python:3.10-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models/huggingface \
    TRANSFORMERS_CACHE=/models/huggingface

RUN apt-get -o Acquire::Retries=5 update && \
    apt-get -o Acquire::Retries=5 install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    espeak-ng \
    libsndfile1 \
    git \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN pip install --retries 10 --timeout 120 --upgrade pip setuptools wheel && \
    pip install --retries 10 --timeout 120 -r requirements.txt

COPY main.py phoneme_scorer.py reference_tts.py speech_transcriber.py ./

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser && \
    mkdir -p /models/huggingface && \
    chown -R appuser:appgroup /app /models

USER appuser

EXPOSE 8000

CMD ["python", "main.py"]
