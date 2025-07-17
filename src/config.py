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
    # Add more patterns as needed
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
RAW_DATA_PATH = 'FollowScope/data/raw/'
PROCESSED_DATA_PATH = 'FollowScope/data/processed/'

# Dashboard configuration
DASHBOARD_TITLE = "FollowScope - Competitive Analysis Dashboard"