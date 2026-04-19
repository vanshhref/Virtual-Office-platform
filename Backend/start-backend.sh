#!/bin/bash
# ============================================================
# Backend Startup Script - Virtual Office
# Fixes NTFS symlink issue by using Linux-native node_modules
# ============================================================

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
LINUX_MODULES_DIR="$HOME/vapp-backend-modules"

echo "🔧 Setting up backend environment..."

# Step 1: Ensure the Linux-native modules dir exists
if [ ! -d "$LINUX_MODULES_DIR/node_modules/express" ]; then
  echo "📦 Installing node_modules to Linux filesystem (first run)..."
  mkdir -p "$LINUX_MODULES_DIR"
  cp "$BACKEND_DIR/package.json" "$LINUX_MODULES_DIR/"
  npm install --prefix "$LINUX_MODULES_DIR"
fi

# Step 2: Copy the latest compiled dist/ from the NTFS project path
echo "📋 Copying latest dist/ files..."
cp -r "$BACKEND_DIR/dist" "$LINUX_MODULES_DIR/"
cp "$BACKEND_DIR/package.json" "$LINUX_MODULES_DIR/"

# Step 3: Copy .env if it exists
if [ -f "$BACKEND_DIR/../.env" ]; then
  cp "$BACKEND_DIR/../.env" "$LINUX_MODULES_DIR/"
fi

# Step 4: Start the server
echo "🚀 Starting backend server on port 4000..."
cd "$LINUX_MODULES_DIR" && node dist/index.js
