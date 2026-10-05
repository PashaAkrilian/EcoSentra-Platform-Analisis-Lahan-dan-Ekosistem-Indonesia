import httpx

from tests.conftest import FakeResponse
from tools.earthquakes import get_earthquakes
from tools.hotspots import get_fire_hotspots
from tools.land_cover import get_land_cover
from tools.ndvi import get_ndvi
from tools.weather import get_weather

BASE = "http://ecosentra.test"

FIRE = {
    "source": {"name": "NASA FIRMS", "satellite": "Suomi NPP VIIRS 375 m", "fetchedAt": "2026-10-05T14:22:30Z"},
    "range": "24h",
    "total": 3079,
    "highConfidence": 231,
    "latestAcquiredAt": "2026-10-05T07:09:00Z",
    "byProvince": [{"name": "Kalimantan Tengah", "count": 3079}, {"name": "Papua", "count": 1641}],
    "byDay": [],
}


class TestLandCover:
    def test_validation_runs_before_any_network_call(self, fake_http):
        assert "lat harus" in get_land_cover(95, 100)
        assert "lng harus" in get_land_cover(0, 200)
        assert "buffer_meters harus" in get_land_cover(0, 100, 50)
        assert fake_http["calls"] == []

    def test_mock_mode_is_clearly_labelled(self):
        text = get_land_cover(-6.5714, 107.7638)
        assert "Kelas dominan: Built-up (66.78%)" in text
        assert "MOCK" in text

    def test_ecosentra_api_mode(self, monkeypatch, fake_http):
        monkeypatch.setenv("ECOSENTRA_API_URL", BASE + "/")
        fake_http["get"] = FakeResponse(
            {
                "dominantClass": "Pepohonan",
                "classes": [{"name": "Pepohonan", "code": 2, "percentage": 87.0}, {"name": "Tanaman pertanian", "code": 5, "percentage": 13.0}],
                "source": {"name": "Esri | Impact Observatory", "dataset": "Sentinel-2 10m LULC", "year": 2025},
            }
        )
        text = get_land_cover(-2.2, 113.9, 2000)
        assert fake_http["calls"][0] == ("GET", BASE + "/api/landcover", {"lat": -2.2, "lng": 113.9, "buffer": 2000})
        assert "Kelas dominan: Pepohonan (87.0%)" in text
        assert "Sentinel-2 10m LULC 2025" in text
        assert "MOCK" not in text

    def test_legacy_geo_service_mode_sends_api_key(self, monkeypatch, fake_http):
        monkeypatch.setenv("LANDCOVER_API_URL", "http://geo.test")
        monkeypatch.setenv("GEO_API_KEY", "k-123")
        fake_http["post"] = FakeResponse({"dominant_class": "Tree cover", "classes": [{"name": "Tree cover", "code": 10, "percentage": 99.5}]})
        text = get_land_cover(-6.7, 106.7)
        method, url, body, headers = fake_http["calls"][0]
        assert (method, url) == ("POST", "http://geo.test/api/landcover")
        assert body == {"lat": -6.7, "lng": 106.7, "buffer_meters": 1000}
        assert headers == {"X-API-Key": "k-123"}
        assert "Tree cover (99.5%)" in text

    def test_errors_become_text_not_exceptions(self, monkeypatch, fake_http):
        monkeypatch.setenv("ECOSENTRA_API_URL", BASE)
        fake_http["get"] = httpx.ConnectError("refused")
        assert "tidak bisa terhubung" in get_land_cover(0, 100)
        fake_http["get"] = httpx.ReadTimeout("slow")
        assert "timeout" in get_land_cover(0, 100)
        fake_http["get"] = FakeResponse({"error": "Koordinat harus berada di wilayah Indonesia"}, status_code=400)
        assert "status 400: Koordinat harus berada di wilayah Indonesia" in get_land_cover(48, 2)
        fake_http["get"] = FakeResponse(None, status_code=200)
        assert "bukan JSON" in get_land_cover(0, 100)


class TestFireHotspots:
    def test_requires_configuration_and_never_fakes_data(self):
        text = get_fire_hotspots()
        assert text.startswith("Error:")
        assert "ECOSENTRA_API_URL" in text

    def test_national_summary(self, monkeypatch, fake_http):
        monkeypatch.setenv("ECOSENTRA_API_URL", BASE)
        fake_http["get"] = FakeResponse(FIRE)
        text = get_fire_hotspots()
        assert fake_http["calls"][0] == ("GET", BASE + "/api/hotspots/summary", {"range": "24h"})
        assert "Seluruh Indonesia (24 jam terakhir)" in text
        assert "Total: 3.079 titik, 231 berkeyakinan tinggi" in text
        assert "Provinsi terbanyak: Kalimantan Tengah (3.079), Papua (1.641)" in text
        assert "bukan kebakaran terverifikasi" in text

    def test_province_is_forwarded_as_typed(self, monkeypatch, fake_http):
        monkeypatch.setenv("ECOSENTRA_API_URL", BASE)
        fake_http["get"] = FakeResponse({**FIRE, "byProvince": [{"name": "Kalimantan Tengah", "count": 3079}]})
        text = get_fire_hotspots("kalteng", "7d")
        assert fake_http["calls"][0][2] == {"range": "7d", "province": "kalteng"}
        assert "Titik api — Kalimantan Tengah (7 hari terakhir)" in text

    def test_invalid_range(self):
        assert "range harus" in get_fire_hotspots(None, "1y")


class TestEarthquakes:
    QUAKES = {
        "source": {"name": "BMKG", "fetchedAt": "x"},
        "recent": [
            {"magnitude": 6.1, "region": "14 km BaratDaya KODI", "occurredAt": "2026-10-03T22:55:52Z", "depthKm": 10, "tsunamiPotential": True, "felt": None},
            {"magnitude": 5.9, "region": "68 km BaratDaya CALANG", "occurredAt": "2026-10-03T23:37:31Z", "depthKm": 26, "tsunamiPotential": False, "felt": None},
        ],
        "felt": [{"magnitude": 3.1, "region": "Maumere", "occurredAt": "2026-10-05T12:46:17Z", "depthKm": 12, "tsunamiPotential": False, "felt": "II-III Sikka"}],
    }

    def test_recent_and_felt(self, monkeypatch, fake_http):
        monkeypatch.setenv("ECOSENTRA_API_URL", BASE)
        fake_http["get"] = FakeResponse(self.QUAKES)
        text = get_earthquakes(limit=1)
        assert "M 6.1 · 14 km BaratDaya KODI" in text and "BERPOTENSI TSUNAMI" in text
        assert "M 5.9" not in text  # limit=1
        assert "dirasakan II-III Sikka" in get_earthquakes(felt=True)
        assert "BMKG/BNPB" in text

    def test_limit_validation(self):
        assert "limit harus" in get_earthquakes(limit=0)
        assert "limit harus" in get_earthquakes(limit=99)


class TestWeatherAndNdvi:
    def test_weather(self, monkeypatch, fake_http):
        monkeypatch.setenv("ECOSENTRA_API_URL", BASE)
        fake_http["get"] = FakeResponse(
            {
                "lat": -6.57,
                "lng": 107.76,
                "source": {"name": "Open-Meteo"},
                "current": {"description": "Berawan sebagian", "temperatureC": 30.2, "humidityPct": 64, "windSpeedKmh": 7.9, "precipitationMm": 0, "soilMoisture": 0.162},
                "daily": [{"date": "2026-10-05", "description": "Gerimis ringan", "tempMinC": 24, "tempMaxC": 37, "precipitationMm": 0.1}],
            }
        )
        text = get_weather(-6.57, 107.76)
        assert "Berawan sebagian, 30.2°C" in text
        assert "Kelembapan tanah (model): 16.2%" in text
        assert "keluaran model" in text

    def test_ndvi_reliable_and_cloudy(self, monkeypatch, fake_http):
        monkeypatch.setenv("ECOSENTRA_API_URL", BASE)
        base = {
            "lat": -6.57,
            "lng": 107.76,
            "source": {"name": "NASA MODIS via ORNL DAAC", "product": "MOD13Q1", "resolutionM": 250},
            "observations": [{"quality": "baik"}, {"quality": "berawan"}, {"quality": "berawan"}],
        }
        fake_http["get"] = FakeResponse({**base, "latest": {"ndvi": 0.85, "date": "2026-08-13"}})
        text = get_ndvi(-6.57, 107.76)
        assert "Terbaru: 0.85" in text and "sangat lebat" in text
        assert "2 dari 3 observasi berawan" in text

        fake_http["get"] = FakeResponse({**base, "latest": None})
        assert "tertutup awan" in get_ndvi(-6.57, 107.76)

    def test_coordinate_validation(self):
        assert get_weather(100, 0).startswith("Error:")
        assert get_ndvi(0, 500).startswith("Error:")
