FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .
COPY tools/ tools/

# MCP pakai stdio transport (bukan HTTP) -> container ini harus dijalankan
# interaktif (docker run -i ...) supaya stdin/stdout host tersambung ke
# proses MCP di dalam container. LANDCOVER_API_URL di-set lewat -e saat
# docker run, bukan di-bake di sini.
CMD ["python", "server.py"]
