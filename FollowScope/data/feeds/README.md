# Feeds 데이터 관리 가이드

feeds.json 파일은 Git으로 관리하지 않습니다. 각 환경에서 독립적으로 관리됩니다.

## 동기화 방법

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
- 필요시에만 수동으로 동기화하세요
- 백업을 항상 유지하세요