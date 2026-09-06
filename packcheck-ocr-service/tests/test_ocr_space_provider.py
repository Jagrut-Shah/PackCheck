"""Focused tests for OCR.space provider selection and normalization."""

from types import SimpleNamespace

import numpy as np
import pytest

from app.config import settings
from app.core.exceptions import OCRExecutionError
from app.core.ocr_engine import OCREngineManager, OCRSpaceProvider, RawOCRResult
from app.services.postprocessor import postprocessor


class FakeResponse:
    status_code = 200

    def __init__(self, payload):
        self.payload = payload

    def json(self):
        return self.payload


class FakeClient:
    def __init__(self, response):
        self.response = response
        self.received = None

    def post(self, endpoint, files, data):
        self.received = {"endpoint": endpoint, "files": files, "data": data}
        return self.response


def ocr_space_payload():
    return {
        "IsErroredOnProcessing": False,
        "ParsedResults": [
            {
                "ParsedText": "MRP Rs 100\n",
                "TextOverlay": {
                    "Lines": [
                        {
                            "LineText": "MRP Rs 100",
                            "Words": [
                                {"WordText": "MRP", "Left": 10, "Top": 20, "Width": 50, "Height": 40},
                                {"WordText": "Rs", "Left": 70, "Top": 20, "Width": 30, "Height": 40},
                                {"WordText": "100", "Left": 110, "Top": 20, "Width": 60, "Height": 40},
                            ],
                        }
                    ]
                },
            }
        ],
    }


def configured_provider(monkeypatch, payload=None):
    monkeypatch.setattr(settings, "OCR_SPACE_API_KEY", "test-key")
    client = FakeClient(FakeResponse(payload or ocr_space_payload()))
    provider = OCRSpaceProvider(client=client)
    provider.initialize()
    return provider, client


def test_provider_selection_supports_ocr_space_and_paddleocr(monkeypatch):
    manager = OCREngineManager()

    monkeypatch.setattr(settings, "OCR_PROVIDER", "ocr_space")
    assert manager.provider_name == "ocr_space"

    monkeypatch.setattr(settings, "OCR_PROVIDER", "paddleocr")
    assert manager.provider_name == "paddleocr"


def test_ocr_space_is_the_default_provider(monkeypatch):
    monkeypatch.delenv("OCR_PROVIDER", raising=False)
    monkeypatch.setattr(settings, "OCR_PROVIDER", "ocr_space")
    assert OCREngineManager().provider_name == "ocr_space"


def test_ocr_space_normalizes_raw_text_and_overlay_coordinates(monkeypatch):
    provider, client = configured_provider(monkeypatch)

    result = provider.process_image(np.zeros((80, 240, 3), dtype=np.uint8))

    assert isinstance(result, RawOCRResult)
    assert result.engine_name == "OCR.space"
    assert result.engine_version == "OCREngine 2"
    assert result.raw_text == "MRP Rs 100"
    assert result.detections[0].text == "MRP Rs 100"
    assert result.detections[0].polygon == [(10.0, 20.0), (170.0, 20.0), (170.0, 60.0), (10.0, 60.0)]
    assert client.received["endpoint"] == OCRSpaceProvider.endpoint
    assert client.received["data"]["OCREngine"] == "2"
    assert client.received["data"]["apikey"] == "test-key"


def test_ocr_space_result_keeps_existing_response_contract(monkeypatch):
    provider, _ = configured_provider(monkeypatch)
    raw_result = provider.process_image(np.zeros((80, 240, 3), dtype=np.uint8))

    result = postprocessor.map_to_ocr_result(raw_result, "inspection-1", "image-1")

    assert result.rawText == "MRP Rs 100"
    assert result.detectedTextItems[0].boundingBox == (10.0, 20.0, 160.0, 40.0)
    assert result.blocks[0].boundingBox.x == 10.0
    assert result.blocks[0].boundingBox.width == 160.0
    assert result.blocks[0].polygonPoints == [(10.0, 20.0), (170.0, 20.0), (170.0, 60.0), (10.0, 60.0)]


def test_ocr_space_requires_server_api_key(monkeypatch):
    monkeypatch.setattr(settings, "OCR_SPACE_API_KEY", "")
    with pytest.raises(OCRExecutionError, match="OCR.space API key"):
        OCRSpaceProvider().initialize()


def test_ocr_space_startup_does_not_initialize_paddle(monkeypatch):
    manager = OCREngineManager()
    fake_provider = SimpleNamespace(is_ready=False, initialize=lambda: None)
    monkeypatch.setattr(settings, "OCR_PROVIDER", "ocr_space")
    monkeypatch.setattr(settings, "OCR_SPACE_API_KEY", "test-key")
    monkeypatch.setattr(manager, "_ocr_space_provider", fake_provider)
    monkeypatch.setattr(manager, "_engine", None)
    monkeypatch.setattr(manager, "_initialized", False)

    manager.initialize_engine()

    assert manager._engine is None