#!/usr/bin/env python3
"""
폴더매트 데이터를 기존 분석 형식으로 변환
"""

import pandas as pd
import numpy as np
import os
import re
from pathlib import Path
import sys

# src 모듈 경로 추가
sys.path.append('src')

def extract_brand_from_filename(filename):
    """파일명에서 브랜드명 추출"""
    return filename.split()[0]

def parse_size_from_option(option_text):
    """옵션 텍스트에서 크기 정보 파싱"""
    if pd.isna(option_text) or not option_text:
        return None, None
    
    # 크기 패턴 찾기 (예: 200x200, 240x200, 280x220 등)
    size_pattern = r'(\d+)\s*[xX×]\s*(\d+)'
    match = re.search(size_pattern, str(option_text))
    
    if match:
        width = int(match.group(1))
        height = int(match.group(2))
        return width, height
    
    return None, None

def process_folder_mat_data():
    """폴더매트 데이터 처리"""
    data_path = Path("data/products/folder")
    
    all_data = []
    
    for csv_file in data_path.glob("*.csv"):
        print(f"Processing: {csv_file.name}")
        
        try:
            df = pd.read_csv(csv_file, encoding='utf-8-sig')
            
            # 브랜드명 추출
            brand = extract_brand_from_filename(csv_file.name)
            
            # 데이터 처리
            for _, row in df.iterrows():
                if pd.isna(row['최종가격']) or row['최종가격'] == '':
                    continue
                
                try:
                    price = float(str(row['최종가격']).replace(',', ''))
                except:
                    continue
                
                # 크기 정보 추출
                width, height = None, None
                
                # 옵션2에서 크기 정보 찾기
                if pd.notna(row['옵션2']):
                    width, height = parse_size_from_option(row['옵션2'])
                
                # 옵션3에서 크기 정보 찾기
                if width is None and pd.notna(row['옵션3']):
                    width, height = parse_size_from_option(row['옵션3'])
                
                if width and height:
                    area = width * height
                    price_per_sqm = price / (area / 10000)  # cm²를 m²로 변환
                    
                    # 제품명 생성
                    product_name = f"{brand} 폴더매트 {width}x{height}"
                    
                    all_data.append({
                        'Competitor': brand,
                        'Product_Name': product_name,
                        'Price': price,
                        'Width_cm': width,
                        'Height_cm': height,
                        'Area_cm2': area,
                        'Price_per_Volume': price_per_sqm,
                        'Thickness_cm': 0,  # 폴더매트는 두께가 없으므로 0
                        'product_category': '폴더매트',
                        'Size_Info': f"{width}x{height}",
                        'Option1': row.get('옵션1', ''),
                        'Option2': row.get('옵션2', ''),
                        'Option3': row.get('옵션3', '')
                    })
                    
        except Exception as e:
            print(f"Error processing {csv_file.name}: {e}")
            continue
    
    return pd.DataFrame(all_data)

def create_folder_mat_analysis(df):
    """폴더매트 분석 결과 출력"""
    print("\n=== 폴더매트 분석 결과 ===")
    
    # 기본 통계
    print(f"총 데이터 수: {len(df)}")
    print(f"브랜드 수: {df['Competitor'].nunique()}")
    print(f"브랜드별 데이터 수:")
    print(df['Competitor'].value_counts())
    
    print(f"\n가격 범위:")
    print(f"  최저가: {df['Price'].min():,.0f}원")
    print(f"  최고가: {df['Price'].max():,.0f}원")
    print(f"  평균가: {df['Price'].mean():,.0f}원")
    
    print(f"\n㎡당 가격 범위:")
    print(f"  최저가: {df['Price_per_Volume'].min():,.0f}원/㎡")
    print(f"  최고가: {df['Price_per_Volume'].max():,.0f}원/㎡")
    print(f"  평균가: {df['Price_per_Volume'].mean():,.0f}원/㎡")
    
    # 브랜드별 평균 가격
    print(f"\n브랜드별 평균 가격 (원/㎡):")
    brand_avg = df.groupby('Competitor')['Price_per_Volume'].mean().sort_values()
    for brand, avg_price in brand_avg.items():
        print(f"  {brand}: {avg_price:,.0f}원/㎡")
    
    # 크기별 분석
    print(f"\n크기별 데이터 수:")
    size_counts = df.groupby(['Width_cm', 'Height_cm']).size().sort_values(ascending=False)
    for (width, height), count in size_counts.head(10).items():
        print(f"  {width}x{height}: {count}개")
    
    # 크기별 평균 가격
    print(f"\n크기별 평균 가격 (원/㎡):")
    size_avg = df.groupby(['Width_cm', 'Height_cm'])['Price_per_Volume'].mean().sort_values(ascending=False)
    for (width, height), avg_price in size_avg.head(10).items():
        print(f"  {width}x{height}: {avg_price:,.0f}원/㎡")

def save_processed_data(df):
    """처리된 데이터를 CSV로 저장"""
    output_path = "data/products/folder/processed_folder_mat_data.csv"
    df.to_csv(output_path, index=False, encoding='utf-8-sig')
    print(f"\n처리된 데이터 저장: {output_path}")

def main():
    """메인 함수"""
    print("폴더매트 데이터 분석 시작...")
    
    # 데이터 처리
    df = process_folder_mat_data()
    
    if df.empty:
        print("처리할 데이터가 없습니다.")
        return
    
    # 분석 결과 출력
    create_folder_mat_analysis(df)
    
    # 처리된 데이터 저장
    save_processed_data(df)
    
    print("\n분석 완료!")

if __name__ == "__main__":
    main()
