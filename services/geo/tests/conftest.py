"""Fixture bersama. Modul `ee` (earthengine-api) tidak dibutuhkan di test: kalau
belum terpasang, diganti stub kosong supaya `app.gee_service` bisa di-import."""
import sys
import types

import pytest

try:
    import ee  # noqa: F401
except ImportError:
    sys.modules["ee"] = types.ModuleType("ee")


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    monkeypatch.delenv("GEO_API_KEY", raising=False)
    monkeypatch.delenv("GEE_SERVICE_ACCOUNT", raising=False)
    monkeypatch.delenv("GEE_KEY_PATH", raising=False)
    monkeypatch.delenv("GEE_CREDENTIALS_JSON", raising=False)


@pytest.fixture
def client(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main

    # Setiap test mulai dengan hitungan rate limit baru.
    main.limiter.reset()
    return TestClient(main.app)
