#!/usr/bin/env python3
"""
Test parser to verify competitor extraction
"""

from src.parser import extract_competitor_name, process_raw_data
from src.config import RAW_DATA_PATH

# Test competitor name extraction
test_filenames = [
    "티지오매트 층간소음 롤매트 우다다 거실 아기 놀이방 유아 바닥 복도 크림10T 110x50_옵션가격_2025-07-10-05-52",
    "리포소홈 층간소음 놀이방매트_옵션가격_2025-07-10-05-52",
    "새로운브랜드 매트리스_옵션가격_2025-07-11",
    "ABC Company Product List",
    "테스트_2025-07-11-10-30"
]

print("=== Testing Competitor Name Extraction ===")
for filename in test_filenames:
    competitor = extract_competitor_name(filename)
    print(f"{filename[:50]}... -> {competitor}")

print("\n=== Processing Actual Data ===")
df = process_raw_data(RAW_DATA_PATH, {})

if not df.empty:
    print(f"\nTotal products: {len(df)}")
    print(f"Competitors found: {df['Competitor'].unique()}")
    print(f"\nProducts per competitor:")
    print(df['Competitor'].value_counts())
else:
    print("No data processed")