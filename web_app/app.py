"""
Flask Web Application for FollowScope
"""

from flask import Flask, render_template, jsonify, request, redirect, url_for
from werkzeug.utils import secure_filename
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.config import get_competitor_rules
from src.parser import process_raw_data
from src.review_analyzer import ReviewAnalyzer
from PIL import Image
import io
try:
    from .file_watcher import FileWatcher
except ImportError:
    from file_watcher import FileWatcher
import pandas as pd
import json
from datetime import datetime

# Fix paths for web app
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRODUCT_DATA_PATH = os.path.join(PROJECT_ROOT, 'data', 'products')
REVIEW_DATA_PATH = os.path.join(PROJECT_ROOT, 'data', 'reviews')
LIVE_DATA_PATH = os.path.join(PROJECT_ROOT, 'data', 'live')
COUPON_DATA_PATH = os.path.join(PROJECT_ROOT, 'data', 'coupons')
MACRO_DATA_PATH = os.path.join(PROJECT_ROOT, 'scraping', 'macros')

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_EXTENSIONS'] = ['.csv', '.xlsx', '.xls']
app.config['JSON_AS_ASCII'] = False  # Enable proper Unicode in JSON responses

# Global variables
df_processed = None
last_update = None
file_watcher = None
live_data = []
coupon_data = []
review_data = []

def load_data():
    """Load and process data"""
    global df_processed, last_update
    try:
        # Try to load combined data first (includes folder mat data)
        combined_data_path = os.path.join(PROJECT_ROOT, 'data', 'products', 'combined_data.csv')
        if os.path.exists(combined_data_path):
            df_processed = pd.read_csv(combined_data_path, encoding='utf-8-sig')
            print(f"[{datetime.now()}] Combined data loaded: {len(df_processed)} products from {df_processed['Competitor'].nunique()} competitors")
        else:
            # Fallback to original processing
            df_processed = process_raw_data(PRODUCT_DATA_PATH, {})
            print(f"[{datetime.now()}] Raw data processed: {len(df_processed)} products from {df_processed['Competitor'].nunique()} competitors")
        
        last_update = datetime.now()
        return df_processed
    except Exception as e:
        print(f"Error loading data: {e}")
        if df_processed is None:
            df_processed = pd.DataFrame()
        return df_processed

def update_last_update_time():
    """Update last update time manually"""
    global last_update
    last_update = datetime.now()
    print(f"[{last_update}] Last update time manually updated")

def load_live_data():
    """Load live calendar data using only the latest CSV in LIVE_DATA_PATH."""
    import re
    global live_data
    live_data = []

    # Load excluded brands from file
    excluded_brands = set()
    excluded_brands_file = os.path.join(os.path.dirname(__file__), 'excluded_brands.txt')
    if os.path.exists(excluded_brands_file):
        with open(excluded_brands_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    excluded_brands.add(line)
        print(f"Loaded {len(excluded_brands)} excluded brands")

    try:
        latest_csv_path = None
        latest_key = None

        # Pick only the latest NSLive_GCal_YYYYMMDD.csv; fallback to newest mtime
        if os.path.exists(LIVE_DATA_PATH):
            csv_files = [f for f in os.listdir(LIVE_DATA_PATH) if f.endswith('.csv')]
            for filename in csv_files:
                filepath = os.path.join(LIVE_DATA_PATH, filename)
                m = re.match(r"^NSLive_GCal_(\d{8})\.csv$", filename)
                key = None
                if m:
                    key = (1, m.group(1))  # Prefer pattern matches; compare by date string
                else:
                    try:
                        key = (0, int(os.path.getmtime(filepath)))  # Fallback by mtime
                    except Exception:
                        key = (0, 0)

                if latest_key is None or key > latest_key:
                    latest_key = key
                    latest_csv_path = filepath

        if latest_csv_path and os.path.exists(latest_csv_path):
            print(f"Loading live data from: {os.path.basename(latest_csv_path)}")
            df = pd.read_csv(latest_csv_path, encoding='utf-8-sig')

            for _, row in df.iterrows():
                # Extract competitor name from Subject field
                competitor = str(row.get('Subject', ''))

                # Map competitor names to standard names used in the system
                competitor_mapping = {
                    '꿈비스토어': '꿈비',
                    'CREAMHAUS': '크림하우스',
                    '크림하우스': '크림하우스',
                    '젤리맘': '젤리맘',
                    '파크론몰': '파크론',
                    '티지오매트': '티지오매트',
                    '바르맘': '바르맘',
                    '리포소 홈': '리포소홈',
                    '따사룸': '따사룸',
                    '플로리아 FLORIA': '플로리아',
                    '국민매트 알집매트': '알집매트',
                    '아소방': '아소방',
                    '소베맘': '소베맘',
                    '카라즈': '카라즈',
                    '아가드': '아가드',
                    '불로홈': '불로홈',
                    '아가앤': '아가앤',
                    '베베핏 Bebefit': '베베핏',
                    '베베데코': '베베데코',
                    '히요코베이비': '히요코베이비',
                    '말랑하니': '말랑하니',
                    '무무슈': '무무슈',
                    '라비킷': '라비킷',
                    '곰표한일전자공식몰': '곰표한일',
                    '루트비 공식몰': '루트비',
                    '두리 공식스토어': '두리',
                    '스위트패밀리': '스위트패밀리',
                    '핑크퐁 공식스토어': '핑크퐁',
                    '위드앤스토어': '위드앤',
                    '네이쳐러브메레': '네이쳐러브메레',
                    '위틀스토어': '위틀',
                    '킨초': '킨초',
                    '언니에반하다': '언니에반하다'
                }

                # Use mapped name or original if not in mapping
                competitor = competitor_mapping.get(competitor, competitor)

                # Skip excluded brands
                if competitor in excluded_brands or row.get('Subject', '') in excluded_brands:
                    continue

                live_event = {
                    'date': str(row.get('Start Date', '')),
                    'competitor': competitor,
                    'title': str(row.get('Description', '')),
                    'time': str(row.get('Start Time', '')) if pd.notna(row.get('Start Time')) else '',
                    'description': f"[{competitor}] {row.get('Description', '')}"
                }

                # Validate required fields
                if live_event['date'] and live_event['competitor'] and live_event['title']:
                    try:
                        date_obj = pd.to_datetime(live_event['date'])
                        live_event['date'] = date_obj.strftime('%Y-%m-%d')
                        live_data.append(live_event)
                    except Exception:
                        pass

        # Remove duplicates based on date, time, and competitor
        seen = set()
        unique_live_events = []
        for live_event in live_data:
            key = f"{live_event['date']}_{live_event['time']}_{live_event['competitor']}"
            if key not in seen:
                seen.add(key)
                unique_live_events.append(live_event)

        live_data = unique_live_events

        print(f"Loaded {len(live_data)} live events")
    except Exception as e:
        print(f"Error loading live data: {e}")
        live_data = []

def save_live_data():
    """Deprecated - live data is now loaded directly from CSV files"""
    pass

def load_coupon_data():
    """Load coupon data from CSV files in subdirectories (roll, puzzle, pet)"""
    global coupon_data
    coupon_data = []
    
    try:
        # Define product categories
        categories = ['roll', 'puzzle', 'pet']
        total_files = 0
        
        for category in categories:
            category_path = os.path.join(COUPON_DATA_PATH, category)
            if not os.path.exists(category_path):
                print(f"Category directory not found: {category_path}")
                continue
            
            # Get all CSV files in the category directory
            csv_files = [f for f in os.listdir(category_path) if f.endswith('.csv')]
            
            if not csv_files:
                print(f"No CSV files found in {category} directory")
                continue
            
            print(f"Found {len(csv_files)} CSV files in {category}: {csv_files}")
            today = datetime.now().date()
            
            # Read each CSV file and merge data
            for csv_file in csv_files:
                csv_path = os.path.join(category_path, csv_file)
                try:
                    # Read CSV file
                    df = pd.read_csv(csv_path, encoding='utf-8-sig')
                    print(f"Processing {category}/{csv_file}: {len(df)} rows")
                    total_files += 1
                    
                    # Process each row
                    for _, row in df.iterrows():
                        # Get competitor name and apply mapping
                        competitor = str(row.get('competitor', ''))
                        
                        # Use the same mapping as live data
                        competitor_mapping = {
                        '꿈비스토어': '꿈비',
                        'CREAMHAUS': '크림하우스',
                        '크림하우스': '크림하우스',
                        '젤리맘': '젤리맘',
                        '파크론몰': '파크론',
                        '티지오매트': '티지오매트',
                        '바르맘': '바르맘',
                        '리포소 홈': '리포소홈',  # Fix space issue
                        '따사룸': '따사룸',
                        '플로리아 FLORIA': '플로리아',
                        '국민매트 알집매트': '알집매트',
                        '아소방': '아소방',
                        '소베맘': '소베맘',
                        '카라즈': '카라즈',
                        '아가드': '아가드',
                        '불로홈': '불로홈',
                        '아가앤': '아가앤',
                        '베베핏 Bebefit': '베베핏',
                        '베베데코': '베베데코',
                        '히요코베이비': '히요코베이비',
                        '말랑하니': '말랑하니',
                        '무무슈': '무무슈',
                        '라비킷': '라비킷',
                        '곰표한일전자공식몰': '곰표한일',
                        '루트비 공식몰': '루트비',
                        '두리 공식스토어': '두리',
                        '스위트패밀리': '스위트패밀리',
                        '핑크퐁 공식스토어': '핑크퐁',
                        '위드앤스토어': '위드앤',
                        '네이쳐러브메레': '네이쳐러브메레',
                        '위틀스토어': '위틀',
                        '킨초': '킨초',
                        '언니에반하다': '언니에반하다'
                        }
                        
                        # Apply mapping
                        competitor = competitor_mapping.get(competitor, competitor)
                        
                        coupon = {
                        'competitor': competitor,
                        'type': str(row.get('type', '')) if pd.notna(row.get('type')) else '쿠폰',  # Add type field
                        'coupon_name': str(row.get('coupon_name', '')),
                        'discount_rate': str(row.get('discount_rate', '')) if pd.notna(row.get('discount_rate')) else '',
                        'discount_amount': str(row.get('discount_amount', '')) if pd.notna(row.get('discount_amount')) else '',
                        'min_purchase': str(row.get('min_purchase', '')) if pd.notna(row.get('min_purchase')) else '',
                        'max_discount': str(row.get('max_discount', '')) if pd.notna(row.get('max_discount')) else '',
                        'usage_limit': str(row.get('usage_limit', '')) if pd.notna(row.get('usage_limit')) else '',
                        'start_date': str(row.get('start_date', '')) if pd.notna(row.get('start_date')) else '',
                        'end_date': str(row.get('end_date', '')) if pd.notna(row.get('end_date')) else '',
                        'description': str(row.get('description', '')) if pd.notna(row.get('description')) else '',
                        'source_file': csv_file  # Track which file this came from
                        }
                        
                        # Calculate status
                        status = 'active'
                        if coupon['start_date'] and coupon['end_date']:
                            try:
                                start_date = pd.to_datetime(coupon['start_date']).date()
                                end_date = pd.to_datetime(coupon['end_date']).date()
                                
                                if today < start_date:
                                    status = 'upcoming'
                                elif today > end_date:
                                    status = 'expired'
                                else:
                                    status = 'active'
                            except:
                                pass
                        
                        coupon['status'] = status
                        
                        # Skip invalid or unwanted entries
                        if (coupon['coupon_name'].lower() in ['적용 안함', '적용안함', '', '-'] or
                            not coupon['competitor'] or 
                            not coupon['coupon_name'] or
                            (not coupon['discount_rate'] and not coupon['discount_amount'])):
                            continue
                        
                        # Add product category to coupon data
                        coupon['product_category'] = category
                        
                        # Add valid coupon
                        coupon_data.append(coupon)
                    
                except Exception as e:
                    print(f"Error reading {category}/{csv_file}: {e}")
                    continue
        
        print(f"Total loaded: {len(coupon_data)} coupons from {total_files} files across {len(categories)} categories")
        
    except Exception as e:
        print(f"Error loading coupon data: {e}")
        coupon_data = []

def save_coupon_data():
    """No longer needed - we read directly from CSV"""
    pass

def load_review_data():
    """Load review data from CSV files"""
    global review_data
    review_data = []
    
    try:
        categories = ['roll', 'puzzle', 'tpu', 'double_side', 'folder', 'pet']
        
        for category in categories:
            category_path = os.path.join(REVIEW_DATA_PATH, category)
            if not os.path.exists(category_path):
                continue
            
            # 각 카테고리별 CSV 파일 로드
            for csv_file in os.listdir(category_path):
                if not csv_file.endswith('.csv'):
                    continue
                    
                csv_path = os.path.join(category_path, csv_file)
                try:
                    df = pd.read_csv(csv_path, encoding='utf-8-sig')
                    
                    # 경쟁사 이름 추출 (파일명에서)
                    competitor_name = csv_file.split()[0] if csv_file.split() else 'Unknown'
                    
                    # 각 리뷰를 review_data 형식으로 변환
                    for _, row in df.iterrows():
                        review = {
                            'competitor': competitor_name,
                            'category': category,
                            'rating': row.get('평점', 0),
                            'date': str(row.get('작성일', '')),
                            'title': str(row.get('제목', '')),
                            'content': str(row.get('내용', '')),
                            'product': str(row.get('상품명', ''))
                        }
                        review_data.append(review)
                        
                except Exception as e:
                    print(f"Error loading {csv_file}: {str(e)}")
        
        print(f"Loaded {len(review_data)} reviews from CSV files")
        
    except Exception as e:
        print(f"Error loading review data: {e}")
        review_data = []

def save_review_data():
    """Deprecated - review data is now loaded directly from CSV files"""
    pass

@app.route('/')
def index():
    """Single main page: Dashboard (Heatmap)"""
    return render_template('dashboard.html')

@app.route('/dashboard')
def dashboard():
    """Keep compatibility; unify to main page"""
    return redirect('/')

@app.route('/feed')
def feed_page():
    """Single page app: redirect feed to main page"""
    return redirect('/')

@app.route('/api/data')
def get_data():
    """API endpoint to get processed data"""
    if df_processed is None:
        load_data()
    
    # Get filters from query params
    category = request.args.get('category', None)
    product_type = request.args.get('product_type', None)
    
    # Import analysis functions
    from src.analysis import filter_by_category
    
    # Filter by category if specified
    df_filtered = filter_by_category(df_processed, category) if category else df_processed
    
    # Filter by product type (roll/puzzle/pet/folder)
    if product_type and not df_filtered.empty:
        if product_type == 'roll':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('롤매트', na=False)]
        elif product_type == 'puzzle':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('퍼즐매트', na=False)]
        elif product_type == 'pet':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('강아지매트', na=False)]
        elif product_type == 'folder':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('폴더매트', na=False)]
    
    # Always return all data without pagination
    data = df_filtered.to_dict('records')
    return jsonify(data)


@app.route('/api/competitors')
def get_competitors():
    """Get unique competitors"""
    if df_processed is None:
        load_data()
    
    competitors = df_processed['Competitor'].unique().tolist()
    return jsonify(competitors)

@app.route('/api/statistics')
def get_statistics():
    """Get data statistics"""
    if df_processed is None or df_processed.empty:
        load_data()
    
    # Get filters from query params
    category = request.args.get('category', None)
    product_type = request.args.get('product_type', None)
    
    # Import analysis functions
    from src.analysis import filter_by_category, get_available_categories
    
    # Filter by category if specified
    df_filtered = filter_by_category(df_processed, category) if category else df_processed
    
    # Filter by product type (roll/puzzle/pet/folder)
    if product_type and not df_filtered.empty:
        if product_type == 'roll':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('롤매트', na=False)]
        elif product_type == 'puzzle':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('퍼즐매트', na=False)]
        elif product_type == 'pet':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('강아지매트', na=False)]
        elif product_type == 'folder':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('폴더매트', na=False)]
    
    if df_filtered.empty:
        return jsonify({
            'total_products': 0,
            'competitors': 0,
            'avg_price_per_volume': 0,
            'price_range': {'min': 0, 'max': 0},
            'thickness_range': {'min': 0, 'max': 0},
            'last_update': last_update.strftime('%Y-%m-%d %H:%M:%S') if last_update else 'Never',
            'categories': get_available_categories(df_processed) if df_processed is not None else []
        })
    
    stats = {
        'total_products': len(df_filtered),
        'competitors': df_filtered['Competitor'].nunique(),
        'avg_price_per_volume': df_filtered['Price_per_Volume'].mean(),
        'price_range': {
            'min': df_filtered['Price'].min(),
            'max': df_filtered['Price'].max()
        },
        'thickness_range': {
            'min': df_filtered['Thickness_cm'].min(),
            'max': df_filtered['Thickness_cm'].max()
        },
        'last_update': last_update.strftime('%Y-%m-%d %H:%M:%S') if last_update else 'Never',
        'categories': get_available_categories(df_processed)
    }
    return jsonify(stats)

@app.route('/api/competitor/<name>')
def get_competitor_data(name):
    """Get data for specific competitor"""
    if df_processed is None:
        load_data()
    
    # Get category filter from query params
    category = request.args.get('category', None)
    
    # Import analysis functions
    from src.analysis import filter_by_category
    
    # Filter by category first if specified
    df_filtered = filter_by_category(df_processed, category) if category else df_processed
    
    # Then filter by competitor
    competitor_data = df_filtered[df_filtered['Competitor'] == name]
    return jsonify(competitor_data.to_dict('records'))

@app.route('/api/price-comparison')
def price_comparison():
    """Get price comparison data by thickness range"""
    thickness_min = float(request.args.get('thickness_min', 0))
    thickness_max = float(request.args.get('thickness_max', 999))
    category = request.args.get('category', None)
    product_type = request.args.get('product_type', None)
    
    if df_processed is None:
        load_data()
    
    # Import analysis functions
    from src.analysis import filter_by_category
    
    # Filter by category first if specified
    df_filtered = filter_by_category(df_processed, category) if category else df_processed
    
    # Filter by product type (roll/puzzle/pet/folder)
    if product_type and not df_filtered.empty:
        if product_type == 'roll':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('롤매트', na=False)]
        elif product_type == 'puzzle':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('퍼즐매트', na=False)]
        elif product_type == 'pet':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('강아지매트', na=False)]
        elif product_type == 'folder':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('폴더매트', na=False)]
    
    # Then filter by thickness
    filtered = df_filtered[
        (df_filtered['Thickness_cm'] >= thickness_min) & 
        (df_filtered['Thickness_cm'] <= thickness_max)
    ]
    
    # Group by competitor and calculate average price per volume
    comparison = filtered.groupby('Competitor')['Price_per_Volume'].mean().to_dict()
    
    return jsonify(comparison)

## Removed data center and file upload endpoints

@app.route('/api/promotions', methods=['GET'])
def get_promotions():
    """Get live calendar data (keeping endpoint name for compatibility)"""
    return jsonify(live_data)

## Removed live data upload endpoint

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get available product categories"""
    if df_processed is None:
        load_data()
    
    from src.analysis import get_available_categories
    categories = get_available_categories(df_processed) if df_processed is not None else []
    
    # Add '전체' option at the beginning
    return jsonify(['전체'] + categories)

@app.route('/api/coupons', methods=['GET'])
def get_coupons():
    """Get coupon data"""
    return jsonify(coupon_data)

## Removed coupon upload endpoint

@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    """Get review data"""
    return jsonify(review_data)

## Removed review upload endpoint

@app.route('/api/review-trends', methods=['GET'])
def get_review_trends():
    """Get review trends data using ReviewAnalyzer"""
    category = request.args.get('category', 'roll')
    period = request.args.get('period', '30')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        analyzer = ReviewAnalyzer(REVIEW_DATA_PATH)
        
        # period가 'custom'인 경우 기본값 사용, 아니면 int로 변환
        if period == 'custom':
            period_days = 30  # 기본값 (실제로는 start_date, end_date가 사용됨)
        else:
            period_days = int(period)
        
        # Get review trends analysis
        results = {
            'summary': analyzer.get_review_trends_summary(category),
            'chart_data': analyzer.get_chart_data(category, period_days, start_date, end_date)
        }
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/macros')
def get_macro_list():
    """Get list of available macro files"""
    try:
        if not os.path.exists(MACRO_DATA_PATH):
            return jsonify([])
        
        macro_files = []
        display_name_map = {
            'option_scraper_2depth.js': '옵션 추출기 (2단계)',
            'option_scraper_3depth.js': '옵션 추출기 (3단계)',
            'coupon_scraper.js': '쿠폰 추출기',
            'review_scraper_by_date.js': '리뷰 날짜별 추출기',
            'live_scraper.js': '라이브 추출기',
            'live_chat_scraper.js': '라이브 채팅 구매인증 추출기',
            'price_monitor.js': '가격 모니터링 매크로',
            'bulk_data_scraper.js': '대량 데이터 수집 매크로',
        }

        # Priority order for sorting
        priority_order = [
            'option_scraper_3depth.js',
            'option_scraper_2depth.js',
            'coupon_scraper.js',
            'review_scraper_by_date.js',
            'live_scraper.js',
            'live_chat_scraper.js',
        ]
        token_map = {
            'analysis': '분석',
            'bulk': '대량',
            'by': '',
            'chat': '채팅',
            'chatbot': '챗봇',
            'coupon': '쿠폰',
            'data': '데이터',
            'date': '날짜',
            'depth': '단계',
            'live': '라이브',
            'macro': '매크로',
            'monitor': '모니터링',
            'option': '옵션',
            'order': '주문',
            'price': '가격',
            'review': '리뷰',
            'scraper': '추출기',
        }
        for filename in os.listdir(MACRO_DATA_PATH):
            if filename.endswith('.js'):
                # 한글 표기 매칭
                display_name = display_name_map.get(filename)
                if not display_name:
                    if 'naver_shopping' in filename:
                        display_name = '네이버 쇼핑 크롤링 매크로'
                    else:
                        base = filename.replace('.js', '')
                        tokens = base.split('_')
                        translated = []
                        for token in tokens:
                            translated.append(token_map.get(token, token))
                        display_name = ' '.join(filter(None, translated)) or base.replace('_', ' ')

                macro_files.append({
                    'filename': filename,
                    'display_name': display_name,
                    'id': filename.replace('.js', '').replace('_', '-')
                })

        # Sort by priority order, then alphabetically
        def get_sort_key(macro):
            filename = macro['filename']
            if filename in priority_order:
                return (0, priority_order.index(filename))
            else:
                return (1, filename)

        macro_files.sort(key=get_sort_key)

        return jsonify(macro_files)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/macro/<filename>')
def get_macro(filename):
    """Serve macro files"""
    try:
        # Sanitize filename for security
        if not filename.endswith('.js'):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Check if file exists in macro directory
        macro_path = os.path.join(MACRO_DATA_PATH, filename)
        if not os.path.exists(macro_path):
            return jsonify({'error': 'Macro file not found'}), 404
        
        # Read and return file content
        with open(macro_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return content, 200, {'Content-Type': 'text/plain; charset=utf-8'}
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/feeds', methods=['GET'])
def get_feeds():
    """Get feed posts with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Load feeds from JSON file
        feeds_file = os.path.join(PROJECT_ROOT, 'data', 'feeds', 'feeds.json')
        
        if not os.path.exists(feeds_file):
            return jsonify({'feeds': [], 'total': 0, 'page': page, 'per_page': per_page})
        
        with open(feeds_file, 'r', encoding='utf-8') as f:
            all_feeds = json.load(f)
        
        # Sort by created_at (newest first)
        all_feeds.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        # Paginate
        total = len(all_feeds)
        start = (page - 1) * per_page
        end = start + per_page
        feeds = all_feeds[start:end]
        
        return jsonify({
            'feeds': feeds,
            'total': total,
            'page': page,
            'per_page': per_page,
            'has_more': end < total
        })
    except Exception as e:
        print(f"Error getting feeds: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/feeds', methods=['POST'])
def create_feed():
    """Create a new feed post"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        # Create feed object
        feed = {
            'id': str(datetime.now().timestamp()).replace('.', ''),
            'content': data['content'],
            'tags': data.get('tags', []),
            'images': data.get('images', []),
            'created_at': datetime.now().isoformat(),
            'author': data.get('author', 'FollowScope')
        }
        
        # Load existing feeds
        feeds_file = os.path.join(PROJECT_ROOT, 'data', 'feeds', 'feeds.json')
        
        if os.path.exists(feeds_file):
            with open(feeds_file, 'r', encoding='utf-8') as f:
                feeds = json.load(f)
        else:
            feeds = []
        
        # Add new feed
        feeds.append(feed)
        
        # Save feeds
        os.makedirs(os.path.dirname(feeds_file), exist_ok=True)
        with open(feeds_file, 'w', encoding='utf-8') as f:
            json.dump(feeds, f, ensure_ascii=False, indent=2)
        
        return jsonify(feed), 201
    except Exception as e:
        print(f"Error creating feed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/feeds/<feed_id>', methods=['PUT'])
def update_feed(feed_id):
    """Update an existing feed post"""
    try:
        data = request.get_json()
        
        # Load existing feeds
        feeds_file = os.path.join(PROJECT_ROOT, 'data', 'feeds', 'feeds.json')
        
        if not os.path.exists(feeds_file):
            return jsonify({'error': 'Feed not found'}), 404
        
        with open(feeds_file, 'r', encoding='utf-8') as f:
            feeds = json.load(f)
        
        # Find and update the feed
        feed_updated = False
        for feed in feeds:
            if feed['id'] == feed_id:
                # Update fields
                feed['content'] = data.get('content', feed['content'])
                feed['tags'] = data.get('tags', feed['tags'])
                feed['updated_at'] = datetime.now().isoformat()
                feed_updated = True
                break
        
        if not feed_updated:
            return jsonify({'error': 'Feed not found'}), 404
        
        # Save updated feeds
        with open(feeds_file, 'w', encoding='utf-8') as f:
            json.dump(feeds, f, ensure_ascii=False, indent=2)
        
        return jsonify({'message': 'Feed updated successfully'}), 200
    except Exception as e:
        print(f"Error updating feed: {e}")
        return jsonify({'error': str(e)}), 500

def delete_feed_images(image_urls):
    """Delete image files associated with a feed"""
    deleted_images = []
    failed_images = []

    for image_url in image_urls:
        try:
            # Extract filename from URL (e.g., "/api/feed-image/filename.webp" -> "filename.webp")
            if image_url.startswith('/api/feed-image/'):
                filename = image_url.replace('/api/feed-image/', '')
                image_path = os.path.join(PROJECT_ROOT, 'data', 'feeds', 'images', filename)

                if os.path.exists(image_path):
                    os.remove(image_path)
                    deleted_images.append(filename)
                    print(f"Deleted image: {filename}")
                else:
                    print(f"Image not found: {filename}")
                    failed_images.append(filename)
        except Exception as e:
            print(f"Error deleting image {image_url}: {e}")
            failed_images.append(image_url)

    return deleted_images, failed_images

@app.route('/api/feeds/<feed_id>', methods=['DELETE'])
def delete_feed(feed_id):
    """Delete a feed post and its associated images"""
    try:
        feeds_file = os.path.join(PROJECT_ROOT, 'FollowScope', 'data', 'feeds', 'feeds.json')

        if not os.path.exists(feeds_file):
            return jsonify({'error': 'Feed not found'}), 404

        with open(feeds_file, 'r', encoding='utf-8') as f:
            feeds = json.load(f)

        # Find the feed to delete and get its images
        feed_to_delete = None
        for feed in feeds:
            if feed.get('id') == feed_id:
                feed_to_delete = feed
                break

        if feed_to_delete is None:
            return jsonify({'error': 'Feed not found'}), 404

        # Delete associated images
        images_to_delete = feed_to_delete.get('images', [])
        deleted_images = []
        failed_images = []

        if images_to_delete:
            deleted_images, failed_images = delete_feed_images(images_to_delete)

        # Filter out the feed to delete
        feeds = [f for f in feeds if f.get('id') != feed_id]

        # Save updated feeds
        with open(feeds_file, 'w', encoding='utf-8') as f:
            json.dump(feeds, f, ensure_ascii=False, indent=2)

        response_message = 'Feed deleted successfully'
        if deleted_images:
            response_message += f' (removed {len(deleted_images)} image(s))'
        if failed_images:
            response_message += f' (failed to remove {len(failed_images)} image(s))'

        return jsonify({
            'message': response_message,
            'deleted_images': deleted_images,
            'failed_images': failed_images
        }), 200
    except Exception as e:
        print(f"Error deleting feed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/feeds/cleanup-images', methods=['POST'])
def cleanup_orphaned_images():
    """Clean up orphaned images that are no longer referenced by any feed"""
    try:
        feeds_file = os.path.join(PROJECT_ROOT, 'data', 'feeds', 'feeds.json')
        images_dir = os.path.join(PROJECT_ROOT, 'data', 'feeds', 'images')

        if not os.path.exists(feeds_file) or not os.path.exists(images_dir):
            return jsonify({'message': 'No feeds or images directory found'}), 200

        # Get all referenced images from feeds
        with open(feeds_file, 'r', encoding='utf-8') as f:
            feeds = json.load(f)

        referenced_images = set()
        for feed in feeds:
            for image_url in feed.get('images', []):
                if image_url.startswith('/api/feed-image/'):
                    filename = image_url.replace('/api/feed-image/', '')
                    referenced_images.add(filename)

        # Get all image files in directory
        all_image_files = set()
        for filename in os.listdir(images_dir):
            if filename.lower().endswith(('.webp', '.jpg', '.jpeg', '.png', '.gif', '.bmp')):
                all_image_files.add(filename)

        # Find orphaned images
        orphaned_images = all_image_files - referenced_images

        # Delete orphaned images
        deleted_count = 0
        deleted_size = 0
        for filename in orphaned_images:
            try:
                image_path = os.path.join(images_dir, filename)
                file_size = os.path.getsize(image_path)
                os.remove(image_path)
                deleted_count += 1
                deleted_size += file_size
                print(f"Deleted orphaned image: {filename} ({file_size} bytes)")
            except Exception as e:
                print(f"Error deleting orphaned image {filename}: {e}")

        # Convert bytes to human readable format
        if deleted_size < 1024:
            size_str = f"{deleted_size} bytes"
        elif deleted_size < 1024 * 1024:
            size_str = f"{deleted_size / 1024:.1f} KB"
        else:
            size_str = f"{deleted_size / (1024 * 1024):.1f} MB"

        return jsonify({
            'message': f'Cleanup completed: {deleted_count} orphaned images deleted',
            'deleted_count': deleted_count,
            'freed_space': size_str,
            'referenced_images': len(referenced_images),
            'total_images_before': len(all_image_files)
        }), 200

    except Exception as e:
        print(f"Error cleaning up orphaned images: {e}")
        return jsonify({'error': str(e)}), 500

def optimize_image(image_data, max_width=800, max_height=600, quality=75):
    """Optimize image: resize and convert to WebP format"""
    try:
        # Open image from bytes
        image = Image.open(io.BytesIO(image_data))

        # Convert to RGB if necessary (for WebP compatibility)
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')

        # Smart resize based on content type
        width, height = image.size

        # For screenshots/charts (usually wide), optimize more aggressively
        aspect_ratio = width / height
        if aspect_ratio > 1.5:  # Wide image (likely screenshot)
            max_width, max_height = 700, 400
            quality = 70
        elif aspect_ratio < 0.7:  # Tall image (likely mobile screenshot)
            max_width, max_height = 400, 700
            quality = 70
        else:  # Square-ish image (likely photo)
            max_width, max_height = 600, 600
            quality = 75

        if width > max_width or height > max_height:
            ratio = min(max_width / width, max_height / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Save as WebP with maximum optimization
        output = io.BytesIO()
        image.save(output, format='WebP', quality=quality, optimize=True, method=6, lossless=False)
        output.seek(0)

        return output.getvalue(), image.size
    except Exception as e:
        print(f"Error optimizing image: {e}")
        return None

@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    """Handle image upload for feeds with optimization"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Check file size (limit to 10MB)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning

        if file_size > 5 * 1024 * 1024:  # 5MB
            return jsonify({'error': 'File too large. Maximum size is 5MB'}), 400

        # Check file type
        allowed_extensions = {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if file_ext not in allowed_extensions:
            return jsonify({'error': 'Invalid file type. Allowed: JPG, PNG, GIF, BMP, WebP'}), 400

        # Read and optimize image
        image_data = file.read()
        result = optimize_image(image_data)

        if result is None:
            return jsonify({'error': 'Failed to process image'}), 500

        optimized_data, final_size = result

        # Generate unique filename with .webp extension
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_filename = secure_filename(file.filename.rsplit('.', 1)[0])  # Remove original extension
        filename = f"{timestamp}_{safe_filename}.webp"

        # Save optimized image
        upload_path = os.path.join(PROJECT_ROOT, 'data', 'feeds', 'images')
        os.makedirs(upload_path, exist_ok=True)

        filepath = os.path.join(upload_path, filename)
        with open(filepath, 'wb') as f:
            f.write(optimized_data)

        # Return relative path
        relative_path = f"/api/feed-image/{filename}"

        # Log optimization results
        original_size = len(image_data)
        optimized_size = len(optimized_data)
        compression_ratio = (1 - optimized_size / original_size) * 100
        print(f"Image optimized: {original_size} -> {optimized_size} bytes ({compression_ratio:.1f}% reduction)")
        print(f"Final dimensions: {final_size[0]}x{final_size[1]}")

        return jsonify({
            'url': relative_path,
            'original_size': original_size,
            'optimized_size': optimized_size,
            'compression_ratio': f"{compression_ratio:.1f}%",
            'dimensions': f"{final_size[0]}x{final_size[1]}"
        }), 200
    except Exception as e:
        print(f"Error uploading image: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/feed-image/<filename>')
def serve_feed_image(filename):
    """Serve feed images"""
    try:
        image_path = os.path.join(PROJECT_ROOT, 'data', 'feeds', 'images', filename)
        if os.path.exists(image_path):
            from flask import send_file
            return send_file(image_path)
        else:
            return jsonify({'error': 'Image not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Initialize data on module load (for Gunicorn)
print("Initializing FollowScope Web App...")
load_data()
load_live_data()
load_coupon_data()
load_review_data()

# Start file watcher
file_watcher = FileWatcher(PRODUCT_DATA_PATH, load_data, interval=10)
file_watcher.start()

print(f"Watching directory: {PRODUCT_DATA_PATH}")

if __name__ == '__main__':
    # Load data on startup
    load_data()
    load_live_data()
    load_coupon_data()
    load_review_data()
    
    # Start file watcher
    file_watcher = FileWatcher(PRODUCT_DATA_PATH, load_data, interval=10)
    file_watcher.start()
    
    print(f"Starting FollowScope Web App...")
    print(f"Watching directory: {PRODUCT_DATA_PATH}")
    
    # Run Flask app
    app.run(debug=True, port=8080, host='0.0.0.0')
