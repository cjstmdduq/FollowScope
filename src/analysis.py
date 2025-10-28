"""
Data analysis utilities with category filtering support
"""

import pandas as pd
import numpy as np
from typing import Optional, Dict, List


def filter_by_category(df: pd.DataFrame, category: Optional[str] = None) -> pd.DataFrame:
    """
    Filter dataframe by product category
    
    Args:
        df: Input dataframe
        category: Product category to filter by (None means all categories)
    
    Returns:
        Filtered dataframe
    """
    if category is None or category == "전체":
        return df
    
    if 'product_category' not in df.columns:
        # For backward compatibility, assume all data is '롤매트'
        return df if category == '롤매트' else pd.DataFrame()
    
    return df[df['product_category'] == category]


def get_available_categories(df: pd.DataFrame) -> List[str]:
    """
    Get list of available product categories
    
    Args:
        df: Input dataframe
    
    Returns:
        List of unique categories
    """
    if 'product_category' not in df.columns:
        return ['롤매트']
    
    categories = df['product_category'].unique().tolist()
    return sorted([cat for cat in categories if pd.notna(cat)])


def analyze_competitors_by_category(df: pd.DataFrame, category: Optional[str] = None) -> Dict:
    """
    Analyze competitor data filtered by category
    
    Args:
        df: Input dataframe
        category: Product category to analyze (None means all)
    
    Returns:
        Dictionary with analysis results
    """
    # Filter by category
    df_filtered = filter_by_category(df, category)
    
    if df_filtered.empty:
        return {
            'total_products': 0,
            'competitors': [],
            'price_stats': {},
            'size_stats': {}
        }
    
    # Basic statistics
    total_products = len(df_filtered)
    competitors = df_filtered['Competitor'].unique().tolist()
    
    # Price statistics
    price_stats = {
        'min': df_filtered['Price'].min(),
        'max': df_filtered['Price'].max(),
        'mean': df_filtered['Price'].mean(),
        'median': df_filtered['Price'].median()
    }
    
    # Size statistics
    size_stats = {
        'thickness': {
            'min': df_filtered['Thickness_cm'].min(),
            'max': df_filtered['Thickness_cm'].max(),
            'unique_values': sorted(df_filtered['Thickness_cm'].unique().tolist())
        },
        'width': {
            'min': df_filtered['Width_cm'].min(),
            'max': df_filtered['Width_cm'].max(),
            'unique_values': sorted(df_filtered['Width_cm'].unique().tolist())
        },
        'length': {
            'min': df_filtered['Length_cm'].min(),
            'max': df_filtered['Length_cm'].max()
        }
    }
    
    # Competitor breakdown
    competitor_stats = {}
    for comp in competitors:
        comp_data = df_filtered[df_filtered['Competitor'] == comp]
        competitor_stats[comp] = {
            'product_count': len(comp_data),
            'avg_price': comp_data['Price'].mean(),
            'price_range': (comp_data['Price'].min(), comp_data['Price'].max()),
            'designs': comp_data['Design'].nunique()
        }
    
    return {
        'total_products': total_products,
        'competitors': competitors,
        'price_stats': price_stats,
        'size_stats': size_stats,
        'competitor_stats': competitor_stats,
        'category': category or '전체'
    }


def compare_categories(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create comparison table across all categories
    
    Args:
        df: Input dataframe
    
    Returns:
        DataFrame with category comparison
    """
    categories = get_available_categories(df)
    
    comparison_data = []
    for category in categories:
        stats = analyze_competitors_by_category(df, category)
        
        comparison_data.append({
            'Category': category,
            'Total_Products': stats['total_products'],
            'Num_Competitors': len(stats['competitors']),
            'Avg_Price': stats['price_stats'].get('mean', 0),
            'Min_Price': stats['price_stats'].get('min', 0),
            'Max_Price': stats['price_stats'].get('max', 0)
        })
    
    # Add total row
    total_stats = analyze_competitors_by_category(df, None)
    comparison_data.append({
        'Category': '전체',
        'Total_Products': total_stats['total_products'],
        'Num_Competitors': len(total_stats['competitors']),
        'Avg_Price': total_stats['price_stats'].get('mean', 0),
        'Min_Price': total_stats['price_stats'].get('min', 0),
        'Max_Price': total_stats['price_stats'].get('max', 0)
    })
    
    return pd.DataFrame(comparison_data)


def get_price_comparison_by_category(df: pd.DataFrame, thickness: float, width: float, length: float) -> pd.DataFrame:
    """
    Compare prices across competitors for specific dimensions, grouped by category
    
    Args:
        df: Input dataframe
        thickness: Thickness in cm
        width: Width in cm  
        length: Length in cm
    
    Returns:
        DataFrame with price comparison by category
    """
    # Calculate target volume
    target_volume = thickness * width * length
    
    results = []
    categories = get_available_categories(df)
    
    for category in categories:
        df_cat = filter_by_category(df, category)
        
        for competitor in df_cat['Competitor'].unique():
            comp_data = df_cat[df_cat['Competitor'] == competitor]
            
            # Find products with similar dimensions (within 20% volume)
            comp_data['volume_diff'] = abs(comp_data['Volume_cm3'] - target_volume) / target_volume
            similar_products = comp_data[comp_data['volume_diff'] <= 0.2]
            
            if not similar_products.empty:
                best_match = similar_products.loc[similar_products['volume_diff'].idxmin()]
                
                results.append({
                    'Category': category,
                    'Competitor': competitor,
                    'Matched_Thickness': best_match['Thickness_cm'],
                    'Matched_Width': best_match['Width_cm'],
                    'Matched_Length': best_match['Length_cm'],
                    'Price': best_match['Price'],
                    'Price_per_Volume': best_match['Price_per_Volume'],
                    'Volume_Diff_%': best_match['volume_diff'] * 100
                })
    
    if results:
        result_df = pd.DataFrame(results)
        return result_df.sort_values(['Category', 'Price'])
    else:
        return pd.DataFrame()