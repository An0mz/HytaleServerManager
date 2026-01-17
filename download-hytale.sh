#!/bin/bash

# Hytale Server Files Downloader
# This script helps download the required Hytale server files

CACHE_DIR="${HYTALE_CACHE_PATH:-/app/cache/hytale}"

echo "🎮 Hytale Server Files Downloader"
echo "=================================="
echo ""
echo "Cache Directory: $CACHE_DIR"
echo ""

# Create cache directory
mkdir -p "$CACHE_DIR"

echo "📥 Downloading Hytale files..."
echo ""

# Check if files already exist
if [ -f "$CACHE_DIR/HytaleServer.jar" ] && [ -f "$CACHE_DIR/Assets.zip" ]; then
    echo "✅ Files already exist in cache!"
    echo "   - HytaleServer.jar: $(ls -lh "$CACHE_DIR/HytaleServer.jar" | awk '{print $5}')"
    echo "   - Assets.zip: $(ls -lh "$CACHE_DIR/Assets.zip" | awk '{print $5}')"
    echo ""
    read -p "Re-download? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping download."
        exit 0
    fi
fi

echo ""
echo "⚠️  MANUAL DOWNLOAD REQUIRED"
echo "==============================="
echo ""
echo "The Hytale Server Manager cannot automatically download"
echo "server files yet. Please follow these steps:"
echo ""
echo "1. Visit: https://downloader.hytale.com/"
echo "   Download: hytale-downloader.zip"
echo ""
echo "2. Extract and run the Hytale downloader"
echo ""
echo "3. Locate the downloaded files:"
echo "   - HytaleServer.jar"
echo "   - Assets.zip"
echo ""
echo "4. Copy them to this directory:"
echo "   $CACHE_DIR"
echo ""
echo "5. Files will then be automatically used for all servers"
echo ""
echo "Commands to copy (once you have the files):"
echo "   cp /path/to/HytaleServer.jar $CACHE_DIR/"
echo "   cp /path/to/Assets.zip $CACHE_DIR/"
echo ""
echo "📝 Note: Once cached, all future servers will use these files!"
echo ""

# Offer to open the download page
if command -v xdg-open &> /dev/null; then
    read -p "Open download page in browser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open "https://downloader.hytale.com/" 2>/dev/null
    fi
elif command -v open &> /dev/null; then
    read -p "Open download page in browser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "https://downloader.hytale.com/" 2>/dev/null
    fi
fi

echo ""
echo "After copying files, verify with:"
echo "   ls -lh $CACHE_DIR"
echo ""
