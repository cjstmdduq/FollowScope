#!/usr/bin/env python3
"""
Debug parser for 티지오매트 data
"""

import pandas as pd
from src.parser import extract_product_attributes_from_csv

# Read 티지오매트 file
df = pd.read_csv('FollowScope/data/raw/티지오매트 층간소음 롤매트 우다다 거실 아기 놀이방 유아 바닥 복도 크림10T 110x50_옵션가격_2025-07-10-05-52.csv', encoding='utf-8-sig')

print("DataFrame shape:", df.shape)
print("\nColumns:", df.columns.tolist())
print("\nFirst 10 rows:")
print(df.head(10))

print("\n=== Parsing First Few Rows ===")
valid_count = 0
for idx, row in df.iterrows():
    if pd.isna(row).all():
        continue
        
    attrs = extract_product_attributes_from_csv(row)
    
    # Check if has all required fields
    has_all = all([attrs['thickness'], attrs['width'], attrs['length'], attrs['price']])
    
    if idx < 5 or has_all:  # Show first 5 rows regardless
        print(f"\nRow {idx}:")
        print(f"  옵션1: {row.get('옵션1', 'N/A')}")
        print(f"  옵션2: {row.get('옵션2', 'N/A')}")
        print(f"  옵션3: {row.get('옵션3', 'N/A')}")
        print(f"  최종가격: {row.get('최종가격', 'N/A')}")
        print(f"  Parsed: {attrs}")
        print(f"  Has all required: {has_all}")
        
        if has_all:
            valid_count += 1
            
    if idx >= 10:
        break

print(f"\nTotal valid products found in first 10 rows: {valid_count}")