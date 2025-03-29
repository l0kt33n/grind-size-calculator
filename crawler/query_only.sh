#!/bin/bash

# Run only the query utility without running the crawler
# Useful for exploring the database after it has been populated

# Set up error handling
set -e

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

# Check if the database exists
if [ ! -f "coffee_grinders.db" ]; then
    echo "Error: Database file 'coffee_grinders.db' not found."
    echo "Please run the crawler first using './run_crawler.sh' or './crawl_only.sh'"
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

# Display usage information if no arguments provided
if [ $# -eq 0 ]; then
    echo "Coffee Grinder Database Query Utility"
    echo "===================================="
    echo "Usage: ./query_only.sh [command] [arguments]"
    echo ""
    echo "Available commands:"
    echo "  list                  List all grinders"
    echo "  show [id]             Show details for a specific grinder"
    echo "  search [term]         Search for grinders by name"
    echo "  methods               List all unique brew methods"
    echo "  find [method]         Find grinders for a specific brew method"
    echo ""
    echo "Examples:"
    echo "  ./query_only.sh list"
    echo "  ./query_only.sh show 1"
    echo "  ./query_only.sh search Baratza"
    echo "  ./query_only.sh methods"
    echo "  ./query_only.sh find espresso"
else
    # Run the query utility with the provided arguments
    python src/query_db.py "$@"
fi

# Deactivate the virtual environment
deactivate 