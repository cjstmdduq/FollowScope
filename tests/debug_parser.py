#!/usr/bin/env python3
"""
Debug script to test parsing of 파크론 file
"""

import pandas as pd
import sys
import os
sys.path.append('src')

from parser import extract_product_attributes_from_csv

# Load 파크론 file
file_path = "FollowScope/data/raw/파크론.csv"
df = pd.read_csv(file_path, encoding='utf-8-sig')

print("=== 파크론 파일 구조 ===")
print(f"Columns: {df.columns.tolist()}")
print(f"Shape: {df.shape}")
print()

print("=== 첫 5행 데이터 ===")
for idx, row in df.head(10).iterrows():
    print(f"Row {idx}: {dict(row)}")
    
    # 파싱 테스트
    attrs = extract_product_attributes_from_csv(row)
    print(f"  -> Parsed: {attrs}")
    print()