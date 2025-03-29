#!/usr/bin/env python3
"""
Coffee Grind Size Query Tool

This script allows querying the database to find the appropriate grinder setting
for a specified micron size.
"""

import argparse
import sys
import os
import json
from collections import defaultdict

# Add the src directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the query function from main
from main import query_microns

def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Coffee Grind Size Query Tool")
    parser.add_argument(
        "grinder",
        type=str,
        help="Name of the grinder to query (partial match allowed)"
    )
    parser.add_argument(
        "microns",
        type=int,
        help="Target micron size"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results in JSON format"
    )
    parser.add_argument(
        "--method",
        type=str,
        help="Brew method to filter by (e.g., 'espresso', 'pour over')"
    )
    parser.add_argument(
        "--concise",
        action="store_true",
        help="Show concise output format (default when many methods match)"
    )
    parser.add_argument(
        "--detailed",
        action="store_true",
        help="Show detailed output even when many methods match"
    )
    return parser.parse_args()

def format_setting(setting, setting_format):
    """Format the setting for display."""
    if setting_format == "simple":
        return f"{setting} clicks"
    elif setting_format == "complex":
        return setting
    else:
        return str(setting)

def main():
    """Main function to run the query tool."""
    args = parse_args()
    
    # Query the database
    result = query_microns(args.grinder, args.microns)
    
    # Check for errors
    if "error" in result:
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"Error: {result['error']}")
        sys.exit(1)
    
    # Filter by brew method if specified
    if args.method and result["matching_methods"]:
        method_key = args.method.lower()
        filtered_methods = []
        for method in result["matching_methods"]:
            if method_key in method["method_name"].lower():
                filtered_methods.append(method)
        result["matching_methods"] = filtered_methods
    
    # Sort matching methods by how well they match the target micron
    if result["matching_methods"]:
        # Calculate the "fit" score for each method (lower is better)
        # This represents how centered the target micron is in the method's range
        for method in result["matching_methods"]:
            method_min = method["start_microns"]
            method_max = method["end_microns"]
            method_range = method_max - method_min
            method_mid = method_min + (method_range / 2)
            
            # Calculate distance from target to midpoint as a percentage of the range
            if method_range > 0:
                # Basic fit score - how centered the target is within the range
                basic_fit = abs(args.microns - method_mid) / method_range
                
                # For methods where the target is at the very beginning of the range,
                # adjust score upward (worse fit)
                if args.microns <= method_min + (method_range * 0.1):
                    edge_penalty = 0.2
                elif args.microns >= method_max - (method_range * 0.1): 
                    edge_penalty = 0.2
                else:
                    edge_penalty = 0
                
                # Adjust for methods that are specially suited for certain ranges
                # V60 is ideal around 450-500 microns
                method_name = method["method_name"].lower()
                if "v60" in method_name and 450 <= args.microns <= 550:
                    specialty_bonus = -0.3  # negative means better fit
                elif "espresso" in method_name and 200 <= args.microns <= 300:
                    specialty_bonus = -0.3
                elif "french press" in method_name and 800 <= args.microns <= 1000:
                    specialty_bonus = -0.3
                else:
                    specialty_bonus = 0
                
                method["fit_score"] = basic_fit + edge_penalty + specialty_bonus
            else:
                method["fit_score"] = float('inf')
        
        # Sort by fit score (best fit first)
        result["matching_methods"].sort(key=lambda m: m["fit_score"])
    
    # Output results
    if args.json:
        # Remove the fit_score from the output
        for method in result["matching_methods"]:
            if "fit_score" in method:
                del method["fit_score"]
                
        # Output in JSON format
        print(json.dumps(result, indent=2))
    else:
        # Determine if we should use concise mode
        too_many_methods = len(result["matching_methods"]) > 5
        use_concise = args.concise or (too_many_methods and not args.detailed)
        
        # Output in human-readable format
        grinder = result["grinder"]
        print(f"Grinder: {grinder['name']}")
        print(f"Micron Range: {grinder['min_microns']} - {grinder['max_microns']} microns")
        print(f"Target: {args.microns} microns")
        print(f"Calculated Setting: {format_setting(result['calculated_setting'], result['setting_format'])}")
        print(f"Grind Category: {result['grind_category']}")
        
        # Show matching brew methods
        if result["matching_methods"]:
            if use_concise:
                print("\nMatching Brew Methods (by category):")
                # Group methods by grind category
                category_methods = defaultdict(list)
                for method in result["matching_methods"]:
                    category = method.get('grind_category', 'Unknown')
                    category_methods[category].append(method)
                
                for category, methods in category_methods.items():
                    print(f"  • {category} Grind:")
                    method_names = [f"{m['method_name']} ({m['start_microns']} - {m['end_microns']} microns)" for m in methods]
                    print(f"    {', '.join(method_names)}")
            else:
                print("\nMatching Brew Methods:")
                for method in result["matching_methods"]:
                    print(f"  • {method['method_name']}: {method['start_microns']} - {method['end_microns']} microns")
                    if method['start_setting'] and method['end_setting']:
                        print(f"    Setting Range: {format_setting(method['start_setting'], method['setting_format'])} - {format_setting(method['end_setting'], method['setting_format'])}")
        else:
            print("\nNo matching brew methods found for this micron size.")
            
        # Provide brewing suggestions
        print("\nSuggested Brewing Methods for this grind size:")
        top_methods = result["matching_methods"][:3]  # Only show top 3 suggestions
        
        for i, method in enumerate(top_methods):
            # Indicate primary/ideal methods vs alternatives
            if i == 0:
                print(f"  • IDEAL: {method['method_name']} ({method['start_microns']} - {method['end_microns']} microns)")
            else:
                print(f"  • GOOD ALTERNATIVE: {method['method_name']} ({method['start_microns']} - {method['end_microns']} microns)")
            
            # Show setting information if available
            if method['start_setting'] and method['end_setting']:
                ideal_setting = format_setting(result['calculated_setting'], result['setting_format'])
                start_setting = format_setting(method['start_setting'], method['setting_format'])
                end_setting = format_setting(method['end_setting'], method['setting_format'])
                print(f"      Use setting: {ideal_setting} (range: {start_setting} - {end_setting})")
            
            # Show the grind category if it differs from the target category
            if method.get('grind_category') and method['grind_category'] != result['grind_category']:
                print(f"      Note: This method typically uses a {method['grind_category']} grind")
        
        # If there are more methods, summarize them
        if len(result["matching_methods"]) > 3 and not use_concise:
            other_methods = [m["method_name"] for m in result["matching_methods"][3:]]
            print(f"\nOther compatible methods: {', '.join(other_methods)}")
        elif len(result["matching_methods"]) > 3 and use_concise:
            print(f"\nTotal methods compatible: {len(result['matching_methods'])}")

if __name__ == "__main__":
    main() 