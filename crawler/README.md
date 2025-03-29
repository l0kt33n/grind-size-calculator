# Coffee Grind Size Crawler

A tool for collecting, storing, and querying coffee grinder settings and brew method information.

## Overview

This project crawls coffee grinder information from [Honest Coffee Guide](https://honestcoffeeguide.com) to build a database of grinder settings and brew methods. It allows users to query the database to find the appropriate grinder setting for a specific brew method or target micron size.

## Features

- Crawls and parses coffee grinder data from the web
- Stores grinder information in a SQLite database
- Provides a command-line interface for querying grinder settings
- Supports multiple grinder models and brew methods
- Includes standardized grind categories (Extra Fine to Extra Coarse)

## Project Structure

- `src/main.py` - Main crawler script
- `src/query_microns.py` - Script to query the database for grinder settings
- `src/reset_db.py` - Script to reset and reinitialize the database
- `query_microns.sh` - Shell script to query grinder settings
- `reset_db.sh` - Shell script to reset the database and run the crawler

## Usage

### Crawling Data

To crawl and store grinder data:

```bash
# Reset the database and crawl all grinders
./reset_db.sh

# Limit the number of grinders to crawl
./reset_db.sh --limit 5

# Refresh the cache when crawling
./reset_db.sh --refresh-cache
```

### Querying Data

To query grinder settings:

```bash
# Query by grinder name and target micron size
./query_microns.sh "Baratza Encore" 500

# Get JSON output
./query_microns.sh "1Zpresso JX Pro" 300 --json
```

## Grind Categories

The system uses standardized grind categories based on micron ranges:

- Extra Fine: 0-200 microns (Turkish coffee)
- Fine: 200-400 microns (Espresso)
- Medium Fine: 400-600 microns (AeroPress, Pour Over)
- Medium: 600-800 microns (Drip Coffee)
- Medium Coarse: 800-1000 microns (Chemex)
- Coarse: 1000-1200 microns (French Press)
- Extra Coarse: 1200-1400 microns (Cold Brew)

## Requirements

- Python 3.6+
- BeautifulSoup4
- Requests
- SQLite3

## Installation

1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`
3. Run the crawler: `./reset_db.sh`

## License

MIT