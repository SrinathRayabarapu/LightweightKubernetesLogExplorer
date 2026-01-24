"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import load_env_configs, settings
from .services.kubectl import KubectlError
from .database import init_database, close_database
from .routers import envs, logs, namespaces, refresh
from .services.refresh_scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with proper cleanup."""
    # Startup: Load environment configurations
    print("Loading environment configurations...")
    configs = load_env_configs()
    print(f"Loaded {len(configs)} environment(s): {', '.join(configs.keys())}")
    
    # Initialize database
    print("Initializing database...")
    await init_database()
    
    # Start refresh scheduler
    print("Starting refresh scheduler...")
    await start_scheduler()
    
    print("✅ Application started successfully")
    
    try:
        yield
    finally:
        # Shutdown: Stop scheduler and close database
        # Use finally to ensure cleanup even on crashes
        print("Shutting down...")
        
        # Stop scheduler first (it uses the database)
        try:
            await stop_scheduler()
            print("Scheduler stopped")
        except Exception as e:
            print(f"Warning: Error stopping scheduler: {e}")
        
        # Then close database
        try:
            await close_database()
            print("Database closed")
        except Exception as e:
            print(f"Warning: Error closing database: {e}")
        
        print("✅ Shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Lightweight local Kubernetes log exploration tool",
    lifespan=lifespan,
)

# CORS configuration for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(envs.router)
app.include_router(logs.router)
app.include_router(namespaces.router)
app.include_router(refresh.router)


# Exception handlers
@app.exception_handler(KubectlError)
async def kubectl_error_handler(request: Request, exc: KubectlError):
    """Handle kubectl-related errors."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Kubernetes operation failed",
            "detail": exc.message,
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle validation errors."""
    return JSONResponse(
        status_code=400,
        content={
            "error": "Invalid request",
            "detail": str(exc),
        },
    )


@app.exception_handler(Exception)
async def general_error_handler(request: Request, exc: Exception):
    """Handle unexpected errors."""
    print(f"Unexpected error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
        },
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
    }
