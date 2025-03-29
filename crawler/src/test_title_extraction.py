#!/usr/bin/env python3
"""
Test script to check title extraction from grinder pages.
"""

import requests
from bs4 import BeautifulSoup
import sys
import os

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import functions from main.py
from src.main import HEADERS

def extract_title_methods(url):
    """
    Test different methods of extracting the title from a grinder page.
    
    Args:
        url (str): URL of the grinder page
    """
    print(f"\nTesting title extraction for: {url}")
    
    try:
        r = requests.get(url, headers=HEADERS)
        r.raise_for_status()
        
        soup = BeautifulSoup(r.text, "lxml")
        
        # Method 1: Try to get the title from the entry-title class
        title_el = soup.find("h1", class_="entry-title")
        method1_title = title_el.get_text(strip=True) if title_el and title_el.get_text(strip=True) else "Not found"
        print(f"Method 1 (entry-title): {method1_title}")
        
        # Method 2: Extract from URL
        path_parts = url.rstrip('/').split('/')[-1].split('-')
        method2_title = "Not found"
        if len(path_parts) >= 2:
            # Remove 'grind-settings' or similar suffix
            if 'grind' in path_parts:
                grind_index = path_parts.index('grind')
                path_parts = path_parts[:grind_index]
            # Convert to title case and join
            method2_title = ' '.join(part.capitalize() for part in path_parts)
        print(f"Method 2 (URL): {method2_title}")
        
        # Method 3: Try to find the title in the page title
        page_title = soup.find("title")
        method3_title = "Not found"
        if page_title:
            title_text = page_title.get_text(strip=True)
            # Extract the part before " - " or " | " if present
            if " - " in title_text:
                method3_title = title_text.split(" - ")[0].strip()
            elif " | " in title_text:
                method3_title = title_text.split(" | ")[0].strip()
            else:
                method3_title = title_text
        print(f"Method 3 (page title): {method3_title}")
        
        # Method 4: Try to find any h1 tag
        h1_tags = soup.find_all("h1")
        method4_titles = [h1.get_text(strip=True) for h1 in h1_tags if h1.get_text(strip=True)]
        print(f"Method 4 (all h1 tags): {method4_titles}")
        
        # Print the HTML structure around potential title elements
        print("\nHTML structure around potential title elements:")
        for h1 in h1_tags:
            print(f"H1 tag: {h1}")
            parent = h1.parent
            print(f"Parent: {parent.name} (class: {parent.get('class', 'None')})")
        
    except requests.RequestException as e:
        print(f"Error fetching page: {e}")

def main():
    """Main function to test title extraction."""
    # Test URLs
    test_urls = [
        "https://honestcoffeeguide.com/baratza-vario-plus-grind-settings/",
        "https://honestcoffeeguide.com/baratza-encore-grind-settings/",
        "https://honestcoffeeguide.com/1zpresso-q2-heptagonal-burrs-grind-settings/"
    ]
    
    for url in test_urls:
        extract_title_methods(url)
        print("-" * 80)

if __name__ == "__main__":
    main() 