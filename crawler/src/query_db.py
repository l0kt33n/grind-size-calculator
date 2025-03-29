#!/usr/bin/env python3
"""
Database Query Utility for Coffee Grinder Data

This script provides utilities to query the coffee grinder database.
"""

import sqlite3
import json
import argparse
import sys
import tabulate

# Constants
DB_PATH = "coffee_grinders.db"

def connect_db():
    """Connect to the SQLite database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # This enables column access by name
        return conn
    except sqlite3.Error as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def list_grinders():
    """List all grinders in the database."""
    conn = connect_db()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT id, name, min_microns, max_microns 
            FROM grinders 
            ORDER BY name
        """)
        
        rows = cur.fetchall()
        
        if not rows:
            print("No grinders found in the database.")
            return
        
        # Prepare data for tabulate
        headers = ["ID", "Name", "Min Microns", "Max Microns"]
        table_data = [[row['id'], row['name'], row['min_microns'], row['max_microns']] for row in rows]
        
        # Print the table
        print(tabulate.tabulate(table_data, headers=headers, tablefmt="grid"))
        print(f"\nTotal: {len(rows)} grinders")
        
    except sqlite3.Error as e:
        print(f"Error querying database: {e}")
    finally:
        conn.close()

def show_grinder_details(grinder_id):
    """
    Show detailed information about a specific grinder.
    
    Args:
        grinder_id (int): ID of the grinder to show
    """
    conn = connect_db()
    cur = conn.cursor()
    
    try:
        # Get grinder details
        cur.execute("""
            SELECT id, name, min_microns, max_microns, top_legend_json, url, micron_scale_json
            FROM grinders
            WHERE id = ?
        """, (grinder_id,))
        
        grinder = cur.fetchone()
        
        if not grinder:
            print(f"No grinder found with ID {grinder_id}")
            return
        
        # Get brew methods for this grinder
        cur.execute("""
            SELECT method_name, start_microns, end_microns, start_setting, end_setting, setting_format, grind_category
            FROM brew_methods
            WHERE grinder_id = ?
            ORDER BY start_microns
        """, (grinder_id,))
        
        brew_methods = cur.fetchall()
        
        # Print grinder details
        print("\n" + "=" * 80)
        print(f"GRINDER: {grinder['name']}")
        print("=" * 80)
        print(f"Min Microns: {grinder['min_microns']}")
        print(f"Max Microns: {grinder['max_microns']}")
        print(f"URL: {grinder['url']}")
        
        # Print top legend (grinder settings)
        if grinder['top_legend_json']:
            top_legend = json.loads(grinder['top_legend_json'])
            if top_legend:
                print("\nGrinder Settings Scale:")
                print(" | ".join(top_legend))
        
        # Print micron scale if available
        if grinder['micron_scale_json']:
            micron_scale = json.loads(grinder['micron_scale_json'])
            if micron_scale and 'scale_points' in micron_scale:
                print("\nMicron Scale Points:")
                print(" | ".join(str(point) for point in micron_scale['scale_points']))
                
            # Print grind categories if available
            if micron_scale and 'grind_categories' in micron_scale:
                print("\nGrind Categories:")
                for category, (min_val, max_val) in micron_scale['grind_categories'].items():
                    print(f"{category}: {min_val} - {max_val} microns")
        
        # Print brew methods
        if brew_methods:
            print("\nBrew Methods:")
            headers = ["Method", "Microns Range", "Grinder Settings", "Format", "Grind Category"]
            table_data = []
            for bm in brew_methods:
                microns_range = f"{bm['start_microns']} - {bm['end_microns']}" if bm['start_microns'] and bm['end_microns'] else "Unknown"
                settings_range = f"{bm['start_setting']} - {bm['end_setting']}" if bm['start_setting'] and bm['end_setting'] else "Unknown"
                grind_category = bm['grind_category'] if bm['grind_category'] else "Unknown"
                table_data.append([bm['method_name'], microns_range, settings_range, bm['setting_format'], grind_category])
            print(tabulate.tabulate(table_data, headers=headers, tablefmt="grid"))
        else:
            print("\nNo brew methods found for this grinder.")
        
    except sqlite3.Error as e:
        print(f"Error querying database: {e}")
    finally:
        conn.close()

def search_grinders(search_term):
    """
    Search for grinders by name.
    
    Args:
        search_term (str): Term to search for in grinder names
    """
    conn = connect_db()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT id, name, min_microns, max_microns 
            FROM grinders 
            WHERE name LIKE ?
            ORDER BY name
        """, (f"%{search_term}%",))
        
        rows = cur.fetchall()
        
        if not rows:
            print(f"No grinders found matching '{search_term}'")
            return
        
        # Prepare data for tabulate
        headers = ["ID", "Name", "Min Microns", "Max Microns"]
        table_data = [[row['id'], row['name'], row['min_microns'], row['max_microns']] for row in rows]
        
        # Print the table
        print(tabulate.tabulate(table_data, headers=headers, tablefmt="grid"))
        print(f"\nFound {len(rows)} grinders matching '{search_term}'")
        
    except sqlite3.Error as e:
        print(f"Error querying database: {e}")
    finally:
        conn.close()

def list_brew_methods():
    """List all unique brew methods in the database."""
    conn = connect_db()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT DISTINCT method_name
            FROM brew_methods
            ORDER BY method_name
        """)
        
        rows = cur.fetchall()
        
        if not rows:
            print("No brew methods found in the database.")
            return
        
        print("\nBrew Methods:")
        for row in rows:
            print(f"- {row['method_name']}")
        
        print(f"\nTotal: {len(rows)} unique brew methods")
        
    except sqlite3.Error as e:
        print(f"Error querying database: {e}")
    finally:
        conn.close()

def find_grinders_for_brew_method(method_name):
    """
    Find grinders suitable for a specific brew method.
    
    Args:
        method_name (str): Name of the brew method to search for
    """
    conn = connect_db()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT g.id, g.name, g.min_microns, g.max_microns, 
                   bm.start_microns, bm.end_microns, bm.start_setting, bm.end_setting, bm.setting_format, bm.grind_category
            FROM grinders g
            JOIN brew_methods bm ON g.id = bm.grinder_id
            WHERE bm.method_name LIKE ?
            ORDER BY g.name
        """, (f"%{method_name}%",))
        
        rows = cur.fetchall()
        
        if not rows:
            print(f"No grinders found for brew method '{method_name}'")
            return
        
        # Prepare data for tabulate
        headers = ["ID", "Grinder", "Microns Range", "Grinder Settings", "Format", "Grind Category"]
        table_data = []
        for row in rows:
            microns_range = f"{row['start_microns']} - {row['end_microns']}" if row['start_microns'] and row['end_microns'] else "Unknown"
            settings_range = f"{row['start_setting']} - {row['end_setting']}" if row['start_setting'] and row['end_setting'] else "Unknown"
            grind_category = row['grind_category'] if row['grind_category'] else "Unknown"
            table_data.append([
                row['id'], 
                row['name'], 
                microns_range,
                settings_range,
                row['setting_format'],
                grind_category
            ])
        
        # Print the table
        print(tabulate.tabulate(table_data, headers=headers, tablefmt="grid"))
        print(f"\nFound {len(rows)} grinders for brew method '{method_name}'")
        
    except sqlite3.Error as e:
        print(f"Error querying database: {e}")
    finally:
        conn.close()

def main():
    """Main function to handle command-line arguments."""
    parser = argparse.ArgumentParser(description="Query the coffee grinder database")
    
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # List grinders command
    list_parser = subparsers.add_parser("list", help="List all grinders")
    
    # Show grinder details command
    show_parser = subparsers.add_parser("show", help="Show details for a specific grinder")
    show_parser.add_argument("id", type=int, help="ID of the grinder to show")
    
    # Search grinders command
    search_parser = subparsers.add_parser("search", help="Search for grinders by name")
    search_parser.add_argument("term", help="Search term")
    
    # List brew methods command
    methods_parser = subparsers.add_parser("methods", help="List all unique brew methods")
    
    # Find grinders for brew method command
    find_parser = subparsers.add_parser("find", help="Find grinders for a specific brew method")
    find_parser.add_argument("method", help="Brew method name")
    
    args = parser.parse_args()
    
    # Execute the appropriate command
    if args.command == "list":
        list_grinders()
    elif args.command == "show":
        show_grinder_details(args.id)
    elif args.command == "search":
        search_grinders(args.term)
    elif args.command == "methods":
        list_brew_methods()
    elif args.command == "find":
        find_grinders_for_brew_method(args.method)
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 