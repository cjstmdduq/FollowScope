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
try:
    from .file_watcher import FileWatcher
except ImportError:
    from file_watcher import FileWatcher
import pandas as pd
import json
from datetime import datetime

# Fix paths for web app
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRODUCT_DATA_PATH = os.path.join(PROJECT_ROOT, 'FollowScope', 'data', 'products')
REVIEW_DATA_PATH = os.path.join(PROJECT_ROOT, 'FollowScope', 'data', 'reviews')
LIVE_DATA_PATH = os.path.join(PROJECT_ROOT, 'FollowScope', 'data', 'live')
COUPON_DATA_PATH = os.path.join(PROJECT_ROOT, 'FollowScope', 'data', 'coupons')
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
        # Process data without predefined rules (uses dynamic rules)
        df_processed = process_raw_data(PRODUCT_DATA_PATH, {})
        last_update = datetime.now()
        print(f"[{last_update}] Data reloaded: {len(df_processed)} products from {df_processed['Competitor'].nunique()} competitors")
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
    """Load live calendar data from CSV file"""
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
        # Check for CSV files in the live directory
        if os.path.exists(LIVE_DATA_PATH):
            for filename in os.listdir(LIVE_DATA_PATH):
                if filename.endswith('.csv'):
                    filepath = os.path.join(LIVE_DATA_PATH, filename)
                    # Read CSV file with Google Calendar format
                    df = pd.read_csv(filepath, encoding='utf-8-sig')
                    
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
                            # Parse date to ensure correct format
                            try:
                                date_obj = pd.to_datetime(live_event['date'])
                                live_event['date'] = date_obj.strftime('%Y-%m-%d')
                                live_data.append(live_event)
                            except:
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
        
        print(f"Loaded {len(live_data)} live events from CSV files")
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
    """Main feed page"""
    return render_template('feed.html')

@app.route('/dashboard')
def dashboard():
    """Dashboard page"""
    return render_template('dashboard.html')

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
    
    # Filter by product type (roll/puzzle/pet)
    if product_type and not df_filtered.empty:
        if product_type == 'roll':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('롤매트', na=False)]
        elif product_type == 'puzzle':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('퍼즐매트', na=False)]
        elif product_type == 'pet':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('강아지매트', na=False)]
    
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
    
    # Filter by product type (roll/puzzle/pet)
    if product_type and not df_filtered.empty:
        if product_type == 'roll':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('롤매트', na=False)]
        elif product_type == 'puzzle':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('퍼즐매트', na=False)]
        elif product_type == 'pet':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('강아지매트', na=False)]
    
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
    
    # Filter by product type (roll/puzzle/pet)
    if product_type and not df_filtered.empty:
        if product_type == 'roll':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('롤매트', na=False)]
        elif product_type == 'puzzle':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('퍼즐매트', na=False)]
        elif product_type == 'pet':
            df_filtered = df_filtered[df_filtered['product_category'].str.contains('강아지매트', na=False)]
    
    # Then filter by thickness
    filtered = df_filtered[
        (df_filtered['Thickness_cm'] >= thickness_min) & 
        (df_filtered['Thickness_cm'] <= thickness_max)
    ]
    
    # Group by competitor and calculate average price per volume
    comparison = filtered.groupby('Competitor')['Price_per_Volume'].mean().to_dict()
    
    return jsonify(comparison)

@app.route('/data')
def data_page():
    """Data center page for managing data files"""
    return render_template('upload.html')

# Backward compatibility
@app.route('/upload')
def upload_page():
    """Redirect to new data page"""
    return redirect('/data')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in app.config['UPLOAD_EXTENSIONS']:
        return jsonify({'error': 'Invalid file type'}), 400
    
    # Save file
    filename = secure_filename(file.filename)
    filepath = os.path.join(PRODUCT_DATA_PATH, filename)
    file.save(filepath)
    
    # Reload data
    load_data()
    
    return jsonify({
        'success': True, 
        'message': f'File uploaded successfully: {filename}',
        'products': len(df_processed),
        'competitors': df_processed['Competitor'].nunique()
    })

@app.route('/api/reload', methods=['POST'])
def reload_data():
    """Force reload data"""
    load_data()
    update_last_update_time()  # Explicitly update timestamp
    return jsonify({
        'success': True,
        'message': 'Data reloaded successfully',
        'last_update': last_update.strftime('%Y-%m-%d %H:%M:%S') if last_update else 'Never'
    })

@app.route('/api/promotions', methods=['GET'])
def get_promotions():
    """Get live calendar data (keeping endpoint name for compatibility)"""
    return jsonify(live_data)

@app.route('/api/promotion-upload', methods=['POST'])
def upload_live():
    """Upload live data from Excel/CSV"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Check file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in app.config['UPLOAD_EXTENSIONS']:
        return jsonify({'error': 'Invalid file type'}), 400
    
    try:
        # Create live directory if it doesn't exist
        os.makedirs(LIVE_DATA_PATH, exist_ok=True)
        
        # Save file directly to live directory
        filename = secure_filename(file.filename)
        filepath = os.path.join(LIVE_DATA_PATH, filename)
        file.save(filepath)
        
        # Reload live data
        load_live_data()
        
        return jsonify({
            'success': True,
            'message': f'Successfully uploaded live file: {filename}',
            'count': len(live_data)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

@app.route('/api/coupon-upload', methods=['POST'])
def upload_coupon():
    """Upload coupon data from Excel/CSV - saves in appropriate product category directory"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Get product category from form data (default to 'roll')
    product_category = request.form.get('category', 'roll')
    if product_category not in ['roll', 'puzzle', 'pet']:
        product_category = 'roll'
    
    # Check file extension
    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    if ext not in app.config['UPLOAD_EXTENSIONS']:
        return jsonify({'error': 'Invalid file type'}), 400
    
    try:
        # Create category-specific directory if it doesn't exist
        category_path = os.path.join(COUPON_DATA_PATH, product_category)
        os.makedirs(category_path, exist_ok=True)
        
        # Generate unique filename with timestamp to avoid conflicts
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_name = os.path.splitext(filename)[0]
        
        if ext == '.csv':
            # Save CSV directly with timestamp
            final_filename = f"{base_name}_{timestamp}.csv"
            filepath = os.path.join(category_path, final_filename)
            file.save(filepath)
        else:
            # Convert Excel to CSV
            temp_path = os.path.join(os.path.dirname(__file__), 'temp_coupon' + ext)
            file.save(temp_path)
            
            df = pd.read_excel(temp_path)
            final_filename = f"{base_name}_{timestamp}.csv"
            filepath = os.path.join(category_path, final_filename)
            df.to_csv(filepath, index=False, encoding='utf-8-sig')
            
            os.remove(temp_path)
        
        # Reload coupon data
        load_coupon_data()
        
        return jsonify({
            'success': True,
            'message': f'Successfully uploaded {final_filename}',
            'count': len(coupon_data),
            'filename': final_filename
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    """Get review data"""
    return jsonify(review_data)

@app.route('/api/review-upload', methods=['POST'])
def upload_review():
    """Upload review data from Excel/CSV - Deprecated as we now read directly from CSV files"""
    return jsonify({
        'error': 'Review upload is deprecated. Place CSV files directly in the review data folders.'
    }), 400

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
        for filename in os.listdir(MACRO_DATA_PATH):
            if filename.endswith('.js'):
                # Create friendly display names
                display_name = filename.replace('_', ' ').replace('.js', '')
                if 'option_scraper' in filename:
                    if '2depth' in filename:
                        display_name = '옵션 스크래퍼 (2단계)'
                    elif '3depth' in filename:
                        display_name = '옵션 스크래퍼 (3단계)'
                elif 'naver_shopping' in filename:
                    display_name = '네이버 쇼핑 크롤링 매크로'
                elif 'price_monitor' in filename:
                    display_name = '가격 모니터링 매크로'
                elif 'bulk_data' in filename:
                    display_name = '대량 데이터 수집 매크로'
                
                macro_files.append({
                    'filename': filename,
                    'display_name': display_name,
                    'id': filename.replace('.js', '').replace('_', '-')
                })
        
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
        feeds_file = os.path.join(PROJECT_ROOT, 'FollowScope', 'data', 'feeds', 'feeds.json')
        
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
            'feed_type': data.get('feed_type', 'general'),
            'tags': data.get('tags', []),
            'images': data.get('images', []),
            'created_at': datetime.now().isoformat(),
            'author': data.get('author', 'FollowScope')
        }
        
        # Load existing feeds
        feeds_file = os.path.join(PROJECT_ROOT, 'FollowScope', 'data', 'feeds', 'feeds.json')
        
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
        feeds_file = os.path.join(PROJECT_ROOT, 'FollowScope', 'data', 'feeds', 'feeds.json')
        
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
                feed['feed_type'] = data.get('feed_type', feed.get('feed_type', 'general'))
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

@app.route('/api/feeds/<feed_id>', methods=['DELETE'])
def delete_feed(feed_id):
    """Delete a feed post"""
    try:
        feeds_file = os.path.join(PROJECT_ROOT, 'FollowScope', 'data', 'feeds', 'feeds.json')
        
        if not os.path.exists(feeds_file):
            return jsonify({'error': 'Feed not found'}), 404
        
        with open(feeds_file, 'r', encoding='utf-8') as f:
            feeds = json.load(f)
        
        # Filter out the feed to delete
        feeds = [f for f in feeds if f.get('id') != feed_id]
        
        # Save updated feeds
        with open(feeds_file, 'w', encoding='utf-8') as f:
            json.dump(feeds, f, ensure_ascii=False, indent=2)
        
        return jsonify({'message': 'Feed deleted successfully'}), 200
    except Exception as e:
        print(f"Error deleting feed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    """Handle image upload for feeds"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{secure_filename(file.filename)}"
        
        # Save image
        upload_path = os.path.join(PROJECT_ROOT, 'FollowScope', 'data', 'feeds', 'images')
        os.makedirs(upload_path, exist_ok=True)
        
        filepath = os.path.join(upload_path, filename)
        file.save(filepath)
        
        # Return relative path
        relative_path = f"/api/feed-image/{filename}"
        
        return jsonify({'url': relative_path}), 200
    except Exception as e:
        print(f"Error uploading image: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/feed-image/<filename>')
def serve_feed_image(filename):
    """Serve feed images"""
    try:
        image_path = os.path.join(PROJECT_ROOT, 'FollowScope', 'data', 'feeds', 'images', filename)
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