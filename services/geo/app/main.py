"""FastAPI app layanan geo EcoSentra: klasifikasi tutupan lahan via GEE."""
import hmac
import logging
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.gee_service import GEEServiceError, get_landcover_breakdown
from app.schemas import LandcoverRequest, LandcoverResponse

# muat services/geo/.env; semua konfigurasi dibaca dari os.environ saat dipakai
# (bukan saat import), jadi urutan terhadap import di atas tidak penting.
load_dotenv()

logger = logging.getLogger("ecosentra.geo")

app = FastAPI(title="EcoSentra Geo Service", version="0.2.0")

# Rate limit in-memory per-IP. Jaring pengaman awal supaya satu sumber tidak
# menghabiskan kuota/biaya GEE lewat pemanggilan berulang - BUKAN pertahanan
# anti-abuse yang kuat (reset saat restart, tidak akurat kalau di-scale jadi
# banyak instance, bisa dilewati dengan ganti IP).
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Kalau GEO_API_KEY di-set, semua panggilan /api/* wajib menyertakan header
    `X-API-Key` yang sama. Dipakai saat layanan di-deploy publik: tanpa ini siapa
    pun yang tahu URL-nya bisa menghabiskan kuota Earth Engine. Dibaca per
    request (bukan saat import) supaya mudah diuji dan bisa diganti tanpa restart
    kode. Perbandingan constant-time untuk mencegah timing attack."""
    expected = os.environ.get("GEO_API_KEY")
    if not expected:
        return
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="API key tidak valid atau tidak ada.")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/landcover", response_model=LandcoverResponse, dependencies=[Depends(require_api_key)])
@limiter.limit("10/minute")
def landcover(request: Request, payload: LandcoverRequest):
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
    except Exception:  # noqa: BLE001 - jaring pengaman terakhir
        # Jangan bocorkan detail internal ke klien; detail ada di log server.
        logger.exception("Kesalahan tak terduga di /api/landcover")
        return JSONResponse(status_code=500, content={"error": "Kesalahan tak terduga di layanan geo."})
