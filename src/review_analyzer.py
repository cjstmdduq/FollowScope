"""
리뷰 데이터 분석 모듈
- 리뷰 상승률 추이 분석
- 경쟁사별 리뷰 통계 생성
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import os
from collections import defaultdict


class ReviewAnalyzer:
    def __init__(self, review_data_path):
        self.review_data_path = Path(review_data_path)
        self.review_data = {}
        self.load_review_data()
    
    def load_review_data(self):
        """리뷰 데이터 로드"""
        categories = ['roll', 'puzzle', 'tpu', 'double_side', 'folder', 'pet']
        
        for category in categories:
            category_path = self.review_data_path / category
            if not category_path.exists():
                continue
                
            self.review_data[category] = {}
            
            # 각 카테고리별 CSV 파일 로드
            for csv_file in category_path.glob('*.csv'):
                try:
                    df = pd.read_csv(csv_file, encoding='utf-8-sig')
                    
                    # 경쟁사 이름 추출 (파일명에서)
                    competitor_name = self.extract_competitor_name(csv_file.name)
                    
                    # 날짜 컬럼 처리
                    if '작성일' in df.columns:
                        df['작성일'] = pd.to_datetime(df['작성일'], errors='coerce')
                        df = df.dropna(subset=['작성일'])
                        
                        # 평점 숫자 변환
                        if '평점' in df.columns:
                            df['평점'] = pd.to_numeric(df['평점'], errors='coerce')
                        
                        print(f"  {competitor_name}: {len(df)} reviews, date range: {df['작성일'].min()} to {df['작성일'].max()}")
                        
                        # 디버깅: 현재 날짜와 비교
                        current_date = datetime.now()
                        print(f"    Current date: {current_date.date()}, Days from latest: {(current_date - df['작성일'].max()).days}")
                        
                        self.review_data[category][competitor_name] = df
                        
                except Exception as e:
                    print(f"Error loading {csv_file}: {str(e)}")
    
    def extract_competitor_name(self, filename):
        """파일명에서 경쟁사 이름 추출"""
        # 파일명에서 경쟁사 이름 추출
        name_mapping = {
            '따사룸': '따사룸',
            '파크론': '파크론', 
            '티지오매트': '티지오매트',
            '티지오': '티지오매트',
            '에코폼': '에코폼',
            '리포소홈': '리포소홈',
            '리포소': '리포소홈',
            '리코코': '리코코',
            '크림하우스': '크림하우스'
        }
        
        filename_lower = filename.lower()
        for key, value in name_mapping.items():
            if key in filename:
                return value
        
        # 첫 번째 단어 사용
        return filename.split()[0] if filename.split() else 'Unknown'
    
    
    def calculate_review_growth_rate(self, category='roll', days=30, start_date=None, end_date=None):
        """리뷰 상승률 계산
        
        Args:
            category (str): 분석할 카테고리
            days (int): 분석할 기간 (일) - start_date와 end_date가 None일 때만 사용
            start_date (str): 시작 날짜 (YYYY-MM-DD 형식)
            end_date (str): 종료 날짜 (YYYY-MM-DD 형식)
        """
        if category not in self.review_data:
            return {}
        
        growth_data = {}
        
        # 날짜 범위 설정
        if start_date and end_date:
            # 특정 기간 조회
            start_dt = pd.to_datetime(start_date)
            end_dt = pd.to_datetime(end_date)
            current_date = end_dt
            # 실제 기간 계산
            actual_days = (end_dt - start_dt).days + 1
        else:
            # 기본 기간 조회 (최근 N일)
            current_date = datetime.now()
            start_dt = current_date - timedelta(days=days)
            end_dt = current_date
            actual_days = days
        
        for competitor, df in self.review_data[category].items():
            if df.empty:
                continue
                
            # 일별 리뷰 수 계산
            daily_reviews = df.groupby(df['작성일'].dt.date).size().reset_index()
            daily_reviews.columns = ['date', 'review_count']
            daily_reviews['date'] = pd.to_datetime(daily_reviews['date'])
            
            # 디버깅: 일별 리뷰 데이터 확인
            print(f"  {competitor}: Total {len(daily_reviews)} days with reviews")
            
            # 설정된 기간으로 날짜 범위 생성
            date_range = pd.date_range(
                start=start_dt,
                end=end_dt,
                freq='D'
            )
            
            # 전체 날짜 인덱스 생성 (날짜 정규화)
            full_date_df = pd.DataFrame({'date': date_range})
            
            # 디버깅: 병합 전 데이터 확인
            print(f"    Date range type: {type(date_range[0])}, Daily reviews date type: {type(daily_reviews['date'].iloc[0]) if not daily_reviews.empty else 'No data'}")
            print(f"    Sample dates - Range: {date_range[0]}, Reviews: {daily_reviews['date'].iloc[0] if not daily_reviews.empty else 'No data'}")
            
            # 날짜를 문자열로 변환하여 병합
            full_date_df['date_str'] = full_date_df['date'].dt.strftime('%Y-%m-%d')
            daily_reviews['date_str'] = daily_reviews['date'].dt.strftime('%Y-%m-%d')
            
            # 병합 및 0으로 채우기
            merged_df = full_date_df.merge(daily_reviews[['date_str', 'review_count']], on='date_str', how='left')
            merged_df['date'] = full_date_df['date']  # 원래 날짜 컬럼 유지
            merged_df['review_count'] = merged_df['review_count'].fillna(0)
            
            # 디버깅: 필터링된 데이터 확인
            if merged_df['review_count'].sum() == 0:
                print(f"  WARNING: {competitor} has no reviews in the selected period ({actual_days} days)")
                print(f"    Date range: {date_range[0].date()} to {date_range[-1].date()}")
                print(f"    Available data: {df['작성일'].min().date()} to {df['작성일'].max().date()}")
            else:
                print(f"    {competitor}: Found {merged_df['review_count'].sum():.0f} reviews in {actual_days} days period")
            
            # 7일 이동평균 계산
            merged_df['ma_7d'] = merged_df['review_count'].rolling(window=7, min_periods=1).mean()
            
            # 성장률 계산 (전날 대비)
            merged_df['growth_rate'] = merged_df['review_count'].pct_change() * 100
            # 무한대 값 처리
            merged_df['growth_rate'] = merged_df['growth_rate'].replace([np.inf, -np.inf], 0)
            
            # 주간 성장률 계산 (7일 전 대비)
            merged_df['weekly_growth'] = merged_df['review_count'].pct_change(periods=7) * 100
            # 무한대 값 처리
            merged_df['weekly_growth'] = merged_df['weekly_growth'].replace([np.inf, -np.inf], 0)
            
            growth_data[competitor] = {
                'data': merged_df,
                'total_reviews': len(df),
                'avg_rating': df['평점'].mean() if '평점' in df.columns and not df['평점'].isna().all() else 0,
                'recent_7d_reviews': len(df[df['작성일'] >= current_date - timedelta(days=7)]),
                'recent_14d_reviews': len(df[df['작성일'] >= current_date - timedelta(days=14)]),
                'recent_30d_reviews': len(df[df['작성일'] >= current_date - timedelta(days=30)]),
                'recent_90d_reviews': len(df[df['작성일'] >= current_date - timedelta(days=90)]),
                'recent_180d_reviews': len(df[df['작성일'] >= current_date - timedelta(days=180)]),
                'recent_365d_reviews': len(df[df['작성일'] >= current_date - timedelta(days=365)])
            }
        
        return growth_data
    
    def get_review_trends_summary(self, category='roll'):
        """리뷰 트렌드 요약 통계"""
        growth_data = self.calculate_review_growth_rate(category)
        
        summary = {}
        for competitor, data in growth_data.items():
            df = data['data']
            recent_data = df.tail(7)  # 최근 7일 데이터
            
            # 무한대 값 처리
            recent_growth = recent_data['growth_rate'].replace([np.inf, -np.inf], 0).mean()
            weekly_growth = recent_data['weekly_growth'].replace([np.inf, -np.inf], 0).mean()
            
            # NaN 값 처리
            avg_rating = data['avg_rating']
            if pd.isna(avg_rating):
                avg_rating = 0
            
            avg_daily = df['review_count'].mean()
            if pd.isna(avg_daily):
                avg_daily = 0
                
            if pd.isna(recent_growth):
                recent_growth = 0
                
            if pd.isna(weekly_growth):
                weekly_growth = 0
            
            summary[competitor] = {
                'total_reviews': data['total_reviews'],
                'avg_rating': round(avg_rating, 2),
                'recent_7d_reviews': data['recent_7d_reviews'],
                'recent_14d_reviews': data['recent_14d_reviews'],
                'recent_30d_reviews': data['recent_30d_reviews'],
                'recent_90d_reviews': data['recent_90d_reviews'],
                'recent_180d_reviews': data['recent_180d_reviews'],
                'recent_365d_reviews': data['recent_365d_reviews'],
                'avg_daily_reviews': round(avg_daily, 2),
                'recent_growth_rate': round(recent_growth, 2),
                'weekly_growth_rate': round(weekly_growth, 2),
                'peak_reviews_day': df.loc[df['review_count'].idxmax(), 'date'].strftime('%Y-%m-%d') if not df.empty else None
            }
        
        return summary
    
    def get_chart_data(self, category='roll', period_days=30, start_date=None, end_date=None):
        """차트용 데이터 생성 (기간에 따른 그룹화)"""
        growth_data = self.calculate_review_growth_rate(category, period_days, start_date, end_date)
        
        chart_data = {
            'labels': [],
            'datasets': []
        }
        
        if not growth_data:
            return chart_data
        
        # 기간에 따른 그룹화 간격 결정
        actual_period = period_days
        if start_date and end_date:
            # 특정 기간 조회 시 실제 기간 계산
            start_dt = pd.to_datetime(start_date)
            end_dt = pd.to_datetime(end_date)
            actual_period = (end_dt - start_dt).days + 1
            
        if actual_period <= 30:
            group_days = 1  # 1일 단위
        elif actual_period <= 90:
            group_days = 3  # 3일 단위
        elif actual_period <= 180:
            group_days = 7  # 7일 단위
        else:
            group_days = 10  # 10일 단위
        
        # 첫 번째 경쟁사 데이터 기준으로 그룹화된 날짜 생성
        first_competitor = list(growth_data.keys())[0]
        raw_data = growth_data[first_competitor]['data']
        
        grouped_data = {}
        for competitor, data in growth_data.items():
            df = data['data'].copy()
            
            # 그룹화 수행
            if group_days > 1:
                # 날짜를 그룹 단위로 그룹화
                df['group'] = (df.index // group_days) * group_days
                grouped_df = df.groupby('group').agg({
                    'date': 'first',
                    'review_count': 'sum'
                }).reset_index()
            else:
                grouped_df = df[['date', 'review_count']].copy()
            
            grouped_data[competitor] = grouped_df
        
        # 라벨 생성
        dates = grouped_data[first_competitor]['date']
        
        # 라벨 형식 결정
        if actual_period <= 30:
            chart_data['labels'] = [d.strftime('%m-%d') for d in dates]
        elif actual_period <= 90:
            chart_data['labels'] = [d.strftime('%m-%d') for d in dates]
        else:
            chart_data['labels'] = [d.strftime('%m/%d') for d in dates]
        
        # 각 경쟁사별 데이터셋 생성
        colors = [
            '#4f46e5', '#ef4444', '#10b981', '#f59e0b',
            '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
        ]
        
        for i, (competitor, data) in enumerate(grouped_data.items()):
            color = colors[i % len(colors)]
            
            chart_data['datasets'].append({
                'label': competitor,
                'data': [0 if pd.isna(x) else x for x in data['review_count'].tolist()],
                'borderColor': color,
                'backgroundColor': color + '20',
                'fill': False,
                'tension': 0.4,  # 곡선 모양
                'pointRadius': 4,
                'pointHoverRadius': 6
            })
        
        return chart_data
    
    def get_growth_rate_chart_data(self, category='roll'):
        """성장률 차트용 데이터 생성"""
        growth_data = self.calculate_review_growth_rate(category)
        
        chart_data = {
            'labels': [],
            'datasets': []
        }
        
        if not growth_data:
            return chart_data
        
        # 날짜 라벨 생성
        first_competitor = list(growth_data.keys())[0]
        dates = growth_data[first_competitor]['data']['date']
        chart_data['labels'] = [d.strftime('%m-%d') for d in dates]
        
        # 각 경쟁사별 성장률 데이터셋 생성
        colors = [
            '#4f46e5', '#ef4444', '#10b981', '#f59e0b',
            '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
        ]
        
        for i, (competitor, data) in enumerate(growth_data.items()):
            color = colors[i % len(colors)]
            
            # 무한대 값 처리
            growth_rates = data['data']['growth_rate'].replace([np.inf, -np.inf], np.nan).fillna(0)
            
            chart_data['datasets'].append({
                'label': competitor,
                'data': growth_rates.tolist(),
                'borderColor': color,
                'backgroundColor': color + '20',
                'fill': False,
                'tension': 0.1
            })
        
        return chart_data


def process_review_data(review_data_path, period_days=30):
    """리뷰 데이터 처리 메인 함수"""
    analyzer = ReviewAnalyzer(review_data_path)
    
    results = {}
    for category in ['roll', 'puzzle']:
        if category in analyzer.review_data:
            results[category] = {
                'summary': analyzer.get_review_trends_summary(category),
                'chart_data': analyzer.get_chart_data(category, period_days)
            }
    
    return results


if __name__ == "__main__":
    # 테스트 실행
    review_path = Path(__file__).parent.parent / "FollowScope" / "data" / "reviews"
    
    print(f"Review path: {review_path}")
    print(f"Path exists: {review_path.exists()}")
    
    if review_path.exists():
        print("Review directories:")
        for item in review_path.iterdir():
            if item.is_dir():
                print(f"  {item.name}: {len(list(item.glob('*.csv')))} CSV files")
    
    analyzer = ReviewAnalyzer(review_path)
    
    # 롤매트 리뷰 트렌드 분석
    summary = analyzer.get_review_trends_summary('roll')
    print("\n롤매트 리뷰 트렌드 요약:")
    for competitor, stats in summary.items():
        print(f"{competitor}: {stats}")