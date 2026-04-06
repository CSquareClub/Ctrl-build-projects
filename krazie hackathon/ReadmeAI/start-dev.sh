#!/bin/bash
# ReadmeAI Development - Start Both Services

echo "🚀 Starting ReadmeAI Development Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if both directories exist
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Both frontend and backend directories must exist"
    exit 1
fi

# Start Backend in background
echo -e "${BLUE}Starting backend on http://localhost:5000...${NC}"
cd backend

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

python app.py &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo ""

# Go back to root
cd ..

# Small delay to ensure backend is ready
sleep 2

# Start Frontend
echo -e "${BLUE}Starting frontend on http://localhost:3000...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}✅ Both services are running!${NC}"
echo "=========================================="
echo ""
echo "Frontend:  http://localhost:3000"
echo "Backend:   http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
