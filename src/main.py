"""
Main entry point for FollowScope application
"""

import os
import sys
from pathlib import Path
import pandas as pd

# Add src to path
sys.path.append(str(Path(__file__).parent))

from config import RAW_DATA_PATH, PROCESSED_DATA_PATH
from parser import process_raw_data


def main():
    """
    Main workflow for the application
    """
    # Ensure directories exist
    Path(RAW_DATA_PATH).mkdir(parents=True, exist_ok=True)
    Path(PROCESSED_DATA_PATH).mkdir(parents=True, exist_ok=True)
    
    # Check if raw data exists
    raw_files = list(Path(RAW_DATA_PATH).glob('*.xlsx')) + list(Path(RAW_DATA_PATH).glob('*.xls')) + list(Path(RAW_DATA_PATH).glob('*.csv'))
    
    if not raw_files:
        print("오류: data/raw/ 디렉토리에 데이터 파일이 없습니다.")
        print("Excel 파일(.xlsx, .xls) 또는 CSV 파일을 추가해주세요.")
        return
    
    # Process raw data
    print("원본 데이터 파일 처리 중...")
    df_processed = process_raw_data(RAW_DATA_PATH, None)
    
    if df_processed.empty:
        print("오류: 파일에서 유효한 데이터를 추출할 수 없습니다.")
        return
    
    # Save processed data
    output_file = Path(PROCESSED_DATA_PATH) / 'processed_competitive_data.csv'
    df_processed.to_csv(output_file, index=False)
    print(f"처리된 데이터가 {output_file}에 저장되었습니다.")
    
    # Print summary statistics
    print("\n=== 데이터 요약 ===")
    print(f"총 제품 수: {len(df_processed)}")
    print(f"경쟁사 수: {df_processed['Competitor'].nunique()}")
    print(f"평균 가격: ₩{df_processed['Price'].mean():,.0f}")
    print(f"평균 부피당 가격: ₩{df_processed['Price_per_Volume'].mean():,.2f}/cm³")
    
    # Print competitor summary
    print("\n=== 경쟁사별 요약 ===")
    competitor_summary = df_processed.groupby('Competitor').agg({
        'Design': 'count',
        'Price': 'mean',
        'Price_per_Volume': 'mean'
    }).round(2)
    competitor_summary.columns = ['제품 수', '평균 가격', '평균 부피당 가격']
    print(competitor_summary)


if __name__ == "__main__":
    main()