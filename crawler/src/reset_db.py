#!/usr/bin/env python3
"""
Script to reset and reinitialize the database.
"""

import os
import sys
import logging
import argparse
import sqlite3

# Add the parent directory to Python path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.main import DB_PATH, init_db

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Reset the coffee grinder database")
    
    parser.add_argument("--backup", action="store_true", 
                       help="Create a backup of the existing database before resetting")
    
    parser.add_argument("--force", action="store_true",
                       help="Force reset without confirmation")
    
    return parser.parse_args()

def main():
    """
    Main function to reset the database.
    """
    args = parse_args()
    
    # Check if database exists
    if not os.path.exists(DB_PATH):
        logger.info(f"Database file not found at {DB_PATH}")
        logger.info("Creating new database...")
        conn = init_db()
        if conn:
            conn.close()
            logger.info("Database initialized successfully")
        return
    
    # Confirm reset unless --force is used
    if not args.force:
        confirm = input(f"This will reset the database at {DB_PATH}. Continue? (y/n): ")
        if confirm.lower() != 'y':
            logger.info("Database reset canceled")
            return
    
    # Create backup if requested
    if args.backup:
        backup_path = f"{DB_PATH}.backup"
        logger.info(f"Creating backup at {backup_path}")
        try:
            import shutil
            shutil.copy2(DB_PATH, backup_path)
            logger.info(f"Backup created at {backup_path}")
        except Exception as e:
            logger.error(f"Failed to create backup: {e}")
            if not args.force:
                return
    
    # Delete and recreate the database
    try:
        os.remove(DB_PATH)
        logger.info(f"Removed existing database file: {DB_PATH}")
    except Exception as e:
        logger.error(f"Failed to remove database file: {e}")
        return
    
    # Initialize new database
    conn = init_db()
    if conn:
        conn.close()
        logger.info("Database reinitialized successfully")
    else:
        logger.error("Failed to initialize new database")

if __name__ == "__main__":
    main() 