#!/bin/bash
# Reset the database and run the crawler

# Make sure we're in the right directory
cd "$(dirname "$0")" || exit 1

# Reset the database
echo "Resetting database..."
python3 src/reset_db.py --force

# Run the crawler
echo "Running crawler..."
python3 src/main.py "$@"

echo "Done!" 