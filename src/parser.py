"""
Data parser for processing raw competitor data
"""

import pandas as pd
import re
import os
from pathlib import Path


def extract_product_attributes_from_csv(row):
    """
    Extract product attributes from structured CSV data
    Handles both 2-stage and 3-stage data formats
    """
    attributes = {
        'design': None,
        'thickness': None,
        'width': None,
        'length': None,
        'unit_count': None,
        'price': None
    }
    
    # Detect if this is 2-stage or 3-stage data
    has_option3 = pd.notna(row.get('옵션3')) and str(row.get('옵션3')).strip()
    is_3stage = has_option3
    
    # Extract design from 옵션1
    if pd.notna(row.get('옵션1')):
        option1_str = str(row['옵션1']).strip()
        if option1_str:
            # Remove emojis and special characters
            design = re.sub(r'[🏅👑]', '', option1_str).strip()
            design = re.sub(r'BEST', '', design).strip()
            attributes['design'] = design
            
            # Check if 옵션1 contains width info (like "110cm폭/1M")
            width_in_option1 = re.search(r'(\d+)\s*cm폭', option1_str)
            if width_in_option1:
                attributes['width'] = width_in_option1.group(1)
            
            # Check if 옵션1 contains length info (like "110cm폭/1M" where 1M is length)
            length_in_option1 = re.search(r'/(\d+(?:\.\d+)?)\s*M', option1_str)
            if length_in_option1:
                # Convert meters to cm
                length_m = float(length_in_option1.group(1))
                attributes['length'] = str(length_m * 100)
            
            # Check for puzzle mat pattern: "A타입(100x100x2.5cmx1장)" or "B타입(50x50x2.5cmx4장)"
            puzzle_pattern = re.search(r'[AB]타입\((\d+)x(\d+)x(\d+(?:\.\d+)?)cmx(\d+)장\)', option1_str)
            if puzzle_pattern:
                width = int(puzzle_pattern.group(1))
                length = int(puzzle_pattern.group(2))
                thickness = puzzle_pattern.group(3)
                pieces = int(puzzle_pattern.group(4))
                
                # Normalize 50x50 4pieces to 100x100 1piece
                if width == 50 and length == 50 and pieces == 4:
                    attributes['width'] = '100'
                    attributes['length'] = '100'
                else:
                    attributes['width'] = str(width)
                    attributes['length'] = str(length)
                attributes['thickness'] = thickness
            else:
                # 파크론 파일: 옵션1에서 두께 추출
                # Pattern 1: "베이직(1.7cm) / 러그아이보리"
                thickness_match = re.search(r'\((\d+(?:\.\d+)?)\s*cm\)', option1_str)
                if thickness_match:
                    attributes['thickness'] = thickness_match.group(1)
                else:
                    # Pattern 2: "러그아이보리 2.2cm" (new pattern for sub data)
                    thickness_match2 = re.search(r'(\d+(?:\.\d+)?)\s*cm', option1_str)
                    if thickness_match2:
                        attributes['thickness'] = thickness_match2.group(1)
    
    # Process 옵션2 differently based on stage type
    if pd.notna(row.get('옵션2')):
        option2_str = str(row['옵션2']).strip()
        if option2_str:
            if is_3stage:
                # 3-stage format: 옵션2 contains thickness/width info
                # Pattern for "1.7cm / 80cm" format
                simple_pattern = r'(\d+(?:\.\d+)?)\s*cm\s*/\s*(\d+)\s*cm'
                # Pattern for "두께1.7cm / 폭80cm" format
                korean_pattern = r'두께\s*(\d+(?:\.\d+)?)\s*cm\s*/\s*폭\s*(\d+)\s*cm'
                
                # Try simple pattern first
                match = re.search(simple_pattern, option2_str)
                if match:
                    attributes['thickness'] = match.group(1)
                    attributes['width'] = match.group(2)
                else:
                    # Try Korean pattern
                    match = re.search(korean_pattern, option2_str)
                    if match:
                        attributes['thickness'] = match.group(1)
                        attributes['width'] = match.group(2)
                    else:
                        # 파크론 파일: 옵션2에서 폭만 추출 (예: "50cm")
                        width_only_match = re.search(r'(\d+)\s*cm', option2_str)
                        if width_only_match:
                            attributes['width'] = width_only_match.group(1)
            else:
                # 2-stage format: 옵션2 contains size info or color/thickness combo
                
                # Check for puzzle mat patterns FIRST
                # Pattern 1: "(25mm) 100x100 1장" or "(25mm) 50x50 4장" (따사룸)
                puzzle_option2_pattern1 = r'\((\d+)mm\)\s*(\d+)x(\d+)\s*(\d+)장'
                # Pattern 2: "100x100x3cm (1장)" or "50x50x3cm (4장)" (티지오매트)
                puzzle_option2_pattern2 = r'(\d+)x(\d+)x(\d+(?:\.\d+)?)cm\s*\((\d+)장\)'
                
                puzzle_match = re.search(puzzle_option2_pattern1, option2_str)
                puzzle_match2 = re.search(puzzle_option2_pattern2, option2_str)
                
                if puzzle_match:
                    # Convert mm to cm for thickness
                    thickness_mm = float(puzzle_match.group(1))
                    attributes['thickness'] = str(thickness_mm / 10)
                    
                    width = int(puzzle_match.group(2))
                    length = int(puzzle_match.group(3))
                    pieces = int(puzzle_match.group(4))
                    
                    # Normalize 50x50 4pieces to 100x100 1piece
                    if width == 50 and length == 50 and pieces == 4:
                        attributes['width'] = '100'
                        attributes['length'] = '100'
                    else:
                        attributes['width'] = str(width)
                        attributes['length'] = str(length)
                elif puzzle_match2:
                    # Pattern 2: 티지오매트 형식
                    width = int(puzzle_match2.group(1))
                    length = int(puzzle_match2.group(2))
                    thickness = puzzle_match2.group(3)
                    pieces = int(puzzle_match2.group(4))
                    
                    # Normalize 50x50 4pieces to 100x100 1piece
                    if width == 50 and length == 50 and pieces == 4:
                        attributes['width'] = '100'
                        attributes['length'] = '100'
                    else:
                        attributes['width'] = str(width)
                        attributes['length'] = str(length)
                    attributes['thickness'] = thickness
                else:
                    # Check for 3D dimensions (length x width x thickness)
                    dimension_3d_pattern = r'(\d+)\s*x\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*cm'
                    dim_3d_match = re.search(dimension_3d_pattern, option2_str)
                    if dim_3d_match:
                        # Format: length x width x thickness
                        original_length = int(dim_3d_match.group(1))
                        
                        # For 리코코 long mats: break down into 50cm units for comparison
                        if original_length >= 100:  # Only for lengths 100cm or more
                            # Calculate how many 50cm units this represents
                            unit_count = original_length // 50
                            # Set length to 50cm for unit comparison, store unit count
                            attributes['length'] = '50'
                            attributes['unit_count'] = str(unit_count)
                        else:
                            # For shorter lengths, use as-is
                            attributes['length'] = str(original_length)
                        
                        if not attributes['width']:  # Only if not already found in 옵션1
                            attributes['width'] = dim_3d_match.group(2)
                        if not attributes['thickness']:  # Only if not already found in 옵션1
                            attributes['thickness'] = dim_3d_match.group(3)
                    else:
                        # Case 1: 옵션2 is 2D dimensions like "110x50", "110x100"
                        dimension_pattern = r'(\d+)\s*x\s*(\d+)$'  # Added $ to ensure no "cm" follows
                        dim_match = re.search(dimension_pattern, option2_str)
                        if dim_match:
                            # This is width x length format
                            if not attributes['width']:  # Only if not already found in 옵션1
                                attributes['width'] = dim_match.group(1)
                            attributes['length'] = dim_match.group(2)
                        else:
                            # Case 2: 옵션2 contains color/pattern and thickness info
                            # Example: "베이지스캐터/15mm(리뉴얼)", "포쉐린/21mm(리뉴얼)"
                            thickness_in_option2 = re.search(r'(\d+(?:\.\d+)?)\s*mm', option2_str)
                            if thickness_in_option2:
                                # Convert mm to cm
                                thickness_mm = float(thickness_in_option2.group(1))
                                attributes['thickness'] = str(thickness_mm / 10)
                        
                        # Case 3: 옵션2 is just width (like "100cm", "110cm")
                        width_only_pattern = re.search(r'^(\d+)\s*cm$', option2_str)
                        if width_only_pattern and not attributes['width']:
                            attributes['width'] = width_only_pattern.group(1)
                        
                        # Extract color/pattern info for design (if not just width)
                        if not width_only_pattern:
                            color_pattern = re.search(r'^([^/]+)', option2_str)
                            if color_pattern:
                                color_info = color_pattern.group(1).strip()
                                if attributes['design']:
                                    attributes['design'] = f"{attributes['design']} - {color_info}"
                                else:
                                    attributes['design'] = color_info
    
    # Extract length from 옵션3 (only for 3-stage data)
    if is_3stage and pd.notna(row.get('옵션3')):
        length_str = str(row['옵션3']).strip()
        if length_str:
            # Handle "Xm" or "XmYcm" format
            meter_pattern = r'(\d+(?:\.\d+)?)\s*m'
            cm_pattern = r'(\d+)\s*cm'
            
            length_cm = 0
            
            # First check if it's a combined format like "1m50cm"
            combined_pattern = r'(\d+)\s*m\s*(\d+)\s*cm'
            combined_match = re.search(combined_pattern, length_str)
            
            if combined_match:
                # Handle "XmYcm" format
                length_cm = float(combined_match.group(1)) * 100 + float(combined_match.group(2))
            else:
                # Check for meters only
                meter_match = re.search(meter_pattern, length_str)
                if meter_match:
                    length_cm += float(meter_match.group(1)) * 100
                
                # Check for cm only (with or without '길이' prefix)
                cm_only_pattern = r'(?:길이\s*)?(\d+)\s*cm'
                cm_match = re.search(cm_only_pattern, length_str)
                if cm_match and length_cm == 0:  # Only if no meters found
                    length_cm = float(cm_match.group(1))
            
            if length_cm > 0:
                attributes['length'] = str(length_cm)
    
    # Extract price from 최종가격
    if pd.notna(row.get('최종가격')):
        price_str = str(row['최종가격']).replace(',', '').strip()
        try:
            price_val = float(price_str)
            if price_val > 0:  # Only set if valid price
                attributes['price'] = price_str
        except:
            pass
    
    return attributes


def extract_product_attributes(text):
    """
    Extract product attributes from unstructured text (fallback for non-CSV files)
    """
    attributes = {
        'design': None,
        'thickness': None,
        'width': None,
        'length': None,
        'unit_count': None,
        'price': None
    }
    
    # Regex patterns for extracting attributes
    patterns = {
        'design': r'Design[\s:]*([\w\s-]+?)(?=\s*(?:Thickness|Width|Length|Price|$))',
        'thickness': r'(?:Thickness|두께)[\s:]*(\d+(?:\.\d+)?)\s*(?:mm|cm)',
        'width': r'(?:Width|너비|폭)[\s:]*(\d+(?:\.\d+)?)\s*(?:mm|cm|m)',
        'length': r'(?:Length|길이)[\s:]*(\d+(?:\.\d+)?)\s*(?:mm|cm|m)',
        'unit_count': r'(\d+)\s*(?:units?|개|매|장)',
        'price': r'(?:Price|가격|₩|\$)[\s:]*(\d+(?:,\d{3})*(?:\.\d+)?)'
    }
    
    for attr, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            attributes[attr] = match.group(1).strip()
            if attr == 'price':
                # Remove commas from price
                attributes[attr] = attributes[attr].replace(',', '')
    
    return attributes


def convert_to_cm(value, unit):
    """
    Convert measurements to centimeters
    """
    if value is None:
        return None
    
    value = float(value)
    
    if 'mm' in unit.lower():
        return value / 10
    elif 'm' in unit.lower() and 'mm' not in unit.lower() and 'cm' not in unit.lower():
        return value * 100
    else:  # Already in cm
        return value


def extract_competitor_name(filename):
    """
    Extract competitor name from filename more intelligently
    """
    # Remove file extension
    name = filename
    
    # Remove date pattern if exists (e.g., _2025-07-10-05-52)
    import re
    date_pattern = r'_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}'
    name = re.sub(date_pattern, '', name)
    
    # Remove _옵션가격_ if exists
    if '_옵션가격' in name:
        name = name.split('_옵션가격')[0]
    
    # Extract main brand/product name
    # Common patterns to identify main competitor name
    patterns = [
        r'^([가-힣a-zA-Z0-9]+)\s+층간소음',  # e.g., "티지오매트 층간소음..."
        r'^([가-힣a-zA-Z0-9]+)\s+',  # First word/brand
        r'^([^_\s]+)',  # Everything before first space or underscore
    ]
    
    for pattern in patterns:
        match = re.match(pattern, name)
        if match:
            return match.group(1)
    
    # Fallback: use first 20 characters
    return name[:20] if len(name) > 20 else name


def get_category_from_path(file_path):
    """
    Extract category from file path based on directory structure
    """
    path_parts = Path(file_path).parts
    
    # Define valid categories
    valid_categories = {
        'roll': '롤매트',
        'puzzle': '퍼즐매트', 
        'tpu': 'TPU매트',
        'double_side': '양면매트',
        'folder': '폴더매트'
    }
    
    # Check if any part of the path contains a valid category
    for part in path_parts:
        if part.lower() in valid_categories:
            return valid_categories[part.lower()]
    
    # Default to '롤매트' for backward compatibility
    return '롤매트'


def process_raw_data(raw_data_path, rules):
    """
    Process all raw CSV and Excel files and return standardized DataFrame
    """
    all_data = []
    
    # Get all data files in raw data directory and subdirectories
    raw_path = Path(raw_data_path)
    data_files = list(raw_path.glob('**/*.xlsx')) + list(raw_path.glob('**/*.xls')) + list(raw_path.glob('**/*.csv'))
    
    for file_path in data_files:
        try:
            # Extract competitor from filename
            filename = file_path.stem
            competitor = extract_competitor_name(filename).strip()  # Ensure no whitespace
            
            # Force normalize 티지오매트 name
            if '티지오' in competitor or '티지오' in filename:
                competitor = '티지오매트'
            
            print(f"Processing file: {filename} -> Competitor: {competitor}")
            
            # Get rules for this competitor dynamically
            try:
                from .config import get_competitor_rules
            except ImportError:
                from config import get_competitor_rules
            competitor_rules = get_competitor_rules(competitor)
            
            # Read file based on extension
            if file_path.suffix == '.csv':
                df = pd.read_csv(file_path, encoding='utf-8-sig')
            else:
                df = pd.read_excel(file_path)
            
            # Track initial data count for this file
            initial_data_count = len(all_data)
            
            # Process each row
            for idx, row in df.iterrows():
                # Skip empty rows or rows with no meaningful data
                if pd.isna(row).all():
                    continue
                
                # Skip rows where all option columns are empty
                if (pd.isna(row.get('옵션1')) or not str(row.get('옵션1')).strip()) and \
                   (pd.isna(row.get('옵션2')) or not str(row.get('옵션2')).strip()) and \
                   (pd.isna(row.get('옵션3')) or not str(row.get('옵션3')).strip()):
                    continue
                
                # Extract attributes based on file type
                if '옵션1' in df.columns and '옵션2' in df.columns:
                    # Structured CSV format
                    attrs = extract_product_attributes_from_csv(row)
                else:
                    # Unstructured format (for potential Excel files)
                    text = ' '.join([str(val) for val in row.values if pd.notna(val)])
                    attrs = extract_product_attributes(text)
                
                # Skip if essential attributes are missing
                # For 2-stage data, we need at least width, price and either thickness or length
                # For 3-stage data, we need thickness, width, and price
                has_essential = (
                    attrs['price'] and attrs['width'] and 
                    (attrs['thickness'] or attrs['length'])
                )
                
                if not has_essential:
                    continue
                
                try:
                    # Ensure price is valid
                    price_val = float(attrs['price'])
                    if price_val <= 0:
                        continue
                except:
                    continue
                
                # Convert measurements to cm
                width_cm = float(attrs['width'])
                
                # Handle thickness - some 2-stage data might not have thickness
                if attrs['thickness']:
                    thickness_cm = float(attrs['thickness'])
                else:
                    # Default thickness for 2-stage data without thickness info
                    thickness_cm = 1.5  # Default 1.5cm thickness
                
                # Calculate length based on rules and data availability
                if competitor_rules['method'] == 'unit' and attrs['unit_count']:
                    length_cm = float(attrs['unit_count']) * competitor_rules['base_unit_cm']
                elif attrs['unit_count'] and attrs['length']:
                    # For 리코코 style data: unit_count * length (already normalized to 50cm)
                    length_cm = float(attrs['unit_count']) * float(attrs['length'])
                elif attrs['length']:
                    length_cm = float(attrs['length'])
                else:
                    # For 2-stage data without explicit length, try to infer
                    if '파크론' in competitor and attrs['width'] and attrs['thickness']:
                        # 파크론 sub data: assume 1M (100cm) unit rolls
                        length_cm = 100.0
                    else:
                        # Skip if we can't determine length
                        continue
                
                # Calculate derived metrics
                area_cm2 = width_cm * length_cm
                volume_cm3 = thickness_cm * width_cm * length_cm
                price = float(attrs['price'])
                price_per_volume = price / volume_cm3 if volume_cm3 > 0 else None
                
                # Add to data list
                data_item = {
                    'Competitor': competitor.strip(),  # Strip whitespace from competitor name
                    'Design': attrs['design'] or 'Unknown',
                    'Thickness_cm': thickness_cm,
                    'Width_cm': width_cm,
                    'Length_cm': length_cm,
                    'Area_cm2': area_cm2,
                    'Volume_cm3': volume_cm3,
                    'Price': price,
                    'Price_per_Volume': price_per_volume
                }
                
                # Get product category from directory path
                data_item['product_category'] = get_category_from_path(file_path)
                
                all_data.append(data_item)
                
            # Count products from this specific file
            file_products = len(all_data) - initial_data_count
            
            # Count by category for this file
            file_categories = {}
            for d in all_data[initial_data_count:]:
                cat = d.get('product_category', 'Unknown')
                file_categories[cat] = file_categories.get(cat, 0) + 1
            
            print(f"  -> Processed {idx + 1} rows, found {file_products} valid products")
            if file_categories:
                print(f"     Categories: {file_categories}")
                
        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}")
            continue
    
    # Create DataFrame
    df_processed = pd.DataFrame(all_data)
    
    # Sort by competitor and thickness
    if not df_processed.empty:
        df_processed = df_processed.sort_values(['Competitor', 'Thickness_cm'])
    
    return df_processed