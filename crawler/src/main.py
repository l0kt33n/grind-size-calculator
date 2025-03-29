#!/usr/bin/env python3
"""
Coffee grinder data crawler to extract information about grind sizes and settings.
"""

import os
import re
import json
import time
import random
import logging
import argparse
import sqlite3
import sys
import hashlib
import requests
from bs4 import BeautifulSoup
from pathlib import Path
from urllib.parse import urljoin

# Add the src directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Constants
BASE_URL = "https://honestcoffeeguide.com"
CHART_URL = f"{BASE_URL}/coffee-grind-size-chart/"
DB_PATH = "coffee_grinders.db"
CACHE_DIR = "page_cache"  # Directory to store cached pages
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}
REQUEST_DELAY = 0.5  # Delay between requests in seconds

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Standard micron ranges for different brew methods
STANDARD_BREW_METHODS = {
    "turkish": {"name": "Turkish", "min_microns": 40, "max_microns": 220, "grind_category": "Extra Fine"},
    "espresso": {"name": "Espresso", "min_microns": 180, "max_microns": 380, "grind_category": "Fine"},
    "filter coffee machine": {"name": "Filter Coffee Machine", "min_microns": 300, "max_microns": 900, "grind_category": "Medium Fine"},
    "aeropress": {"name": "AeroPress", "min_microns": 320, "max_microns": 960, "grind_category": "Medium Fine"},
    "siphon": {"name": "Siphon", "min_microns": 375, "max_microns": 800, "grind_category": "Medium Fine"},
    "v60": {"name": "V60", "min_microns": 400, "max_microns": 700, "grind_category": "Medium Fine"},
    "pour-over": {"name": "Pour-over", "min_microns": 410, "max_microns": 930, "grind_category": "Medium Fine"},
    "pour over": {"name": "Pour Over", "min_microns": 410, "max_microns": 930, "grind_category": "Medium Fine"},
    "steep-and-release": {"name": "Steep-and-release", "min_microns": 450, "max_microns": 825, "grind_category": "Medium Fine"},
    "steep and release": {"name": "Steep and Release", "min_microns": 450, "max_microns": 825, "grind_category": "Medium Fine"},
    "cupping": {"name": "Cupping", "min_microns": 460, "max_microns": 850, "grind_category": "Medium"},
    "french press": {"name": "French Press", "min_microns": 690, "max_microns": 1300, "grind_category": "Medium Coarse"},
    "cold brew": {"name": "Cold Brew", "min_microns": 800, "max_microns": 1600, "grind_category": "Coarse"},
    "cold drip": {"name": "Cold Drip", "min_microns": 820, "max_microns": 1270, "grind_category": "Coarse"},
    "moka pot": {"name": "Moka Pot", "min_microns": 360, "max_microns": 660, "grind_category": "Medium Fine"}
}

# Standard grind categories based on micron ranges
GRIND_CATEGORIES = {
    'Extra Fine': (0, 200),
    'Fine': (200, 400),
    'Medium Fine': (400, 600),
    'Medium': (600, 800),
    'Medium Coarse': (800, 1000),
    'Coarse': (1000, 1200),
    'Extra Coarse': (1200, 1400)
}

# 1Zpresso grinder models and their clicks per number
ZPRESSO_CLICKS = {
    'Q': 3,  # Q2 models (Q2 S, Q2 Heptagonal/Pentagonal Burrs): 3 clicks per number
    'JE': 3,  # JE model: 3 clicks per number
    'J': 3,   # J model: 3 clicks per number
    'JX-PRO': 4,  # JX-Pro and JX-Pro S: 4 clicks per number
    'JX-PRO S': 4,  # Explicit match for JX-Pro S
    # All other 1Zpresso models use 10 clicks per number by default:
    # - J-Max and J-Max S: 10 clicks
    # - J-Ultra: 10 clicks
    # - X-Pro, X-Pro S, X-Ultra: 10 clicks
    # - K-Plus, K-Pro, K-Max, ZP6 Special: 10 clicks
    # - K-Ultra: 10 clicks
}

# Parse command-line arguments
def parse_args():
    """
    Parse command line arguments.
    
    Returns:
        argparse.Namespace: Parsed arguments
    """
    parser = argparse.ArgumentParser(description="Coffee grinder data crawler")
    
    parser.add_argument("--refresh-cache", action="store_true", 
                        help="Refresh the cached pages")
    
    parser.add_argument("--debug", action="store_true",
                        help="Enable debug logging")
    
    parser.add_argument("--limit", type=int, default=0,
                        help="Limit the number of grinders to process")
    
    parser.add_argument("--reset-db", action="store_true",
                        help="Reset the database before processing")
    
    return parser.parse_args()

def ensure_cache_dir():
    """Ensure the cache directory exists."""
    cache_path = Path(CACHE_DIR)
    if not cache_path.exists():
        logger.info(f"Creating cache directory: {CACHE_DIR}")
        cache_path.mkdir(parents=True)
    return cache_path

def get_cache_filename(url):
    """
    Generate a safe filename for caching based on the URL.
    
    Args:
        url (str): The URL to generate a cache filename for
        
    Returns:
        Path: Path object for the cache file
    """
    # Create a hash of the URL to use as the filename
    url_hash = hashlib.md5(url.encode()).hexdigest()
    return Path(CACHE_DIR) / f"{url_hash}.html"

def fetch_url(url, refresh_cache=False):
    """
    Fetch a URL, using cached version if available.
    
    Args:
        url (str): URL to fetch
        refresh_cache (bool): Whether to bypass cache and refresh
        
    Returns:
        str: HTML content of the page
    """
    # Ensure cache directory exists
    ensure_cache_dir()
    
    cache_file = get_cache_filename(url)
    
    # Check if cached version exists
    if not refresh_cache and cache_file.exists():
        logger.debug(f"Loading from cache: {url}")
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.warning(f"Error reading cache for {url}: {e}")
    
    # Fetch from the web
    logger.debug(f"Fetching from web: {url}")
    try:
        r = requests.get(url, headers=HEADERS)
        r.raise_for_status()
        
        # Save to cache
        with open(cache_file, 'w', encoding='utf-8') as f:
            f.write(r.text)
            
        return r.text
    except requests.RequestException as e:
        logger.error(f"Error fetching {url}: {e}")
        return None

def init_db():
    """
    Initialize the database with the required tables.
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Create the grinders table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS grinders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                min_microns REAL,
                max_microns REAL,
                url TEXT
            )
        ''')
        
        # Create the brew_methods table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS brew_methods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                grinder_id INTEGER,
                method_name TEXT NOT NULL,
                start_microns REAL,
                end_microns REAL,
                start_setting TEXT,
                end_setting TEXT,
                setting_format TEXT,
                grind_category TEXT,
                FOREIGN KEY (grinder_id) REFERENCES grinders (id),
                UNIQUE (grinder_id, method_name)
            )
        ''')
        
        # Create an index on method_name for faster lookups
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_brew_methods_name 
            ON brew_methods (method_name)
        ''')
        
        # Check if grind_category column exists in brew_methods
        cursor.execute("PRAGMA table_info(brew_methods)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        if 'grind_category' not in column_names:
            cursor.execute('''
                ALTER TABLE brew_methods ADD COLUMN grind_category TEXT
            ''')
            logger.info("Added grind_category column to brew_methods table")
        
        conn.commit()
        logger.info("Database initialized successfully")
        return conn
    except sqlite3.Error as e:
        logger.error(f"Database initialization error: {e}")
        if conn:
            conn.rollback()
        return None

def get_grinder_links():
    """
    Fetch the list of grinder links from the main chart page.
    
    Returns:
        list: A list of URLs to individual grinder pages
    """
    logger.info(f"Fetching grinder links from {CHART_URL}")
    
    try:
        html_content = fetch_url(CHART_URL)
        if not html_content:
            logger.error("Failed to fetch chart page")
            return []
        
        soup = BeautifulSoup(html_content, "lxml")
        
        # Find the container with grinder links
        # This selector might need adjustment based on the actual page structure
        links = []
        
        # Look for the div containing the grinder links
        # Based on the instructions, it should be in div[6] of the article
        article = soup.select_one("body > div > main > article")
        if article:
            # Try to find the div containing the links
            divs = article.find_all("div", recursive=False)
            if len(divs) >= 6:
                link_container = divs[5]  # 0-indexed, so div[6] is at index 5
                
                # Extract all links from this container
                for a_tag in link_container.find_all("a", href=True):
                    link = a_tag["href"]
                    # Ensure we have absolute URLs
                    if not link.startswith(("http://", "https://")):
                        link = urljoin(BASE_URL, link)
                    links.append(link)
        
        if not links:
            # Fallback: try to find links by looking for patterns in the href
            logger.warning("Could not find links in the expected container, trying fallback method")
            for a_tag in soup.find_all("a", href=True):
                href = a_tag["href"]
                # Look for links that likely point to grinder pages
                if "grind-settings" in href or "burrs" in href:
                    # Ensure we have absolute URLs
                    if not href.startswith(("http://", "https://")):
                        href = urljoin(BASE_URL, href)
                    if href not in links:
                        links.append(href)
        
        logger.info(f"Found {len(links)} grinder links")
        return links
    
    except Exception as e:
        logger.error(f"Error fetching grinder links: {e}")
        return []

def extract_min_max_microns(text):
    """
    Extract minimum and maximum micron values from text.
    
    Args:
        text (str): Text containing micron information
        
    Returns:
        tuple: (min_microns, max_microns) or (None, None) if not found
    """
    # Try different regex patterns to match various formats
    patterns = [
        r"(\d+)\s*microns?\s*to\s*(\d+)\s*microns?",  # "400 microns to 1400 microns"
        r"from\s*(\d+)\s*to\s*(\d+)\s*microns?",      # "from 400 to 1400 microns"
        r"range\s*of\s*(\d+)\s*to\s*(\d+)\s*microns?", # "range of 400 to 1400 microns"
        r"between\s*(\d+)\s*and\s*(\d+)\s*microns?",   # "between 400 and 1400 microns"
        r"between\s*a\s*range\s*of\s*(\d+)\s*[–-]\s*(\d+)\s*microns?", # "between a range of 0 – 1090 microns"
        r"range\s*of\s*(\d+)\s*[–-]\s*(\d+)\s*microns?", # "range of 0 – 1090 microns"
        r"(\d+)\s*[–-]\s*(\d+)\s*microns?"  # "0 – 1090 microns"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                min_val = int(match.group(1))
                max_val = int(match.group(2))
                logger.debug(f"Extracted microns: {min_val} to {max_val} from text: '{text}'")
                return min_val, max_val
            except (ValueError, IndexError):
                continue
    
    logger.debug(f"No micron values found in text: '{text}'")
    return None, None

def get_clicks_per_number(grinder_name):
    """
    Get the number of clicks per number for a specific grinder model.
    
    Args:
        grinder_name (str): Name of the grinder
        
    Returns:
        int: Number of clicks per number (default 10 for most models)
    """
    grinder_upper = grinder_name.upper()
    if '1ZPRESSO' in grinder_upper or 'ZPRESSO' in grinder_upper:
        for model, clicks in ZPRESSO_CLICKS.items():
            if model in grinder_upper:
                return clicks
        return 10  # Default for other 1Zpresso models
    return 10  # Default for non-1Zpresso models

def map_setting_to_microns(setting, min_setting, max_setting, min_microns, max_microns, setting_format="simple", grinder_name=""):
    """
    Map a grinder setting to the corresponding micron value.
    
    Args:
        setting: The grinder setting (int for simple, string for complex)
        min_setting: The minimum grinder setting
        max_setting: The maximum grinder setting
        min_microns: The minimum micron value of the grinder
        max_microns: The maximum micron value of the grinder
        setting_format: The format of the setting ("simple" or "complex")
        grinder_name: Name of the grinder (for 1Zpresso click calculations)
        
    Returns:
        int: The corresponding micron value
    """
    if setting_format == "simple":
        # For simple settings (clicks), do a linear interpolation
        if isinstance(setting, str):
            setting = int(setting)
        if isinstance(min_setting, str):
            min_setting = int(min_setting)
        if isinstance(max_setting, str):
            max_setting = int(max_setting)
        
        # Calculate the ratio of the setting in the range
        setting_range = max_setting - min_setting
        if setting_range <= 0:
            logger.warning(f"Invalid setting range: {min_setting} to {max_setting}")
            return None
        
        ratio = (setting - min_setting) / setting_range
        # Map to the micron range
        micron_range = max_microns - min_microns
        return int(min_microns + (ratio * micron_range))
    
    elif setting_format == "complex":
        # For complex settings (e.g., "0.7.4"), convert to numerical representation
        
        # Parse complex settings (rotations.numbers.clicks)
        def parse_complex_setting(s):
            parts = s.split('.')
            clicks_per_number = get_clicks_per_number(grinder_name)
            
            if len(parts) == 3:
                # Format: rotations.numbers.clicks
                rotations = int(parts[0])
                numbers = int(parts[1])
                clicks = int(parts[2])
                
                # Calculate total clicks based on grinder model
                total_clicks = (rotations * 10 * clicks_per_number) + (numbers * clicks_per_number) + clicks
                return total_clicks
            elif len(parts) == 2:
                # Format: rotations.clicks
                rotations = int(parts[0])
                clicks = int(parts[1])
                # Example: 3.5 -> 3*10*clicks_per_number + 5
                return rotations * 10 * clicks_per_number + clicks
            else:
                logger.warning(f"Cannot parse complex setting: {s}")
                return 0
        
        # Convert settings to numerical values
        setting_num = parse_complex_setting(setting)
        min_setting_num = parse_complex_setting(min_setting)
        max_setting_num = parse_complex_setting(max_setting)
        
        # Calculate ratio and map to microns
        setting_range = max_setting_num - min_setting_num
        if setting_range <= 0:
            logger.warning(f"Invalid complex setting range: {min_setting} to {max_setting}")
            return None
        
        ratio = (setting_num - min_setting_num) / setting_range
        micron_range = max_microns - min_microns
        return int(min_microns + (ratio * micron_range))
    
    else:
        logger.warning(f"Unsupported setting format: {setting_format}")
        return None

def map_microns_to_setting(microns, min_setting, max_setting, min_microns, max_microns, setting_format="simple", grinder_name=""):
    """
    Map a micron value to the corresponding grinder setting.
    
    Args:
        microns: The target micron value
        min_setting: The minimum grinder setting
        max_setting: The maximum grinder setting
        min_microns: The minimum micron value of the grinder
        max_microns: The maximum micron value of the grinder
        setting_format: The format of the setting ("simple" or "complex")
        grinder_name: Name of the grinder (for 1Zpresso click calculations)
        
    Returns:
        The corresponding grinder setting (int for simple, string for complex)
    """
    # Calculate what proportion of the micron range this value is
    micron_range = max_microns - min_microns
    if micron_range <= 0:
        logger.warning(f"Invalid micron range: {min_microns} to {max_microns}")
        return None
    
    ratio = (microns - min_microns) / micron_range
    
    if setting_format == "simple":
        # For simple settings (clicks), convert the ratio to an integer
        if isinstance(min_setting, str):
            min_setting = int(min_setting)
        if isinstance(max_setting, str):
            max_setting = int(max_setting)
        
        setting_range = max_setting - min_setting
        setting_value = min_setting + round(ratio * setting_range)
        return setting_value
    
    elif setting_format == "complex":
        # Parse complex settings (rotations.numbers.clicks)
        def parse_complex_setting(s):
            parts = s.split('.')
            clicks_per_number = get_clicks_per_number(grinder_name)
            
            if len(parts) == 3:
                # Format: rotations.numbers.clicks
                rotations = int(parts[0])
                numbers = int(parts[1])
                clicks = int(parts[2])
                total_clicks = (rotations * 10 * clicks_per_number) + (numbers * clicks_per_number) + clicks
                return rotations, numbers, clicks, total_clicks
            elif len(parts) == 2:
                # Format: rotations.clicks
                rotations = int(parts[0])
                clicks = int(parts[1])
                total_clicks = rotations * 10 * clicks_per_number + clicks
                return rotations, 0, clicks, total_clicks
            else:
                logger.warning(f"Cannot parse complex setting: {s}")
                return 0, 0, 0, 0
        
        # Get numerical values for min and max settings
        _, _, _, min_setting_num = parse_complex_setting(min_setting)
        _, _, _, max_setting_num = parse_complex_setting(max_setting)
        
        # Calculate the target numerical value
        setting_range = max_setting_num - min_setting_num
        target_clicks = min_setting_num + round(ratio * setting_range)
        
        # Format based on the pattern of min/max settings
        min_parts = min_setting.split('.')
        max_parts = max_setting.split('.')
        clicks_per_number = get_clicks_per_number(grinder_name)
        
        if len(min_parts) == 3 and len(max_parts) == 3:
            # Format: rotations.numbers.clicks
            rotations = target_clicks // (10 * clicks_per_number)
            remaining_clicks = target_clicks % (10 * clicks_per_number)
            numbers = remaining_clicks // clicks_per_number
            clicks = remaining_clicks % clicks_per_number
            return f"{rotations}.{numbers}.{clicks}"
        elif len(min_parts) == 2 and len(max_parts) == 2:
            # Format: rotations.clicks
            rotations = target_clicks // (10 * clicks_per_number)
            clicks = target_clicks % (10 * clicks_per_number)
            return f"{rotations}.{clicks}"
        else:
            logger.warning("Inconsistent complex setting formats")
            return None
    
    else:
        logger.warning(f"Unsupported setting format: {setting_format}")
        return None

def parse_grinder_page(url, html_content=None):
    """
    Parse a grinder page to extract relevant information.
    
    Args:
        url (str): URL of the grinder page
        html_content (str, optional): HTML content if already fetched
        
    Returns:
        dict: Dictionary containing extracted grinder data
    """
    logger.info(f"Parsing grinder page: {url}")
    
    try:
        if not html_content:
            html_content = fetch_url(url)
            if not html_content:
                logger.error(f"Failed to fetch page: {url}")
                return None
        
        soup = BeautifulSoup(html_content, "lxml")
        
        # 1) Extract Grinder Name - Try multiple methods
        grinder_name = "Unknown Grinder"
        
        # Method 1: Try to get the title from the entry-title class
        title_el = soup.find("h1", class_="entry-title")
        if title_el and title_el.get_text(strip=True):
            grinder_name = title_el.get_text(strip=True)
        
        # Method 2: If that fails, try to extract from the URL
        if grinder_name == "Unknown Grinder" and url:
            # Extract from URL path like /baratza-vario-plus-grind-settings/
            path_parts = url.rstrip('/').split('/')[-1].split('-')
            if len(path_parts) >= 2:
                # Remove 'grind-settings' or similar suffix
                if 'grind' in path_parts:
                    grind_index = path_parts.index('grind')
                    path_parts = path_parts[:grind_index]
                # Convert to title case and join
                grinder_name = ' '.join(part.capitalize() for part in path_parts)
        
        # Method 3: Try to find the title in the page title
        if grinder_name == "Unknown Grinder":
            page_title = soup.find("title")
            if page_title:
                title_text = page_title.get_text(strip=True)
                # Extract the part before " - " or " | " if present
                if " - " in title_text:
                    grinder_name = title_text.split(" - ")[0].strip()
                elif " | " in title_text:
                    grinder_name = title_text.split(" | ")[0].strip()
        
        logger.info(f"Extracted grinder name: {grinder_name}")
        
        # 2) Extract the short paragraph for min/max microns
        min_microns, max_microns = None, None
        
        # Try to find paragraphs using the XPath: /html/body/div/main/article/section/div/p
        # In BeautifulSoup, we can navigate through the structure
        article_section = soup.select_one("body > div > main > article > section")
        if article_section:
            # Look for paragraphs in the section
            for div in article_section.find_all("div", recursive=False):
                for p in div.find_all("p", recursive=False):
                    paragraph_text = p.get_text(strip=True)
                    logger.debug(f"Checking paragraph: {paragraph_text}")
                    min_val, max_val = extract_min_max_microns(paragraph_text)
                    if min_val is not None and max_val is not None:
                        min_microns, max_microns = min_val, max_val
                        logger.info(f"Found microns in paragraph: {min_microns} to {max_microns}")
                        break
                if min_microns is not None and max_microns is not None:
                    break
        
        # If we couldn't find microns in the section, try all paragraphs
        if min_microns is None or max_microns is None:
            logger.debug("Trying all paragraphs for micron extraction")
            for p in soup.find_all("p"):
                paragraph_text = p.get_text(strip=True)
                min_val, max_val = extract_min_max_microns(paragraph_text)
                if min_val is not None and max_val is not None:
                    min_microns, max_microns = min_val, max_val
                    logger.info(f"Found microns in general paragraph: {min_microns} to {max_microns}")
                    break
        
        # 3) Extract brew methods from the table
        brew_methods = []
        
        # Look for tables with class "table-wrapper"
        table_wrappers = soup.find_all(class_="table-wrapper")
        for wrapper in table_wrappers:
            logger.debug(f"Found table wrapper: {wrapper}")
            
            # Find the table inside the wrapper
            table = wrapper.find("table")
            if not table:
                continue
                
            # Extract rows from the table
            rows = table.find_all("tr")
            if len(rows) <= 1:  # Skip if only header row or empty
                continue
                
            # Check if this is a brew method table by looking at the header
            header_row = rows[0]
            header_cells = header_row.find_all(["th", "td"])
            
            # Check if the header contains "Brew method" or similar
            is_brew_method_table = False
            for cell in header_cells:
                cell_text = cell.get_text(strip=True).lower()
                if "brew" in cell_text or "method" in cell_text:
                    is_brew_method_table = True
                    break
            
            if not is_brew_method_table:
                continue
                
            # Process data rows
            for row in rows[1:]:  # Skip header row
                cells = row.find_all(["th", "td"])
                if len(cells) < 2:
                    continue
                    
                # First cell is the brew method name
                method_name = cells[0].get_text(strip=True)
                
                # Second cell is the grind setting range (e.g., "5 – 22")
                setting_text = cells[1].get_text(strip=True)
                
                # Try to extract start and end values from the setting text
                start_setting = None
                end_setting = None
                setting_format = "simple"  # Can be "simple" or "complex"
                
                # Check for complex format like "0.1.6 – 0.8.3" (rotations.numbers.clicks)
                complex_match = re.search(r'(\d+\.\d+\.\d+)\s*[–-]\s*(\d+\.\d+\.\d+)', setting_text)
                if not complex_match:
                    # Try another pattern for formats like "0.6.9 – 1.5.3" (one digit per segment)
                    complex_match = re.search(r'(\d+\.\d+\.\d+|\d+\.\d+)\s*[–-]\s*(\d+\.\d+\.\d+|\d+\.\d+)', setting_text)
                
                if complex_match:
                    start_setting = complex_match.group(1)
                    end_setting = complex_match.group(2)
                    setting_format = "complex"
                    logger.debug(f"Found complex setting format: {start_setting} - {end_setting}")
                else:
                    # Check for simple format like "5 – 22" (clicks from zero)
                    simple_match = re.search(r'(\d+)\s*[–-]\s*(\d+)', setting_text)
                    if simple_match:
                        start_setting = int(simple_match.group(1))
                        end_setting = int(simple_match.group(2))
                        setting_format = "simple"
                        logger.debug(f"Found simple setting format: {start_setting} - {end_setting}")
                
                # Add to brew methods list
                brew_method = {
                    'method_name': method_name,
                    'start_microns': None,  # We'll set these based on standard ranges
                    'end_microns': None,
                    'start_setting': start_setting,
                    'end_setting': end_setting,
                    'setting_format': setting_format
                }
                
                # Try to match with standard brew methods and get micron ranges
                method_key = method_name.lower()
                for standard_key, standard_data in STANDARD_BREW_METHODS.items():
                    if standard_key in method_key or method_key in standard_key:
                        brew_method['start_microns'] = standard_data['min_microns']
                        brew_method['end_microns'] = standard_data['max_microns']
                        brew_method['grind_category'] = standard_data['grind_category']
                        break
                
                brew_methods.append(brew_method)
                logger.info(f"Found brew method from table: {method_name} ({start_setting} - {end_setting})")
        
        # Find min and max settings for the grinder
        min_setting = None
        max_setting = None
        setting_format = "simple"  # Default format
        
        # Find the minimum and maximum settings from all the brew methods
        for method in brew_methods:
            if method['start_setting'] is not None and method['end_setting'] is not None:
                if method['setting_format'] == 'simple':
                    try:
                        start_val = int(method['start_setting']) if isinstance(method['start_setting'], str) else method['start_setting']
                        end_val = int(method['end_setting']) if isinstance(method['end_setting'], str) else method['end_setting']
                        
                        if min_setting is None or start_val < min_setting:
                            min_setting = start_val
                            setting_format = 'simple'
                        if max_setting is None or end_val > max_setting:
                            max_setting = end_val
                    except (ValueError, TypeError):
                        logger.warning(f"Could not parse simple setting for {method['method_name']}: {method['start_setting']} - {method['end_setting']}")
                elif method['setting_format'] == 'complex':
                    # If any method has complex settings, flag the grinder as using complex format
                    setting_format = 'complex'
        
        # Handle complex settings if necessary
        if setting_format == 'complex':
            complex_settings = []
            for method in brew_methods:
                if method['setting_format'] == 'complex' and method['start_setting'] and method['end_setting']:
                    complex_settings.extend([method['start_setting'], method['end_setting']])
            
            if complex_settings:
                # Find min/max complex settings using numerical conversion
                def parse_complex_setting(s):
                    parts = s.split('.')
                    if len(parts) == 3:
                        rotations = int(parts[0])
                        numbers = int(parts[1])
                        clicks = int(parts[2])
                        return rotations * 100 + numbers * 10 + clicks
                    elif len(parts) == 2:
                        rotations = int(parts[0])
                        clicks = int(parts[1])
                        return rotations * 10 + clicks
                    else:
                        return 0
                
                if complex_settings:
                    numerical_values = [parse_complex_setting(s) for s in complex_settings]
                    min_setting = complex_settings[numerical_values.index(min(numerical_values))]
                    max_setting = complex_settings[numerical_values.index(max(numerical_values))]
                    logger.info(f"Found complex setting range: {min_setting} to {max_setting}")
        
        # If we have settings and min/max microns, calculate micron values for methods without them
        if min_setting is not None and max_setting is not None and min_microns is not None and max_microns is not None:
            for method in brew_methods:
                # Only calculate if we don't already have micron values
                if (method['start_microns'] is None or method['end_microns'] is None) and method['start_setting'] is not None and method['end_setting'] is not None:
                    format_to_use = method['setting_format']
                    method['start_microns'] = map_setting_to_microns(
                        method['start_setting'], min_setting, max_setting,
                        min_microns, max_microns, format_to_use, grinder_name
                    )
                    method['end_microns'] = map_setting_to_microns(
                        method['end_setting'], min_setting, max_setting,
                        min_microns, max_microns, format_to_use, grinder_name
                    )
                    
                    # Determine grind category based on micron values
                    if method['start_microns'] is not None and method['end_microns'] is not None:
                        mid_microns = (method['start_microns'] + method['end_microns']) / 2
                        for category, (min_cat, max_cat) in GRIND_CATEGORIES.items():
                            if min_cat <= mid_microns < max_cat:
                                method['grind_category'] = category
                                break
                        
                        # Handle edge cases
                        if mid_microns < GRIND_CATEGORIES['Extra Fine'][0]:
                            method['grind_category'] = 'Extra Fine'
                        elif mid_microns >= GRIND_CATEGORIES['Extra Coarse'][1]:
                            method['grind_category'] = 'Extra Coarse'
                
        return {
            'name': grinder_name,
            'min_microns': min_microns,
            'max_microns': max_microns,
            'brew_methods': brew_methods,
            'url': url
        }
    
    except Exception as e:
        logger.error(f"Error parsing grinder page {url}: {e}")
        return None

def fetch_all_pages(links, refresh_cache=False):
    """
    Fetch all grinder pages and cache them.
    
    Args:
        links (list): List of URLs to fetch
        refresh_cache (bool): Whether to refresh the cache
        
    Returns:
        int: Number of pages successfully fetched
    """
    logger.info(f"Fetching {len(links)} pages to cache")
    
    # Ensure cache directory exists
    ensure_cache_dir()
    
    success_count = 0
    for i, link in enumerate(links):
        logger.info(f"Fetching page {i+1}/{len(links)}: {link}")
        
        html_content = fetch_url(link, refresh_cache)
        if html_content:
            success_count += 1
        
        # Add a delay between requests to be polite
        if i < len(links) - 1:  # No need to delay after the last request
            time.sleep(REQUEST_DELAY)
    
    logger.info(f"Successfully fetched {success_count}/{len(links)} pages")
    return success_count

def process_cached_pages(links):
    """
    Process cached pages and save their data to the database.
    
    Args:
        links (list): List of URLs to process
        
    Returns:
        int: Number of pages successfully processed
    """
    logger.info(f"Processing {len(links)} cached pages")
    
    success_count = 0
    for i, link in enumerate(links):
        logger.info(f"Processing page {i+1}/{len(links)}: {link}")
        
        # Get cache filename
        cache_file = get_cache_filename(link)
        
        if not cache_file.exists():
            logger.warning(f"Cache file not found for {link}")
            continue
        
        try:
            # Read cached content
            with open(cache_file, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # Parse the page
            grinder_data = parse_grinder_page(link, html_content)
            
            if grinder_data:
                # Save the data to the database
                save_to_db(grinder_data)
                success_count += 1
            
        except Exception as e:
            logger.error(f"Error processing cached page {link}: {e}")
    
    logger.info(f"Successfully processed {success_count}/{len(links)} pages")
    return success_count

def save_to_db(conn, grinder_data):
    """
    Save the grinder data to the database.
    
    Args:
        conn: Database connection
        grinder_data (dict): Grinder data to save
        
    Returns:
        bool: True if saved successfully, False otherwise
    """
    try:
        cursor = conn.cursor()
        
        # Check if the grinder already exists based on name
        grinder_name = grinder_data.get('name')
        if not grinder_name:
            logger.error("Cannot save grinder without a name")
            return False
        
        cursor.execute("SELECT id FROM grinders WHERE name = ?", (grinder_name,))
        grinder_id = cursor.fetchone()
        
        # Insert or update the grinder record
        if grinder_id is None:
            # Insert new grinder
            cursor.execute(
                """
                INSERT INTO grinders (name, min_microns, max_microns, url)
                VALUES (?, ?, ?, ?)
                """,
                (
                    grinder_data.get('name', 'Unknown Grinder'),
                    grinder_data.get('min_microns'),
                    grinder_data.get('max_microns'),
                    grinder_data.get('url', '')
                )
            )
            grinder_id = cursor.lastrowid
            logger.info(f"Inserted new grinder {grinder_name} with ID {grinder_id}")
        else:
            # Update existing grinder
            grinder_id = grinder_id[0]
            cursor.execute(
                """
                UPDATE grinders 
                SET min_microns = ?, max_microns = ?, url = ?
                WHERE id = ?
                """,
                (
                    grinder_data.get('min_microns'),
                    grinder_data.get('max_microns'),
                    grinder_data.get('url', ''),
                    grinder_id
                )
            )
            logger.info(f"Updated existing grinder {grinder_name} with ID {grinder_id}")
        
        # Save brew methods
        for method in grinder_data.get('brew_methods', []):
            # Skip methods without useful data
            if not method.get('method_name'):
                continue
            
            # Find grind category from standard data or use a default
            method_key = method['method_name'].lower()
            grind_category = method.get('grind_category', 'Medium')  # Default to Medium
            
            # Ensure we have numeric values for min and max microns
            start_microns = method.get('start_microns')
            end_microns = method.get('end_microns')
            
            # Try to get the settings in a consistent format
            start_setting = method.get('start_setting')
            end_setting = method.get('end_setting')
            
            # Convert numeric settings to strings for storage
            if isinstance(start_setting, (int, float)):
                start_setting = str(start_setting)
            if isinstance(end_setting, (int, float)):
                end_setting = str(end_setting)
            
            # Check if this brew method already exists for this grinder
            cursor.execute(
                """
                SELECT id FROM brew_methods
                WHERE grinder_id = ? AND method_name = ?
                """,
                (grinder_id, method['method_name'])
            )
            method_id = cursor.fetchone()
            
            if method_id is None:
                # Insert new brew method
                cursor.execute(
                    """
                    INSERT INTO brew_methods
                    (grinder_id, method_name, start_microns, end_microns,
                    start_setting, end_setting, setting_format, grind_category)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        grinder_id,
                        method['method_name'],
                        start_microns,
                        end_microns,
                        start_setting,
                        end_setting,
                        method.get('setting_format', 'simple'),
                        grind_category
                    )
                )
                logger.info(f"Inserted brew method {method['method_name']} for grinder {grinder_name}")
            else:
                # Update existing brew method
                method_id = method_id[0]
                cursor.execute(
                    """
                    UPDATE brew_methods
                    SET start_microns = ?, end_microns = ?,
                    start_setting = ?, end_setting = ?, setting_format = ?, grind_category = ?
                    WHERE id = ?
                    """,
                    (
                        start_microns,
                        end_microns,
                        start_setting,
                        end_setting,
                        method.get('setting_format', 'simple'),
                        grind_category,
                        method_id
                    )
                )
                logger.info(f"Updated brew method {method['method_name']} for grinder {grinder_name}")
        
        conn.commit()
        return True
    
    except Exception as e:
        logger.error(f"Error saving grinder data to database: {e}")
        conn.rollback()
        return False

def main():
    """
    Main function to crawl grinder data and save it to the database.
    """
    # Parse command line arguments
    args = parse_args()
    
    # Set up logging level
    if args.debug:
        logger.setLevel(logging.DEBUG)
        logger.debug("Debug logging enabled")
    
    logger.info("Starting coffee grinder data crawl")
    
    # Reset the database if requested
    if args.reset_db:
        logger.info("Resetting database...")
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
            logger.info("Database file deleted")
    
    # Initialize database
    conn = init_db()
    if not conn:
        logger.error("Failed to initialize database. Exiting.")
        return
    
    try:
        # Get the list of grinder URLs
        grinder_links = get_grinder_links()
        if not grinder_links or len(grinder_links) == 0:
            logger.error("No grinder links found. Exiting.")
            return
        
        # Apply limit if specified
        if args.limit > 0:
            logger.info(f"Limiting to {args.limit} grinders")
            grinder_links = grinder_links[:args.limit]
        
        logger.info(f"Found {len(grinder_links)} grinder links")
        
        # Process each grinder
        grinders_processed = process_grinders(grinder_links, conn, refresh_cache=args.refresh_cache)
        logger.info(f"Processed {grinders_processed} grinders successfully")
        
    except Exception as e:
        logger.error(f"Error in main function: {e}")
    finally:
        if conn:
            conn.close()
            logger.info("Database connection closed")
    
    logger.info("Coffee grinder data crawl completed")

def query_microns(grinder_name, target_microns):
    """
    Query the database to find the grind setting for a specific micron target.
    
    Args:
        grinder_name (str): The name of the grinder to query
        target_microns (int): The target micron value
        
    Returns:
        dict: Results of the query containing the grinder info and calculated settings
    """
    logger.info(f"Querying setting for {grinder_name} at {target_microns} microns")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # This enables column access by name
        cur = conn.cursor()
        
        # Find the grinder by name (fuzzy match)
        cur.execute("SELECT * FROM grinders WHERE name LIKE ?", (f'%{grinder_name}%',))
        grinder = cur.fetchone()
        
        if not grinder:
            logger.error(f"No grinder found matching '{grinder_name}'")
            return {"error": f"No grinder found matching '{grinder_name}'"}
        
        grinder_id = grinder['id']
        grinder_name = grinder['name']
        min_microns = grinder['min_microns']
        max_microns = grinder['max_microns']
        
        # Check if the target microns is within the grinder's range
        if target_microns < min_microns or target_microns > max_microns:
            logger.warning(f"Target micron value {target_microns} is outside the grinder's range ({min_microns}-{max_microns})")
            return {
                "error": f"Target micron value {target_microns} is outside the grinder's range ({min_microns}-{max_microns})",
                "grinder": dict(grinder)
            }
        
        # Get all brew methods for this grinder
        cur.execute("SELECT * FROM brew_methods WHERE grinder_id = ?", (grinder_id,))
        brew_methods = cur.fetchall()
        
        # Find the min and max settings
        min_setting = None
        max_setting = None
        setting_format = "simple"  # Default to simple if no formats found
        
        # Look through all brew methods to find the extreme settings
        for method in brew_methods:
            if method['start_setting'] and method['end_setting']:
                if method['setting_format'] == 'simple':
                    try:
                        start_val = int(method['start_setting']) if isinstance(method['start_setting'], str) else method['start_setting']
                        end_val = int(method['end_setting']) if isinstance(method['end_setting'], str) else method['end_setting']
                        
                        if min_setting is None or start_val < min_setting:
                            min_setting = start_val
                            setting_format = 'simple'
                        if max_setting is None or end_val > max_setting:
                            max_setting = end_val
                    except (ValueError, TypeError):
                        continue
                elif method['setting_format'] == 'complex':
                    # For complex settings, we need to find min/max differently
                    setting_format = 'complex'
        
        # If we have complex settings, handle them separately
        if setting_format == 'complex':
            # Collect all complex settings
            complex_settings = []
            for method in brew_methods:
                if method['setting_format'] == 'complex' and method['start_setting'] and method['end_setting']:
                    complex_settings.extend([method['start_setting'], method['end_setting']])
            
            if complex_settings:
                # Convert settings to numerical values for comparison
                def parse_complex_setting(s):
                    parts = s.split('.')
                    if len(parts) == 3:
                        # Format: rotations.numbers.clicks
                        rotations = int(parts[0])
                        numbers = int(parts[1])
                        clicks = int(parts[2])
                        return rotations * 100 + numbers * 10 + clicks
                    elif len(parts) == 2:
                        # Format: rotations.clicks
                        rotations = int(parts[0])
                        clicks = int(parts[1])
                        return rotations * 10 + clicks
                    else:
                        return 0
                
                # Convert settings to numerical values
                numerical_values = [parse_complex_setting(s) for s in complex_settings]
                min_setting = complex_settings[numerical_values.index(min(numerical_values))]
                max_setting = complex_settings[numerical_values.index(max(numerical_values))]
        
        # Find the brew method that would be appropriate for this micron size
        matching_methods = []
        for method in brew_methods:
            if method['start_microns'] is not None and method['end_microns'] is not None:
                if method['start_microns'] <= target_microns <= method['end_microns']:
                    matching_methods.append(dict(method))
        
        # If no matching methods were found in the database, use standard brew method ranges
        if not matching_methods:
            logger.info(f"No exact matches found in database, using standard brew method ranges")
            for method_key, method_data in STANDARD_BREW_METHODS.items():
                if method_data['min_microns'] <= target_microns <= method_data['max_microns']:
                    # Create a synthetic brew method entry
                    matching_methods.append({
                        "method_name": method_data['name'],
                        "start_microns": method_data['min_microns'],
                        "end_microns": method_data['max_microns'],
                        "grind_category": method_data['grind_category'],
                        "start_setting": None,
                        "end_setting": None,
                        "setting_format": setting_format,
                        "position_x": 0,
                        "position_y": 0
                    })
                    
                    # Calculate settings for this standard method if possible
                    if min_setting is not None and max_setting is not None and min_microns is not None and max_microns is not None:
                        matching_methods[-1]['start_setting'] = map_microns_to_setting(
                            method_data['min_microns'], min_setting, max_setting, 
                            min_microns, max_microns, setting_format, method_data['name']
                        )
                        matching_methods[-1]['end_setting'] = map_microns_to_setting(
                            method_data['max_microns'], min_setting, max_setting, 
                            min_microns, max_microns, setting_format, method_data['name']
                        )
        
        # Calculate the grind setting for the target micron value
        target_setting = None
        if min_setting is not None and max_setting is not None and min_microns is not None and max_microns is not None:
            target_setting = map_microns_to_setting(
                target_microns, min_setting, max_setting, 
                min_microns, max_microns, setting_format, grinder_name
            )
        
        # Determine the grind category based on the target micron value
        grind_category = "Unknown"
        for category, (min_cat_microns, max_cat_microns) in GRIND_CATEGORIES.items():
            if min_cat_microns <= target_microns < max_cat_microns:
                grind_category = category
                break
        
        # If the target micron is beyond our categories, use the highest category
        if target_microns >= GRIND_CATEGORIES['Extra Coarse'][1]:
            grind_category = 'Extra Coarse'
        
        result = {
            "grinder": dict(grinder),
            "target_microns": target_microns,
            "calculated_setting": target_setting,
            "setting_format": setting_format,
            "grind_category": grind_category,
            "matching_methods": matching_methods
        }
        
        logger.info(f"Setting for {grinder_name} at {target_microns} microns: {target_setting} ({grind_category})")
        return result
    
    except sqlite3.Error as e:
        logger.error(f"Database error: {e}")
        return {"error": f"Database error: {e}"}
    
    finally:
        if conn:
            conn.close()

def process_grinders(grinder_links, conn, refresh_cache=False):
    """
    Process a list of grinder links: fetch pages, extract data, and save to the database.
    
    Args:
        grinder_links (list): List of grinder URLs to process
        conn: Database connection
        refresh_cache (bool): Whether to refresh the cached pages
        
    Returns:
        int: Number of grinders processed successfully
    """
    successful_count = 0
    
    for url in grinder_links:
        logger.info(f"Processing grinder: {url}")
        
        # Fetch the page content (from cache or from the website)
        html_content = fetch_url(url, refresh_cache=refresh_cache)
        if not html_content:
            logger.error(f"Failed to fetch content for {url}")
            continue
        
        # Parse the grinder page
        grinder_data = parse_grinder_page(url, html_content)
        if not grinder_data:
            logger.error(f"Failed to parse grinder page: {url}")
            continue
        
        # Save the data to the database
        if save_to_db(conn, grinder_data):
            successful_count += 1
            logger.info(f"Successfully processed grinder: {grinder_data['name']}")
        else:
            logger.error(f"Failed to save grinder data for {url}")
    
    return successful_count

if __name__ == "__main__":
    main() 