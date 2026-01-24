#!/usr/bin/env python3
"""
Run the FastAPI application.

This script starts the uvicorn server with proper signal handling.
Uvicorn handles SIGINT/SIGTERM internally - no custom signal handlers needed.
"""

import uvicorn

if __name__ == "__main__":
    # Let uvicorn handle signals natively - do NOT add custom signal handlers
    # as they can cause segmentation faults by interrupting C extensions
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,  # Disable reload for stability (avoids subprocess issues)
        log_level="info",
    )
