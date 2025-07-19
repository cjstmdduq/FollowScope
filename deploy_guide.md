# FollowScope 배포 가이드

## 1. 로컬 네트워크 배포 (가장 간단)

현재 설정으로 같은 네트워크의 팀원들이 접속 가능:
```bash
# 앱 실행
cd /Users/cjstmdduq/Code/FollowScope && source venv/bin/activate && cd web_app && python app.py

# 팀원들은 아래 주소로 접속
http://{당신의 IP 주소}:8080

162.120.185.41

동그리카페 : 
http://162.120.185.41:8080
```

IP 주소 확인:
```bash
# Mac
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

## 2. ngrok을 이용한 임시 배포

인터넷 어디서나 접속 가능한 임시 URL 생성:
```bash
# ngrok 설치
brew install ngrok  # Mac
# 또는 https://ngrok.com 에서 다운로드

# 계정 생성 및 인증 (https://ngrok.com)
ngrok authtoken YOUR_AUTH_TOKEN

# 서버 실행
cd web_app && python app.py

# 새 터미널에서 ngrok 실행
ngrok http 8080
```

## 3. Docker를 이용한 배포

```bash
# Docker 빌드 및 실행
docker-compose up -d

# 중지
docker-compose down
```

## 4. 클라우드 배포 옵션

### AWS EC2
1. EC2 인스턴스 생성 (t2.micro 무료)
2. 보안 그룹에서 8080 포트 열기
3. 코드 업로드 및 실행

### Heroku (무료 티어 종료됨)
```bash
# Procfile 생성
echo "web: gunicorn --config deploy_config/gunicorn_config.py web_app.app:app" > Procfile

# Git 초기화 및 배포
git init
heroku create your-app-name
git add .
git commit -m "Initial deploy"
git push heroku main
```

### Google Cloud Run
```bash
# Docker 이미지 빌드
docker build -t gcr.io/YOUR_PROJECT_ID/followscope .

# 푸시
docker push gcr.io/YOUR_PROJECT_ID/followscope

# 배포
gcloud run deploy --image gcr.io/YOUR_PROJECT_ID/followscope --platform managed
```

## 5. 프로덕션 배포 시 주의사항

1. **환경 변수 설정**
   ```bash
   export FLASK_ENV=production
   export SECRET_KEY=your-secret-key
   ```

2. **데이터 백업**
   - `/FollowScope/data` 디렉토리 정기 백업

3. **보안 설정**
   - HTTPS 적용 (Let's Encrypt)
   - 인증 추가 (Flask-Login)
   - CORS 설정

4. **성능 최적화**
   - 캐싱 설정
   - CDN 사용 (정적 파일)
   - 데이터베이스 사용 고려

## 빠른 시작 (추천)

가장 빠르게 팀원들과 공유하려면:

1. **ngrok 방법** (5분 소요)
   ```bash
   # 터미널 1
   cd web_app && python app.py
   
   # 터미널 2
   ngrok http 8080
   # 생성된 https://xxx.ngrok.io URL을 팀원들과 공유
   ```

2. **Docker 방법** (10분 소요)
   ```bash
   docker-compose up -d
   # http://[서버IP]:8080 으로 접속
   ```