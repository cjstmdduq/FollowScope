#!/usr/bin/env python3
"""Check if coupon frontend is working"""

import requests
from bs4 import BeautifulSoup

def check_coupon_frontend():
    """Check if the coupon tab and elements exist in the dashboard"""
    base_url = "http://localhost:8080"
    
    # Get the dashboard HTML
    print("Fetching dashboard HTML...")
    try:
        response = requests.get(base_url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Check if coupon tab exists
            coupon_tab = soup.find('div', {'id': 'coupons'})
            if coupon_tab:
                print("✓ Coupon tab found in HTML")
                
                # Check for coupon list container
                coupon_list = soup.find('div', {'id': 'couponList'})
                if coupon_list:
                    print("✓ Coupon list container found")
                else:
                    print("✗ Coupon list container NOT found")
                
                # Check for upload form
                upload_form = soup.find('form', {'id': 'couponUploadForm'})
                if upload_form:
                    print("✓ Coupon upload form found")
                else:
                    print("✗ Coupon upload form NOT found")
                    
            else:
                print("✗ Coupon tab NOT found in HTML")
                
            # Check if charts.js is loaded
            scripts = soup.find_all('script')
            charts_js_found = False
            for script in scripts:
                if script.get('src') and 'charts.js' in script.get('src'):
                    charts_js_found = True
                    break
            
            if charts_js_found:
                print("✓ charts.js is loaded")
            else:
                print("✗ charts.js NOT loaded")
                
        else:
            print(f"✗ Dashboard returned status code {response.status_code}")
    except Exception as e:
        print(f"✗ Error fetching dashboard: {e}")

if __name__ == "__main__":
    check_coupon_frontend()