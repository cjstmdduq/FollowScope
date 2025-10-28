"""
Configuration file for product parsing rules
"""

# Dynamic rules - will be applied to any competitor
DEFAULT_RULES = {
    'method': 'direct',  # Default to direct length input
    'base_unit_cm': None
}

# Pattern-based rules (applied if competitor name matches pattern)
PATTERN_RULES = {
    # Example: If competitor name contains '롤매트', use specific rules
    '롤매트': {
        'method': 'direct',
        'base_unit_cm': None
    },
    '강아지매트': {
        'method': 'direct',
        'base_unit_cm': None
    },
    # Add more patterns as needed
}

# Product category specific settings
CATEGORY_SETTINGS = {
    '롤매트': {
        'thickness_ranges': [
            (0, 5, '0-5mm'),
            (5, 10, '5-10mm'),
            (10, 15, '10-15mm'),
            (15, 20, '15-20mm'),
            (20, 25, '20-25mm'),
            (25, float('inf'), '25mm+')
        ],
        'standard_widths': [110, 135, 140],
        'unit': 'cm'
    },
    '강아지매트': {
        'thickness_ranges': [
            (0, 6, '0-6mm'),
            (6, 9, '6-9mm'),
            (9, 12, '9-12mm'),
            (12, 15, '12-15mm'),
            (15, float('inf'), '15mm+')
        ],
        'standard_widths': [110, 135, 140],
        'unit': 'cm',
        'convert_mm_to_cm': True  # 애견매트는 보통 mm 단위로 표기
    },
    '퍼즐매트': {
        'thickness_ranges': [
            (0, 10, '0-10mm'),
            (10, 20, '10-20mm'),
            (20, 30, '20-30mm'),
            (30, float('inf'), '30mm+')
        ],
        'standard_widths': [50, 100],
        'unit': 'cm'
    }
}

def get_competitor_rules(competitor_name):
    """
    Get rules for a competitor based on name patterns
    """
    # Check if any pattern matches the competitor name
    for pattern, rules in PATTERN_RULES.items():
        if pattern in competitor_name:
            return rules
    
    # Return default rules if no pattern matches
    return DEFAULT_RULES

# Data file paths
RAW_DATA_PATH = 'data/raw/'
PROCESSED_DATA_PATH = 'data/processed/'

# Dashboard configuration
DASHBOARD_TITLE = "FollowScope - Competitive Analysis Dashboard"