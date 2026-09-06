"""Focused tests for Google Cloud Vision provider selection and normalization."""

from types import SimpleNamespace

import numpy as np

from app.config import settings
from app.core.ocr_engine import (
    GoogleVisionOCRProvider,
    OCREngineManager,
    RawOCRResult,
)
from app.services.postprocessor import postprocessor


class FakeVisionClient:
    def __init__(self, response):
        self.response = response
        self.received_image = None

    def document_text_detection(self, *, image):
        self.received_image = image
        return self.response


def make_vertex(x, y):
    return SimpleNamespace(x=x, y=y)


def make_paragraph(text, polygon, confidence=0.91):
    words = [
        SimpleNamespace(
            symbols=[SimpleNamespace(text=word)],
            confidence=confidence,
        )
        for word in text.split()
    ]
    return SimpleNamespace(
        words=words,
        confidence=confidence,
        bounding_box=SimpleNamespace(
            vertices=[make_vertex(x, y) for x, y in polygon]
        ),
    )


def make_response():
    paragraph = make_paragraph(
        "MRP Rs 100",
        [(10, 20), (210, 20), (210, 60), (10, 60)],
    )
    annotation = SimpleNamespace(
        text="MRP Rs 100\n",
        pages=[
            SimpleNamespace(
                blocks=[SimpleNamespace(paragraphs=[paragraph])]
            )
        ],
    )
    return SimpleNamespace(full_text_annotation=annotation, error=None)


def test_provider_selection_supports_google_vision_and_paddleocr(monkeypatch):
    manager = OCREngineManager()

    monkeypatch.setattr(settings, "OCR_PROVIDER", "google_vision")
    assert manager.provider_name == "google_vision"

    monkeypatch.setattr(settings, "OCR_PROVIDER", "paddleocr")
    assert manager.provider_name == "paddleocr"


def test_google_vision_normalizes_text_and_polygon_coordinates():
    client = FakeVisionClient(make_response())
    provider = GoogleVisionOCRProvider(
        client=client,
        image_factory=lambda content: content,
    )

    result = provider.process_image(np.zeros((80, 240, 3), dtype=np.uint8))

    assert isinstance(result, RawOCRResult)
    assert result.engine_name == "Google Cloud Vision"
    assert result.engine_version == "DOCUMENT_TEXT_DETECTION"
    assert result.raw_text == "MRP Rs 100\n"
    assert client.received_image
    assert len(result.detections) == 1
    assert result.detections[0].text == "MRP Rs 100"
    assert result.detections[0].polygon == [(10.0, 20.0), (210.0, 20.0), (210.0, 60.0), (10.0, 60.0)]


def test_google_vision_raw_text_and_coordinates_keep_existing_response_contract():
    provider = GoogleVisionOCRProvider(
        client=FakeVisionClient(make_response()),
        image_factory=lambda content: content,
    )
    raw_result = provider.process_image(np.zeros((80, 240, 3), dtype=np.uint8))

    result = postprocessor.map_to_ocr_result(
        raw_ocr_result=raw_result,
        inspection_id="inspection-1",
        image_id="image-1",
    )

    assert result.rawText == "MRP Rs 100\n"
    assert result.detectedTextItems[0].boundingBox == (10.0, 20.0, 200.0, 40.0)
    assert result.blocks[0].boundingBox.x == 10.0
    assert result.blocks[0].boundingBox.y == 20.0
    assert result.blocks[0].boundingBox.width == 200.0
    assert result.blocks[0].boundingBox.height == 40.0
    assert result.blocks[0].polygonPoints == [(10.0, 20.0), (210.0, 20.0), (210.0, 60.0), (10.0, 60.0)]


def test_google_vision_startup_does_not_initialize_paddle(monkeypatch):
    manager = OCREngineManager()

    class FakeGoogleProvider:
        is_ready = False

        def __init__(self):
            self.initialized = False

        def initialize(self):
            self.initialized = True

    fake_provider = FakeGoogleProvider()
    monkeypatch.setattr(settings, "OCR_PROVIDER", "google_vision")
    monkeypatch.setattr(manager, "_google_provider", fake_provider)
    monkeypatch.setattr(manager, "_engine", None)
    monkeypatch.setattr(manager, "_initialized", False)

    manager.initialize_engine()

    assert fake_provider.initialized is True
    assert manager._engine is None
