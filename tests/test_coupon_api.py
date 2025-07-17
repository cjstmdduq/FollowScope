#!/usr/bin/env python3
"""Test coupon API functionality"""

import requests
import json

def test_coupon_api():
    """Test the coupon API endpoints"""
    base_url = "http://localhost:8080"
    
    # Test 1: Check if coupons API returns data
    print("Testing /api/coupons endpoint...")
    try:
        response = requests.get(f"{base_url}/api/coupons")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ API returned {len(data)} coupons")
            if data:
                print(f"  Sample coupon: {json.dumps(data[0], indent=2, ensure_ascii=False)}")
            else:
                print("  ⚠️  No coupon data found")
        else:
            print(f"✗ API returned status code {response.status_code}")
    except Exception as e:
        print(f"✗ Error calling API: {e}")
    
    # Test 2: Upload sample coupon file
    print("\nTesting coupon file upload...")
    try:
        with open('/Users/cjstmdduq/Code/FollowScope/data/sample_coupon_data.csv', 'rb') as f:
            files = {'file': ('sample_coupon_data.csv', f, 'text/csv')}
            response = requests.post(f"{base_url}/api/coupon-upload", files=files)
            
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Upload successful: {result.get('message', 'No message')}")
            print(f"  Uploaded {result.get('count', 0)} coupons")
        else:
            print(f"✗ Upload failed with status code {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Error uploading file: {e}")
    
    # Test 3: Check if coupons are now available
    print("\nChecking coupons after upload...")
    try:
        response = requests.get(f"{base_url}/api/coupons")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ API now returns {len(data)} coupons")
            
            # Group by competitor
            competitors = {}
            for coupon in data:
                comp = coupon.get('competitor', 'Unknown')
                if comp not in competitors:
                    competitors[comp] = 0
                competitors[comp] += 1
            
            print("  Coupons by competitor:")
            for comp, count in competitors.items():
                print(f"    - {comp}: {count} coupons")
        else:
            print(f"✗ API returned status code {response.status_code}")
    except Exception as e:
        print(f"✗ Error calling API: {e}")

if __name__ == "__main__":
    test_coupon_api()