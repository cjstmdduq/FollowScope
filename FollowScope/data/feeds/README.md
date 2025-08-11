# Feeds 데이터 관리 가이드

feeds.json 파일은 Git으로 관리하지 않습니다. 각 환경에서 독립적으로 관리됩니다.

## 자동 업데이트 방법 (권장)

### AWS API를 통한 자동 업데이트
최신 피드 데이터를 자동으로 받아오려면:

```bash
cd /Users/cjstmdduq/Code/FollowScope
python update_feeds.py
```

환경 변수 설정:
```bash
export AWS_FEEDS_API_URL="https://your-aws-api-endpoint.com/feeds"
```

## 수동 동기화 방법

### AWS → 로컬
```bash
scp -i ~/Downloads/LightsailDefaultKey-ap-northeast-2.pem \
  ubuntu@3.35.55.31:/home/ubuntu/FollowScope/FollowScope/data/feeds/feeds.json \
  ./feeds.json
```

### 로컬 → AWS
```bash
scp -i ~/Downloads/LightsailDefaultKey-ap-northeast-2.pem \
  ./feeds.json \
  ubuntu@3.35.55.31:/home/ubuntu/FollowScope/FollowScope/data/feeds/feeds.json
```

## 주의사항
- feeds.json은 실시간으로 변경되는 파일입니다
- 자동 업데이트 스크립트 사용을 권장합니다
- 백업은 자동으로 생성됩니다 (feeds.json.backup)
- 필요시에만 수동으로 동기화하세요