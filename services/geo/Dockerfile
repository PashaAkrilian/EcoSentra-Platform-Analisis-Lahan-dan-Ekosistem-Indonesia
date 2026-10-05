FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/

# Jalankan sebagai user biasa, bukan root.
RUN useradd --create-home --uid 10001 appuser
USER appuser

# Railway inject $PORT secara dinamis; Hugging Face Spaces (Docker SDK)
# memakai port 7860 secara default -> fallback ke 7860 kalau $PORT kosong.
ENV PORT=7860
EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"7860\")}/health', timeout=4)"

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
