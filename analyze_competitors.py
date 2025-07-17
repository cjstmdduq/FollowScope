"""
Analyze processed competitor data
"""

import pandas as pd
from pathlib import Path

def analyze_competitors():
    # Read processed data
    df = pd.read_csv('FollowScope/data/processed/processed_competitive_data.csv')
    
    print("=== COMPETITOR DATA ANALYSIS ===\n")
    
    # Overall statistics
    print(f"Total products in database: {len(df)}")
    print(f"Number of competitors: {df['Competitor'].nunique()}")
    print(f"Number of unique designs: {df['Design'].nunique()}")
    print()
    
    # Analyze each competitor
    for competitor in df['Competitor'].unique():
        comp_data = df[df['Competitor'] == competitor]
        
        print(f"\n{'='*60}")
        print(f"COMPETITOR: {competitor}")
        print(f"{'='*60}")
        
        print(f"Total products: {len(comp_data)}")
        
        # Design analysis
        print(f"\nDesigns offered: {comp_data['Design'].nunique()}")
        design_counts = comp_data['Design'].value_counts().head(5)
        print("Top 5 designs:")
        for design, count in design_counts.items():
            print(f"  - {design}: {count} products")
        
        # Thickness range
        print(f"\nThickness range: {comp_data['Thickness_cm'].min():.1f}cm - {comp_data['Thickness_cm'].max():.1f}cm")
        thickness_counts = comp_data['Thickness_cm'].value_counts().sort_index()
        print("Available thicknesses:")
        for thickness, count in thickness_counts.items():
            print(f"  - {thickness:.1f}cm: {count} products")
        
        # Width range
        print(f"\nWidth range: {comp_data['Width_cm'].min():.0f}cm - {comp_data['Width_cm'].max():.0f}cm")
        
        # Length range
        print(f"Length range: {comp_data['Length_cm'].min():.0f}cm - {comp_data['Length_cm'].max():.0f}cm")
        
        # Price analysis
        print(f"\nPrice range: ₩{comp_data['Price'].min():,.0f} - ₩{comp_data['Price'].max():,.0f}")
        print(f"Average price: ₩{comp_data['Price'].mean():,.0f}")
        
        # Price per volume analysis
        print(f"\nPrice per volume (₩/cm³):")
        print(f"  Min: {comp_data['Price_per_Volume'].min():.3f}")
        print(f"  Max: {comp_data['Price_per_Volume'].max():.3f}")
        print(f"  Average: {comp_data['Price_per_Volume'].mean():.3f}")
        
        # Sample products
        print(f"\nSample products:")
        sample = comp_data.head(3)[['Design', 'Thickness_cm', 'Width_cm', 'Length_cm', 'Price']]
        for idx, row in sample.iterrows():
            print(f"  - {row['Design']} ({row['Thickness_cm']}cm x {row['Width_cm']}cm x {row['Length_cm']}cm): ₩{row['Price']:,.0f}")
    
    print("\n" + "="*60)
    print("COMPETITIVE POSITIONING SUMMARY")
    print("="*60)
    
    # Compare average price per volume across competitors
    avg_price_per_vol = df.groupby('Competitor')['Price_per_Volume'].mean().sort_values()
    print("\nAverage price per volume by competitor (₩/cm³):")
    for competitor, avg_ppv in avg_price_per_vol.items():
        print(f"  {competitor}: {avg_ppv:.3f}")
    
    # Most popular thickness across all competitors
    print("\nMost common thicknesses across all competitors:")
    thickness_popularity = df['Thickness_cm'].value_counts().head(5)
    for thickness, count in thickness_popularity.items():
        print(f"  {thickness:.1f}cm: {count} products")

if __name__ == "__main__":
    analyze_competitors()