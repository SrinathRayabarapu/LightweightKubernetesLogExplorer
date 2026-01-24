#!/bin/bash
# Startup script for K8S Log Explorer (macOS/Linux)
# Starts both backend and frontend services

set -e

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
echo -e "${GREEN}K8S Log Explorer - Starting Services${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if services are already running
if [ -f "$BACKEND_PID_FILE" ] && ps -p $(cat "$BACKEND_PID_FILE") > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend is already running (PID: $(cat "$BACKEND_PID_FILE"))${NC}"
    echo -e "${YELLOW}   Run ./stop.sh to stop it first${NC}"
    exit 1
fi

if [ -f "$FRONTEND_PID_FILE" ] && ps -p $(cat "$FRONTEND_PID_FILE") > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Frontend is already running (PID: $(cat "$FRONTEND_PID_FILE"))${NC}"
    echo -e "${YELLOW}   Run ./stop.sh to stop it first${NC}"
    exit 1
fi

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python3 not found${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}✗ kubectl not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites found${NC}"
echo ""

# Start Backend
echo "Starting Backend Server..."
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
    echo -e "${RED}✗ Virtual environment not found${NC}"
    echo "   Run: cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

source venv/bin/activate

# Start backend in background
nohup python3 run.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$BACKEND_PID_FILE"

# Wait a moment to check if backend started successfully
sleep 2
if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo -e "${RED}✗ Backend failed to start${NC}"
    echo "   Check logs/backend.log for details"
    rm -f "$BACKEND_PID_FILE"
    exit 1
fi

echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo "   Logs: logs/backend.log"
echo ""

# Start Frontend
echo "Starting Frontend Server..."
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo -e "${RED}✗ Frontend dependencies not installed${NC}"
    echo "   Run: cd frontend && npm install"
    exit 1
fi

# Start frontend in background
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$FRONTEND_PID_FILE"

# Wait a moment to check if frontend started successfully
sleep 3
if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo -e "${RED}✗ Frontend failed to start${NC}"
    echo "   Check logs/frontend.log for details"
    rm -f "$FRONTEND_PID_FILE"
    # Stop backend if frontend failed
    kill $BACKEND_PID 2>/dev/null || true
    rm -f "$BACKEND_PID_FILE"
    exit 1
fi

echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo "   Logs: logs/frontend.log"
echo ""

# Create logs directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/logs"

# Save both PIDs
echo "$BACKEND_PID $FRONTEND_PID" > "$PID_FILE"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Services started successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Backend:  http://127.0.0.1:8000"
echo "Frontend: http://localhost:5173"
echo ""
echo "To stop services, run: ./stop.sh"
echo "To view logs:"
echo "  Backend:  tail -f logs/backend.log"
echo "  Frontend: tail -f logs/frontend.log"
