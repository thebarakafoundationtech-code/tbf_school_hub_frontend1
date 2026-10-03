#!/bin/bash
# Server-side update script for Baraka Frontend
# Place this on your server or run whenever updating manually

set -e

echo "==========================================="
echo "  Deploying Baraka Frontend via Git"
echo "==========================================="

# Navigate to project directory
cd "$(dirname "$0")"

# 1. Pull latest commits
echo "📥 1. Pulling latest commits from Git..."
git pull origin main

# 2. Check if Docker is being used
if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo "🐳 2. Rebuilding Docker container..."
    docker compose up -d --build
    echo "🧹 Cleaning unused images..."
    docker image prune -f
else
    echo "📦 2. Installing dependencies and building with Node.js..."
    npm ci
    npm run build
    
    if command -v pm2 &> /dev/null; then
        echo "🔄 Restarting PM2 process..."
        pm2 restart baraka-frontend || pm2 start dist/server.cjs --name "baraka-frontend"
    fi
fi

echo "==========================================="
echo "✅ Deployment Successful!"
echo "==========================================="
