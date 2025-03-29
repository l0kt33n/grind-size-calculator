#!/bin/bash

# Fetch and cache pages without processing

# Set up error handling
set -e

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

# Parse arguments
REFRESH_CACHE=false
ARGS=()

for arg in "$@"; do
    if [ "$arg" = "c" ] || [ "$arg" = "clean" ]; then
        REFRESH_CACHE=true
    else
        ARGS+=("$arg")
    fi
done

# Create and activate virtual environment if it doesn't exist
VENV_DIR="venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv $VENV_DIR
fi

# Activate the virtual environment
echo "Activating virtual environment..."
source $VENV_DIR/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Run the crawler in fetch-only mode with any provided arguments
echo "Fetching and caching web pages..."
if [ "$REFRESH_CACHE" = true ]; then
    echo "Clean mode enabled: Ignoring existing cache and refetching all pages."
    python src/main.py --fetch-only --refresh-cache "${ARGS[@]}"
else
    echo "Using existing cache when available (use 'c' or 'clean' to ignore cache)."
    python src/main.py --fetch-only "${ARGS[@]}"
fi

# Check if the fetching completed successfully
if [ $? -eq 0 ]; then
    echo "All pages have been fetched and cached successfully."
    echo "You can now run process_only.sh to process the cached pages."
else
    echo "Fetching failed. Check the logs for errors."
    exit 1
fi

# Deactivate the virtual environment
deactivate 