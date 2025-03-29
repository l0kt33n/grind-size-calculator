#!/bin/bash

# Process cached pages without fetching new ones

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

# Check if the cache directory exists
if [ ! -d "page_cache" ]; then
    echo "Error: No cache directory found. Run fetch_only.sh first."
    exit 1
fi

# Run the crawler in process-only mode with any provided arguments
echo "Processing cached pages..."
python src/main.py --process-only "$@"

# If the processing completed successfully, show some basic stats
if [ $? -eq 0 ]; then
    echo -e "\n===== PROCESSING COMPLETED SUCCESSFULLY =====\n"
    
    # List all grinders
    echo "Listing all grinders in the database:"
    python src/query_db.py list
    
    # List all brew methods
    echo -e "\nListing all brew methods in the database:"
    python src/query_db.py methods
    
    echo -e "\nYou can use the query utility to explore the data further:"
    echo "  python src/query_db.py show <id>     # Show details for a specific grinder"
    echo "  python src/query_db.py search <term> # Search for grinders by name"
    echo "  python src/query_db.py find <method> # Find grinders for a specific brew method"
else
    echo "Processing failed. Check the logs for errors."
    exit 1
fi

# Deactivate the virtual environment
deactivate 