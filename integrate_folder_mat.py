#!/usr/bin/env python3
"""
폴더매트 데이터를 기존 데이터와 통합하는 스크립트
"""

import pandas as pd
import os
from pathlib import Path

def integrate_folder_mat_data():
    """폴더매트 데이터를 기존 데이터와 통합"""
    
    # 처리된 폴더매트 데이터 로드
    folder_mat_path = "data/products/folder/processed_folder_mat_data.csv"
    
    if not os.path.exists(folder_mat_path):
        print("폴더매트 처리된 데이터가 없습니다.")
        return
    
    folder_df = pd.read_csv(folder_mat_path, encoding='utf-8-sig')
    print(f"폴더매트 데이터 로드: {len(folder_df)}개")
    
    # 기존 데이터 로드 (src/parser.py의 process_raw_data 함수 사용)
    import sys
    sys.path.append('src')
    from parser import process_raw_data
    
    # 기존 데이터 처리
    product_data_path = "data/products"
    existing_df = process_raw_data(product_data_path, {})
    print(f"기존 데이터 로드: {len(existing_df)}개")
    
    # 폴더매트 데이터를 기존 형식에 맞게 조정
    folder_df_adjusted = folder_df.copy()
    
    # 필요한 컬럼 추가/조정
    if 'Thickness_cm' not in folder_df_adjusted.columns:
        folder_df_adjusted['Thickness_cm'] = 0  # 폴더매트는 두께가 없음
    
    if 'Volume_cm3' not in folder_df_adjusted.columns:
        folder_df_adjusted['Volume_cm3'] = folder_df_adjusted['Area_cm2'] * folder_df_adjusted['Thickness_cm']
    
    # 데이터 통합
    combined_df = pd.concat([existing_df, folder_df_adjusted], ignore_index=True)
    print(f"통합된 데이터: {len(combined_df)}개")
    
    # 통합된 데이터 저장
    output_path = "data/products/combined_data.csv"
    combined_df.to_csv(output_path, index=False, encoding='utf-8-sig')
    print(f"통합된 데이터 저장: {output_path}")
    
    # 카테고리별 통계
    print("\n카테고리별 데이터 수:")
    category_counts = combined_df['product_category'].value_counts()
    print(category_counts)
    
    return combined_df

if __name__ == "__main__":
    integrate_folder_mat_data()
