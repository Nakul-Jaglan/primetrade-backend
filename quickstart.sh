#!/bin/bash

# Quick Start Script for PrimeTrade Backend
# Usage: bash quickstart.sh

echo "🚀 PrimeTrade Backend Setup"
echo "============================"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install from https://nodejs.org"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cat > .env << EOF
NODE_ENV=development
PORT=3000
DB_PATH=./primetrade.db
EOF
    echo "✓ .env created"
fi

# Start the server
echo ""
echo "🎯 Starting server..."
echo ""
npm start
