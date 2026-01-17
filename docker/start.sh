#!/bin/bash

# Start backend server in background
cd /app/backend
npm start &

# Start frontend dev server
cd /app/frontend
npm start

# Keep container running
wait -n
