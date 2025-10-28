#!/usr/bin/env python3
"""
폴더매트 데이터 분석 및 히트맵 생성
"""

import pandas as pd
import numpy as np
import os
import re
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

# 한글 폰트 설정
plt.rcParams['font.family'] = 'AppleGothic'
plt.rcParams['axes.unicode_minus'] = False

def extract_dimensions_from_filename(filename):
    """파일명에서 브랜드명 추출"""
    # 파일명에서 브랜드명 추출 (첫 번째 단어)
    brand = filename.split()[0]
    return brand

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
            brand = extract_dimensions_from_filename(csv_file.name)
            
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
                    
                    all_data.append({
                        'brand': brand,
                        'width': width,
                        'height': height,
                        'area': area,
                        'price': price,
                        'price_per_sqm': price_per_sqm,
                        'option1': row.get('옵션1', ''),
                        'option2': row.get('옵션2', ''),
                        'option3': row.get('옵션3', '')
                    })
                    
        except Exception as e:
            print(f"Error processing {csv_file.name}: {e}")
            continue
    
    return pd.DataFrame(all_data)

def create_folder_mat_heatmap(df):
    """폴더매트 히트맵 생성"""
    if df.empty:
        print("No data to create heatmap")
        return
    
    # 크기별 그룹화
    df['size_group'] = df['width'].astype(str) + 'x' + df['height'].astype(str)
    
    # 브랜드별, 크기별 평균 가격 계산
    heatmap_data = df.groupby(['brand', 'size_group'])['price_per_sqm'].mean().unstack(fill_value=0)
    
    # 히트맵 생성
    plt.figure(figsize=(15, 8))
    
    # 색상 팔레트 설정
    sns.heatmap(heatmap_data, 
                annot=True, 
                fmt='.0f',
                cmap='YlOrRd',
                cbar_kws={'label': '가격 (원/㎡)'},
                linewidths=0.5)
    
    plt.title('폴더매트 브랜드별 크기별 가격 히트맵 (원/㎡)', fontsize=16, pad=20)
    plt.xlabel('크기 (가로 x 세로 cm)', fontsize=12)
    plt.ylabel('브랜드', fontsize=12)
    plt.xticks(rotation=45)
    plt.yticks(rotation=0)
    
    # 레이아웃 조정
    plt.tight_layout()
    
    # 저장
    output_path = 'data/products/folder/folder_mat_heatmap.png'
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"Heatmap saved to: {output_path}")
    
    plt.show()

def create_folder_mat_analysis(df):
    """폴더매트 분석 결과 출력"""
    print("\n=== 폴더매트 분석 결과 ===")
    
    # 기본 통계
    print(f"총 데이터 수: {len(df)}")
    print(f"브랜드 수: {df['brand'].nunique()}")
    print(f"브랜드별 데이터 수:")
    print(df['brand'].value_counts())
    
    print(f"\n가격 범위:")
    print(f"  최저가: {df['price'].min():,.0f}원")
    print(f"  최고가: {df['price'].max():,.0f}원")
    print(f"  평균가: {df['price'].mean():,.0f}원")
    
    print(f"\n㎡당 가격 범위:")
    print(f"  최저가: {df['price_per_sqm'].min():,.0f}원/㎡")
    print(f"  최고가: {df['price_per_sqm'].max():,.0f}원/㎡")
    print(f"  평균가: {df['price_per_sqm'].mean():,.0f}원/㎡")
    
    # 브랜드별 평균 가격
    print(f"\n브랜드별 평균 가격 (원/㎡):")
    brand_avg = df.groupby('brand')['price_per_sqm'].mean().sort_values()
    for brand, avg_price in brand_avg.items():
        print(f"  {brand}: {avg_price:,.0f}원/㎡")
    
    # 크기별 분석
    print(f"\n크기별 데이터 수:")
    size_counts = df.groupby(['width', 'height']).size().sort_values(ascending=False)
    for (width, height), count in size_counts.head(10).items():
        print(f"  {width}x{height}: {count}개")

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
    
    # 히트맵 생성
    create_folder_mat_heatmap(df)
    
    print("\n분석 완료!")

if __name__ == "__main__":
    main()
