"""
PackCheck AI - OCR Microservice Entrypoint.
FastAPI web application configured for provider-selectable OCR inference.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.utils.logger import logger
from app.api.v1.router import api_router
from app.core.ocr_engine import ocr_engine
from app.core.exceptions import (
    OCREception,
    domain_exception_handler,
    validation_exception_handler,
    global_exception_handler,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application Lifespan Events Handler.
    Pre-warms resources and initializes Singleton models on startup, cleans up on shutdown.
    """
    # ------------------------------------------------------------------------
    # STARTUP EVENT: Model pre-warming
    # ------------------------------------------------------------------------
    logger.info(
        f"Starting {settings.APP_NAME} v{settings.APP_VERSION} "
        f"in [{settings.ENVIRONMENT.upper()}] environment..."
    )
    logger.info(f"Engine configuration: {settings.OCR_PROVIDER} (GPU Enabled: {settings.USE_GPU})")
    logger.info("Initializing neural network inference runtime...")

    # Initialize only the configured OCR provider.
    ocr_engine.initialize_engine()

    # Ready for traffic
    logger.info(f"Microservice initialized and listening on http://{settings.HOST}:{settings.PORT}")

    yield

    # ------------------------------------------------------------------------
    # SHUTDOWN EVENT: Resource cleanup
    # ------------------------------------------------------------------------
    logger.info(f"Shutting down {settings.APP_NAME} gracefully...")


def create_application() -> FastAPI:
    """Factory function creating and configuring the FastAPI application instance."""
    app = FastAPI(
        title="PackCheck AI - OCR Microservice",
        description="High-performance optical character recognition API powered by the configured OCR provider and OpenCV.",
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # 1. Register CORS Middleware (Restricted server-to-server; no credentials)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    # 2. Register Global Exception Handlers
    app.add_exception_handler(OCREception, domain_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, global_exception_handler)

    # 3. Include API Router Routes (POST /ocr, GET /health)
    app.include_router(api_router)

    return app


app = create_application()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
