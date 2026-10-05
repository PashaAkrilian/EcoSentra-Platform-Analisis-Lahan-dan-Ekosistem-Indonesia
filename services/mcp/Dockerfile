FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .
COPY tools/ tools/

# Jalankan sebagai user biasa, bukan root.
RUN useradd --create-home --uid 10001 appuser
USER appuser

# MCP pakai stdio transport (bukan HTTP) -> container ini harus dijalankan
# interaktif (docker run -i ...) supaya stdin/stdout host tersambung ke
# proses MCP di dalam container. ECOSENTRA_API_URL di-set lewat -e saat
# docker run, bukan di-bake di sini.
CMD ["python", "server.py"]
