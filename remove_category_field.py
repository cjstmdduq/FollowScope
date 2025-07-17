"""
Remove product_category field from CSV files since we now use directory-based categorization
"""

import pandas as pd
import glob
import os

def remove_category_field():
    # Find all CSV files in all category directories
    csv_files = glob.glob('FollowScope/data/products/**/*.csv', recursive=True)
    
    for file_path in csv_files:
        print(f"Processing: {file_path}")
        
        try:
            # Read CSV
            df = pd.read_csv(file_path)
            
            # Remove product_category column if it exists
            if 'product_category' in df.columns:
                df = df.drop('product_category', axis=1)
                
                # Save back
                df.to_csv(file_path, index=False)
                print(f"  ✓ Removed product_category column")
            else:
                print(f"  - No product_category column found")
        
        except Exception as e:
            print(f"  ✗ Error: {e}")
    
    print("\n✅ Cleanup complete!")

if __name__ == "__main__":
    print("=== Removing product_category field from CSV files ===\n")
    remove_category_field()