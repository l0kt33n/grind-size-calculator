#!/usr/bin/env python3
"""
Export coffee grinder data to JSON format.

This script exports coffee grinder data from the SQLite database into a JSON file
with the following structure:

{
  "grinders": [
    {
      "id": 1,
      "name": "Grinder Name",
      "min_microns": 200.0,
      "max_microns": 1200.0,
      "url": "https://example.com/grinder",
      "clicks_per_number": 10,  # Added for 1Zpresso grinders
      "brew_methods": [
        {
          "id": 1,
          "grinder_id": 1,
          "method_name": "Method Name",
          "start_microns": 300.0,
          "end_microns": 600.0,
          "start_setting": "10",
          "end_setting": "15",
          "setting_format": "simple",
          "grind_category": "Medium Fine"
        },
        ...
      ]
    },
    ...
  ],
  "metadata": {
    "total_grinders": 10,
    "is_subset": true,
    "grinder_limit": 5,
    "methods_limit": 5
  }
}

By default, the script creates a smaller subset of the data (5 grinders with 5 brew methods each)
for development and testing purposes. Use the --full flag to export the complete dataset.
"""

import sqlite3
import json
import os
import argparse
from main import get_clicks_per_number  # Import the function to get clicks per number

def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Export coffee grinder data to JSON")
    parser.add_argument(
        "--limit", 
        type=int, 
        default=5,
        help="Limit the number of grinders to export (default: 5, use 0 for all)"
    )
    parser.add_argument(
        "--methods", 
        type=int, 
        default=5, 
        help="Limit the number of brew methods per grinder (default: 5, use 0 for all)"
    )
    parser.add_argument(
        "--output", 
        type=str, 
        default="coffee_data.json",
        help="Output JSON file name (default: coffee_data.json)"
    )
    parser.add_argument(
        "--full", 
        action="store_true",
        help="Export the full dataset with no limits"
    )
    return parser.parse_args()

def main():
    args = parse_args()
    
    # Use full export if requested
    if args.full:
        args.limit = 0
        args.methods = 0
    
    # Connect to the database
    DB_PATH = "coffee_grinders.db"
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file {DB_PATH} not found.")
        return 1
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    
    # Create the export data structure
    export_data = {
        "grinders": []
    }
    
    # Get most popular grinders first (those with the most brew methods)
    cursor = conn.cursor()
    
    if args.limit > 0:
        # Get limited number of popular grinders
        cursor.execute("""
            SELECT g.id, g.name, COUNT(b.id) as method_count 
            FROM grinders g
            LEFT JOIN brew_methods b ON g.id = b.grinder_id
            GROUP BY g.id
            ORDER BY method_count DESC, g.name
            LIMIT ?
        """, (args.limit,))
        grinder_ids = [row['id'] for row in cursor.fetchall()]
        
        # Fetch the selected grinders
        placeholders = ','.join(['?'] * len(grinder_ids))
        cursor.execute(f"SELECT * FROM grinders WHERE id IN ({placeholders})", grinder_ids)
    else:
        # Get all grinders
        cursor.execute("SELECT * FROM grinders ORDER BY name")
    
    grinders = cursor.fetchall()
    
    # Export each grinder
    for grinder in grinders:
        grinder_id = grinder['id']
        grinder_data = dict(grinder)
        
        # Add clicks_per_number for 1Zpresso grinders
        grinder_data['clicks_per_number'] = get_clicks_per_number(grinder_data['name'])
        
        # Get brew methods for this grinder
        if args.methods > 0:
            cursor.execute("""
                SELECT * FROM brew_methods 
                WHERE grinder_id = ?
                ORDER BY method_name
                LIMIT ?
            """, (grinder_id, args.methods))
        else:
            cursor.execute("SELECT * FROM brew_methods WHERE grinder_id = ? ORDER BY method_name", (grinder_id,))
            
        brew_methods = cursor.fetchall()
        
        # Add brew methods to the grinder data
        grinder_data['brew_methods'] = [dict(method) for method in brew_methods]
        
        # Add to export data
        export_data['grinders'].append(grinder_data)
    
    # Add metadata about the export
    export_data['metadata'] = {
        'total_grinders': len(export_data['grinders']),
        'is_subset': args.limit > 0 or args.methods > 0,
        'grinder_limit': args.limit if args.limit > 0 else None,
        'methods_limit': args.methods if args.methods > 0 else None
    }
    
    # Save to JSON file
    with open(args.output, 'w') as f:
        json.dump(export_data, f, indent=2)
    
    print(f"Exported {len(export_data['grinders'])} grinders to {args.output}")
    
    if args.limit > 0 or args.methods > 0:
        print("Note: This is a subset of the full data. Use --full to export the complete dataset.")
    
    return 0

if __name__ == "__main__":
    exit(main())