#!/bin/bash

# TROY Portfolio - Xserver Setup Script
echo "🎬 TROY Portfolio - Xserver Setup"
echo "================================="

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your settings:"
    echo "   - ADMIN_PASSWORD: Set your admin password"
    echo "   - ADMIN_JWT_SECRET: Set a secure JWT secret"
    echo ""
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data
mkdir -p movies
chmod 755 movies
chmod 755 data

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

echo ""
echo "🚀 Setup complete!"
echo ""
echo "Next steps for Xserver:"
echo "1. Edit .env file with your settings"
echo "2. Upload all files to your Xserver public_html directory"
echo "3. Set up Node.js application in Xserver panel:"
echo "   - Startup file: server/server.js"
echo "   - Application root: /public_html"
echo "4. Start the application"
echo ""
echo "Access your site at: https://yourdomain.com"
echo "Admin panel at: https://yourdomain.com/admin"