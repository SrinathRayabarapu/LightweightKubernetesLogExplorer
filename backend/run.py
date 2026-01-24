#!/usr/bin/env python3
"""Run the FastAPI application."""

import signal
import sys
import uvicorn

# Global reference to server for signal handling
_server = None


def signal_handler(sig, frame):
    """Handle shutdown signals gracefully."""
    print("\n🛑 Shutdown signal received. Stopping server...")
    if _server:
        _server.should_exit = True
    sys.exit(0)


if __name__ == "__main__":
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        _server = uvicorn.Server(
            uvicorn.Config(
                "app.main:app",
                host="127.0.0.1",
                port=8000,
                reload=True,
            )
        )
        _server.run()
    except KeyboardInterrupt:
        print("\n🛑 Keyboard interrupt received. Stopping server...")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)
