#!/bin/bash
# Export coffee grinder data to JSON format
#
# This script exports grinder data with their brew methods from the database
# into a JSON file for use in web applications and other tools.
#
# Usage:
#   ./export_data.sh [options]
#
# Options:
#   --limit N        Limit to N grinders (default: 5, use 0 for all)
#   --methods N      Limit to N brew methods per grinder (default: 5, use 0 for all)
#   --output FILE    Output filename (default: coffee_data.json)
#   --full           Export complete dataset with no limits
#
# Examples:
#   ./export_data.sh --full --output coffee_data_complete.json
#   ./export_data.sh --limit 3 --methods 3 --output coffee_data_dev.json

# Make sure we're in the right directory
cd "$(dirname "$0")" || exit 1

# Check if virtual environment exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run the export tool with any provided arguments
python src/export.py "$@"

# Deactivate virtual environment if it was activated
if [ -n "$VIRTUAL_ENV" ]; then
    deactivate
fi 