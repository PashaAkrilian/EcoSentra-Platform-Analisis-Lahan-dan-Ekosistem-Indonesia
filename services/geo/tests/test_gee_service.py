import types

import pytest

from app import gee_service
from app.gee_service import GEEServiceError


class FakeDict:
    def __init__(self, value):
        self.value = value

    def getInfo(self):  # noqa: N802 - mengikuti API earthengine
        return self.value


def fake_ee(histogram):
    """Rantai panggilan ee.* yang dipakai get_landcover_breakdown, dikembalikan statis."""

    class Image:
        def select(self, band):
            return self

        def reduceRegion(self, **kwargs):  # noqa: N802
            return types.SimpleNamespace(get=lambda band: histogram)

    class Collection:
        def __init__(self, asset):
            assert asset == "ESA/WorldCover/v200"

        def first(self):
            return Image()

    geometry = types.SimpleNamespace(Point=lambda coords: types.SimpleNamespace(buffer=lambda meters: ("region", meters)))
    reducer = types.SimpleNamespace(Reducer=types.SimpleNamespace(frequencyHistogram=lambda: "hist"))
    return types.SimpleNamespace(
        Geometry=geometry,
        ImageCollection=Collection,
        Reducer=reducer.Reducer,
        Dictionary=FakeDict,
    )


@pytest.fixture(autouse=True)
def _initialized(monkeypatch):
    monkeypatch.setattr(gee_service, "_initialized", True)


def test_breakdown_sorted_with_percentages(monkeypatch):
    monkeypatch.setattr(gee_service, "ee", fake_ee({"10": 7954, "30": 31, "50": 15}))
    result = gee_service.get_landcover_breakdown(-6.7, 106.7, 1500)

    assert result["dominant_class"] == "Tree cover"
    assert [c["code"] for c in result["classes"]] == [10, 30, 50]
    assert [c["name"] for c in result["classes"]] == ["Tree cover", "Grassland", "Built-up"]
    assert sum(c["percentage"] for c in result["classes"]) == pytest.approx(100, abs=0.05)
    assert result["classes"][0]["percentage"] == pytest.approx(99.425, abs=0.01)


def test_unknown_class_code_gets_generic_name(monkeypatch):
    monkeypatch.setattr(gee_service, "ee", fake_ee({"10": 1, "123": 3}))
    result = gee_service.get_landcover_breakdown(0, 100, 500)
    assert result["dominant_class"] == "Unknown (123)"


def test_empty_histogram_raises_clear_error(monkeypatch):
    monkeypatch.setattr(gee_service, "ee", fake_ee({}))
    with pytest.raises(GEEServiceError, match="Tidak ada data"):
        gee_service.get_landcover_breakdown(0, 100, 500)


def test_missing_credentials_raise_clear_error(monkeypatch):
    monkeypatch.setattr(gee_service, "_initialized", False)
    with pytest.raises(GEEServiceError, match="GEE_KEY_PATH atau GEE_CREDENTIALS_JSON"):
        gee_service._ensure_initialized()


def test_missing_service_account_raises(monkeypatch):
    monkeypatch.setattr(gee_service, "_initialized", False)
    monkeypatch.setenv("GEE_KEY_PATH", "/tmp/tidak-ada.json")
    with pytest.raises(GEEServiceError, match="GEE_SERVICE_ACCOUNT"):
        gee_service._ensure_initialized()
