"""
Script to process raw competitor data
"""

import os
import sys
from pathlib import Path
import pandas as pd

# Add src to path
sys.path.append(str(Path(__file__).parent / 'src'))

from config import RAW_DATA_PATH, PROCESSED_DATA_PATH, get_competitor_rules
from parser import process_raw_data


def main():
    """
    Process all raw data files
    """
    # Ensure directories exist
    Path(RAW_DATA_PATH).mkdir(parents=True, exist_ok=True)
    Path(PROCESSED_DATA_PATH).mkdir(parents=True, exist_ok=True)
    
    # Check if raw data exists
    raw_files = list(Path(RAW_DATA_PATH).glob('*.xlsx')) + list(Path(RAW_DATA_PATH).glob('*.xls')) + list(Path(RAW_DATA_PATH).glob('*.csv'))
    
    if not raw_files:
        print("No data files found in data/raw/ directory. Please add your data files.")
        print("Expected format: Excel files (.xlsx or .xls) or CSV files with product data")
        return
    
    print(f"Found {len(raw_files)} data files to process:")
    for f in raw_files:
        print(f"  - {f.name}")
    print()
    
    # Process raw data
    print("Processing raw data files...")
    # Pass empty rules dict since parser uses get_competitor_rules internally
    df_processed = process_raw_data(RAW_DATA_PATH, {})
    
    if df_processed.empty:
        print("No valid data could be extracted from the files.")
        return
    
    # Save processed data
    output_file = Path(PROCESSED_DATA_PATH) / 'processed_competitive_data.csv'
    df_processed.to_csv(output_file, index=False)
    print(f"\nProcessed data saved to {output_file}")
    
    # Show summary
    print("\n=== Processing Summary ===")
    print(f"Total products processed: {len(df_processed)}")
    print("\nProducts by competitor:")
    competitor_counts = df_processed.groupby('Competitor').size()
    for competitor, count in competitor_counts.items():
        print(f"  - {competitor}: {count} products")
    
    # Show sample of processed data
    print("\nSample of processed data:")
    print(df_processed.head())


if __name__ == "__main__":
    main()