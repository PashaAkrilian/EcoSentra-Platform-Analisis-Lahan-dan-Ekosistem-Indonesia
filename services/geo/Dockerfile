FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/

# Railway inject $PORT secara dinamis; Hugging Face Spaces (Docker SDK)
# memakai port 7860 secara default -> fallback ke 7860 kalau $PORT kosong.
ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
