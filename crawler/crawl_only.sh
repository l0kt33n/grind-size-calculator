#!/bin/bash

# Run only the crawler part without the query utility
# Useful for automation or scheduled tasks

# Set up error handling
set -e

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

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

# Run the crawler with any provided arguments
echo "Running the coffee grinder crawler..."
python src/main.py "$@"

# Check if the crawler completed successfully
if [ $? -eq 0 ]; then
    echo "Crawler completed successfully."
else
    echo "Crawler failed. Check the logs for errors."
    exit 1
fi

# Deactivate the virtual environment
deactivate 