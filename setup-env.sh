#!/bin/bash

# Quick Environment Setup for Render Deployment
# Run this to generate production environment variables

echo "🚀 PrimeTrade Deployment Environment Setup"
echo "=========================================="
echo ""

# Generate secure JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "📝 Generated Production Environment Variables:"
echo ""
echo "NODE_ENV=production"
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_EXPIRY=24h"
echo "FRONTEND_URL=https://your-frontend.vercel.app"
echo "DATABASE_URL=file:./primetrade.db"
echo "PORT=4000"
echo ""
echo "✅ Copy these values to your Render dashboard:"
echo "   1. Go to Render.com → Your Web Service"
echo "   2. Click 'Environment' tab"
echo "   3. Paste each variable above"
echo ""
echo "📌 Important Notes:"
echo "   - Keep JWT_SECRET secure, never commit to git"
echo "   - Update FRONTEND_URL with your actual frontend domain"
echo "   - DATABASE_URL stays as is for SQLite"
echo ""
echo "🔗 Render Deployment Docs: https://render.com/docs/deploy-node"
echo ""
