"""
기존 제품 데이터에 product_category 필드 추가 스크립트
현재 모든 데이터는 '롤매트'로 설정
"""

import pandas as pd
from pathlib import Path
import glob

def update_product_data_with_category():
    # 제품 데이터 파일들 찾기
    product_files = glob.glob('FollowScope/data/products/*.csv')
    
    for file_path in product_files:
        print(f"Processing: {file_path}")
        
        # CSV 읽기
        df = pd.read_csv(file_path)
        
        # product_category 컬럼 추가 (이미 있으면 스킵)
        if 'product_category' not in df.columns:
            df['product_category'] = '롤매트'
            
            # 저장
            df.to_csv(file_path, index=False)
            print(f"  ✓ Added product_category column")
        else:
            print(f"  - product_category column already exists")
    
    print("\n✅ Product data update complete!")

def update_coupon_data_with_category():
    # 쿠폰 데이터 파일들 찾기
    coupon_files = glob.glob('FollowScope/data/coupons/*.csv')
    
    for file_path in coupon_files:
        print(f"Processing: {file_path}")
        
        # CSV 읽기
        df = pd.read_csv(file_path)
        
        # product_category 컬럼 추가 (이미 있으면 스킵)
        if 'product_category' not in df.columns:
            df['product_category'] = '롤매트'
            
            # 저장
            df.to_csv(file_path, index=False)
            print(f"  ✓ Added product_category column")
        else:
            print(f"  - product_category column already exists")
    
    print("\n✅ Coupon data update complete!")

def update_live_data_with_category():
    # 라이브 데이터 파일들 찾기
    live_files = glob.glob('FollowScope/data/live/*.csv')
    
    for file_path in live_files:
        print(f"Processing: {file_path}")
        
        # CSV 읽기
        df = pd.read_csv(file_path)
        
        # product_category 컬럼 추가 (이미 있으면 스킵)
        if 'product_category' not in df.columns:
            df['product_category'] = '롤매트'
            
            # 저장
            df.to_csv(file_path, index=False)
            print(f"  ✓ Added product_category column")
        else:
            print(f"  - product_category column already exists")
    
    print("\n✅ Live data update complete!")

if __name__ == "__main__":
    print("=== Adding product_category field to existing data ===\n")
    
    print("1. Updating product data...")
    update_product_data_with_category()
    
    print("\n2. Updating coupon data...")
    update_coupon_data_with_category()
    
    print("\n3. Updating live data...")
    update_live_data_with_category()
    
    print("\n🎉 All data updated successfully!")