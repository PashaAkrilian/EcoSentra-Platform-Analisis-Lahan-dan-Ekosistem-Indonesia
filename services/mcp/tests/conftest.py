import pytest


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    for name in ("ECOSENTRA_API_URL", "LANDCOVER_API_URL", "GEO_API_KEY"):
        monkeypatch.delenv(name, raising=False)


class FakeResponse:
    def __init__(self, payload=None, status_code=200, text=""):
        self._payload = payload
        self.status_code = status_code
        self.text = text or (str(payload) if payload is not None else "")

    def json(self):
        if self._payload is None:
            raise ValueError("bukan JSON")
        return self._payload

    def raise_for_status(self):
        import httpx

        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=None, response=self)  # type: ignore[arg-type]


@pytest.fixture
def fake_http(monkeypatch):
    """Ganti httpx.get/post dengan fungsi palsu; mencatat panggilan di `calls`."""
    import httpx

    state = {"get": None, "post": None, "calls": []}

    def _get(url, params=None, timeout=None, **_):
        state["calls"].append(("GET", url, params))
        result = state["get"]
        if isinstance(result, Exception):
            raise result
        return result

    def _post(url, json=None, headers=None, timeout=None, **_):
        state["calls"].append(("POST", url, json, headers))
        result = state["post"]
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(httpx, "get", _get)
    monkeypatch.setattr(httpx, "post", _post)
    return state
