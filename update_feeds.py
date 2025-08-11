#!/usr/bin/env python3
"""
AWS에서 최신 피드 데이터를 받아서 로컬 feeds.json을 업데이트하는 스크립트
"""

import json
import os
import requests
from datetime import datetime
from typing import List, Dict, Any

def load_current_feeds(feeds_file: str) -> List[Dict[str, Any]]:
    """현재 feeds.json 파일 로드"""
    if os.path.exists(feeds_file):
        with open(feeds_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def fetch_feeds_from_aws(api_url: str) -> List[Dict[str, Any]]:
    """AWS API에서 최신 피드 데이터 가져오기"""
    try:
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'FollowScope-FeedUpdater/1.0'
        }
        
        response = requests.get(api_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # API 응답이 리스트인지 확인
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and 'feeds' in data:
            return data['feeds']
        else:
            print(f"예상하지 못한 API 응답 형식: {type(data)}")
            return []
            
    except requests.exceptions.RequestException as e:
        print(f"AWS API 호출 실패: {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"JSON 파싱 실패: {e}")
        return []

def merge_feeds(current_feeds: List[Dict[str, Any]], new_feeds: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """기존 피드와 새 피드를 병합 (중복 제거)"""
    # 기존 피드 ID 세트 생성
    existing_ids = {feed.get('id') for feed in current_feeds}
    
    # 새 피드 중 중복되지 않은 것만 추가
    merged_feeds = current_feeds.copy()
    new_count = 0
    
    for feed in new_feeds:
        if feed.get('id') not in existing_ids:
            merged_feeds.append(feed)
            existing_ids.add(feed.get('id'))
            new_count += 1
    
    # 생성 시간 기준으로 정렬 (최신순)
    merged_feeds.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    print(f"새로 추가된 피드: {new_count}개")
    return merged_feeds

def save_feeds(feeds_file: str, feeds: List[Dict[str, Any]]) -> bool:
    """feeds.json 파일 저장"""
    try:
        # 백업 생성
        backup_file = feeds_file + '.backup'
        if os.path.exists(feeds_file):
            import shutil
            shutil.copy2(feeds_file, backup_file)
        
        # 새 데이터 저장
        os.makedirs(os.path.dirname(feeds_file), exist_ok=True)
        with open(feeds_file, 'w', encoding='utf-8') as f:
            json.dump(feeds, f, ensure_ascii=False, indent=2)
        
        print(f"피드 데이터가 {feeds_file}에 저장되었습니다.")
        print(f"백업 파일: {backup_file}")
        return True
        
    except Exception as e:
        print(f"파일 저장 실패: {e}")
        return False

def main():
    """메인 실행 함수"""
    # 설정
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    FEEDS_FILE = os.path.join(SCRIPT_DIR, 'FollowScope', 'data', 'feeds', 'feeds.json')
    
    # AWS API URL - 실제 값으로 변경 필요
    AWS_API_URL = os.getenv('AWS_FEEDS_API_URL', 'https://your-aws-api-endpoint.com/feeds')
    
    print("🔄 FollowScope 피드 업데이트 시작...")
    print(f"피드 파일: {FEEDS_FILE}")
    print(f"AWS API: {AWS_API_URL}")
    
    # 현재 피드 로드
    current_feeds = load_current_feeds(FEEDS_FILE)
    print(f"현재 피드 수: {len(current_feeds)}")
    
    # AWS에서 최신 피드 가져오기
    print("AWS에서 최신 피드 데이터 가져오는 중...")
    new_feeds = fetch_feeds_from_aws(AWS_API_URL)
    
    if not new_feeds:
        print("❌ 새로운 피드 데이터를 가져올 수 없습니다.")
        return False
    
    print(f"AWS에서 받은 피드 수: {len(new_feeds)}")
    
    # 피드 병합
    merged_feeds = merge_feeds(current_feeds, new_feeds)
    print(f"최종 피드 수: {len(merged_feeds)}")
    
    # 저장
    if save_feeds(FEEDS_FILE, merged_feeds):
        print("✅ 피드 업데이트 완료!")
        
        # 최신 피드 몇 개 출력
        if merged_feeds:
            print("\n📰 최신 피드 미리보기:")
            for i, feed in enumerate(merged_feeds[:3]):
                print(f"{i+1}. [{feed.get('feed_type', 'general')}] {feed.get('content', '')[:50]}...")
                print(f"   작성: {feed.get('created_at', 'N/A')}")
        
        return True
    else:
        print("❌ 피드 저장 실패")
        return False

if __name__ == "__main__":
    main()