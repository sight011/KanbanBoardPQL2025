#!/bin/bash

# Kill existing processes
echo "Killing existing processes..."
pkill -f node || true
pkill -f vite || true

# Wait a moment to ensure processes are fully terminated
sleep 2

# Start backend
echo "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID 