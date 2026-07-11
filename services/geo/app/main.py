"""FastAPI app layanan geo EcoSentra: klasifikasi tutupan lahan via GEE."""
from dotenv import load_dotenv

load_dotenv()  # muat services/geo/.env sebelum modul lain baca os.environ

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.gee_service import GEEServiceError, get_landcover_breakdown
from app.schemas import LandcoverRequest, LandcoverResponse

app = FastAPI(title="EcoSentra Geo Service", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/landcover", response_model=LandcoverResponse)
def landcover(payload: LandcoverRequest):
    # def biasa (bukan async def) -> FastAPI menjalankannya di threadpool,
    # supaya panggilan earthengine-api yang blocking/sync tidak menyumbat
    # event loop.
    try:
        return get_landcover_breakdown(
            lat=payload.lat,
            lng=payload.lng,
            buffer_meters=payload.buffer_meters,
        )
    except GEEServiceError as exc:
        return JSONResponse(status_code=502, content={"error": str(exc)})
    except Exception as exc:
        # Jaring pengaman terakhir: jangan sampai klien menerima 500 polos
        # tanpa konteks kalau ada bug tak terduga.
        return JSONResponse(
            status_code=500, content={"error": f"Kesalahan tak terduga: {exc}"}
        )
