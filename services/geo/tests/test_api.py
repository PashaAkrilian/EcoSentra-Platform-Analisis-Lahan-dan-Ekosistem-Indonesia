from app import main
from app.gee_service import GEEServiceError

SAMPLE = {
    "dominant_class": "Tree cover",
    "classes": [
        {"name": "Tree cover", "code": 10, "percentage": 99.54},
        {"name": "Grassland", "code": 30, "percentage": 0.46},
    ],
}


def post(client, **overrides):
    payload = {"lat": -6.7333, "lng": 106.7167, "buffer_meters": 1500, **overrides}
    return client.post("/api/landcover", json=payload)


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_landcover_success(client, monkeypatch):
    calls = []

    def fake(lat, lng, buffer_meters):
        calls.append((lat, lng, buffer_meters))
        return SAMPLE

    monkeypatch.setattr(main, "get_landcover_breakdown", fake)
    response = post(client)

    assert response.status_code == 200
    assert response.json() == SAMPLE
    assert calls == [(-6.7333, 106.7167, 1500)]


def test_default_buffer_is_1000(client, monkeypatch):
    seen = {}
    monkeypatch.setattr(main, "get_landcover_breakdown", lambda lat, lng, buffer_meters: seen.update(b=buffer_meters) or SAMPLE)
    response = client.post("/api/landcover", json={"lat": 0, "lng": 100})
    assert response.status_code == 200
    assert seen["b"] == 1000


def test_validation_rejects_bad_input(client, monkeypatch):
    monkeypatch.setattr(main, "get_landcover_breakdown", lambda **_: SAMPLE)
    for bad in ({"lat": 91}, {"lat": -91}, {"lng": 181}, {"buffer_meters": 99}, {"buffer_meters": 50001}):
        assert post(client, **bad).status_code == 422, bad
    assert client.post("/api/landcover", json={"lat": 1}).status_code == 422


def test_gee_error_maps_to_502_without_crashing(client, monkeypatch):
    def boom(**_):
        raise GEEServiceError("Gagal inisialisasi Google Earth Engine: kredensial salah")

    monkeypatch.setattr(main, "get_landcover_breakdown", boom)
    response = post(client)
    assert response.status_code == 502
    assert "kredensial salah" in response.json()["error"]


def test_unexpected_error_does_not_leak_details(client, monkeypatch):
    def boom(**_):
        raise RuntimeError("path rahasia /srv/secrets/key.json")

    monkeypatch.setattr(main, "get_landcover_breakdown", boom)
    response = post(client)
    assert response.status_code == 500
    assert "rahasia" not in response.text


def test_rate_limit_10_per_minute(client, monkeypatch):
    monkeypatch.setattr(main, "get_landcover_breakdown", lambda **_: SAMPLE)
    statuses = [post(client).status_code for _ in range(11)]
    assert statuses[:10] == [200] * 10
    assert statuses[10] == 429


def test_api_key_required_when_configured(client, monkeypatch):
    monkeypatch.setattr(main, "get_landcover_breakdown", lambda **_: SAMPLE)
    monkeypatch.setenv("GEO_API_KEY", "rahasia-123")

    assert post(client).status_code == 401
    assert client.post("/api/landcover", json={"lat": 0, "lng": 100}, headers={"X-API-Key": "salah"}).status_code == 401
    ok = client.post("/api/landcover", json={"lat": 0, "lng": 100}, headers={"X-API-Key": "rahasia-123"})
    assert ok.status_code == 200
    # /health tetap publik (dipakai health check platform)
    assert client.get("/health").status_code == 200
