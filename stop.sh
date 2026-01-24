#!/bin/bash
# Shutdown script for K8S Log Explorer (macOS/Linux)
# Stops both backend and frontend services

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.k8s-log-explorer.pid"
BACKEND_PID_FILE="$SCRIPT_DIR/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}K8S Log Explorer - Stopping Services${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

STOPPED=0

# Stop Backend
if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat "$BACKEND_PID_FILE")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "Stopping Backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
        
        # Wait for graceful shutdown (max 5 seconds)
        for i in {1..5}; do
            if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}  Force killing backend...${NC}"
            kill -9 $BACKEND_PID 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✓ Backend stopped${NC}"
        STOPPED=$((STOPPED + 1))
    else
        echo -e "${YELLOW}⚠️  Backend was not running${NC}"
    fi
    rm -f "$BACKEND_PID_FILE"
else
    echo -e "${YELLOW}⚠️  Backend PID file not found${NC}"
fi

# Stop Frontend
if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "Stopping Frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
        
        # Wait for graceful shutdown (max 5 seconds)
        for i in {1..5}; do
            if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}  Force killing frontend...${NC}"
            kill -9 $FRONTEND_PID 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✓ Frontend stopped${NC}"
        STOPPED=$((STOPPED + 1))
    else
        echo -e "${YELLOW}⚠️  Frontend was not running${NC}"
    fi
    rm -f "$FRONTEND_PID_FILE"
else
    echo -e "${YELLOW}⚠️  Frontend PID file not found${NC}"
fi

# Clean up PID file
rm -f "$PID_FILE"

# Also check for any remaining processes on ports
echo ""
echo "Checking for processes on ports 8000 and 5173..."

PORT_8000=$(lsof -ti:8000 2>/dev/null || true)
PORT_5173=$(lsof -ti:5173 2>/dev/null || true)

if [ ! -z "$PORT_8000" ]; then
    echo -e "${YELLOW}⚠️  Process still running on port 8000 (PID: $PORT_8000)${NC}"
    read -p "Kill it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $PORT_8000 2>/dev/null || true
        echo -e "${GREEN}✓ Killed process on port 8000${NC}"
    fi
fi

if [ ! -z "$PORT_5173" ]; then
    echo -e "${YELLOW}⚠️  Process still running on port 5173 (PID: $PORT_5173)${NC}"
    read -p "Kill it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $PORT_5173 2>/dev/null || true
        echo -e "${GREEN}✓ Killed process on port 5173${NC}"
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
if [ $STOPPED -gt 0 ]; then
    echo -e "${GREEN}✓ Stopped $STOPPED service(s)${NC}"
else
    echo -e "${YELLOW}⚠️  No services were running${NC}"
fi
echo -e "${GREEN}========================================${NC}"
