"""Model Pydantic untuk request/response endpoint /api/landcover."""
from pydantic import BaseModel, Field


class LandcoverRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude titik pusat")
    lng: float = Field(..., ge=-180, le=180, description="Longitude titik pusat")
    # Batas 100-50000m mencegah query buffer raksasa yang membebani GEE.
    buffer_meters: int = Field(
        1000, ge=100, le=50000, description="Radius buffer dalam meter"
    )


class ClassBreakdown(BaseModel):
    name: str
    code: int
    percentage: float


class LandcoverResponse(BaseModel):
    dominant_class: str
    classes: list[ClassBreakdown]
