# FollowScope
경쟁사 제품 데이터 분석 및 시각화 플랫폼 

## 🎯 주요 기능
### 1. **데이터 기반 경쟁사 분석**
- 7개 이상 경쟁사의 제품 데이터 자동 수집 및 분석
- 가격, 부피, 면적 등 핵심 지표 계산
- 실시간 대시보드로 시장 동향 파악

### 2. **리뷰 분석**
- 최근 90일 리뷰 데이터 수집 및 분석
- 일별/주별 리뷰 추이 시각화
- 시장 점유율 계산 (리뷰 수 기준)
- 확대 가능한 인터랙티브 차트

### 3. **프로모션 추적**
- 경쟁사 쿠폰 정보 실시간 모니터링
- 라이브 방송 일정 관리
- 프로모션 효과 분석

### 4. **구매 시뮬레이션**
- 다양한 구매 시나리오별 가격 비교
- 최적 구매 옵션 추천
- 쿠폰 적용 시뮬레이션

### 5. **피드 시스템**
- 실시간 경쟁사 동향 피드
- 자동 피드 업데이트 (AWS 연동)
- 프로모션 및 가격 변동 알림

## 🚀 빠른 시작

### 설치
```bash
# 저장소 클론
git clone https://github.com/cjstmdduq/FollowScope.git
cd FollowScope

# 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt
```

### 로컬 실행
```bash
# 프로젝트 루트에서 모듈로 실행 (권장)
cd FollowScope && source venv/bin/activate && python -m web_app.app

# 또는 web_app 디렉토리에서 직접 실행
cd FollowScope && source venv/bin/activate && cd web_app && python app.py
```

### 서비스 종료
```bash
# 포트 8080 사용 중인 프로세스 종료
lsof -ti:8080 | xargs kill -9
```

브라우저에서 http://localhost:8080 접속

## 🌐 배포 정보

### AWS Lightsail 서버
- **퍼블릭 IP**: 3.35.55.31
- **서비스 URL**: http://3.35.55.31
- **리전**: Seoul (ap-northeast-2)
- **인스턴스**: Ubuntu 22.04 LTS

### 서버 관리
```bash
# SSH 접속
ssh -i /Users/cjstmdduq/Downloads/LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.35.55.31

# 서비스 재시작
sudo systemctl restart followscope

# 로그 확인
sudo journalctl -u followscope -f

# 최신 코드 배포
cd /home/ubuntu/FollowScope
git pull origin main
sudo systemctl restart followscope
```

## 🔄 개발 및 배포 구조

### 상호 연동 구조
```
로컬 개발 환경 (MacBook)
    ↓ git push
GitHub Repository (중앙 저장소)
    ↓ git pull  
AWS Lightsail 서버 (운영 환경)
    ↓
웹 서비스 (http://3.35.55.31)
```

### 배포 프로세스

1. **로컬 개발** 
   ```bash
   # 코드 수정 후
   git add .
   git commit -m "설명"
   git push origin main
   ```

2. **서버 배포**
   ```bash
   # SSH 접속
   ssh -i /Users/cjstmdduq/Downloads/LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.35.55.31
   
   # 최신 코드 반영
   cd /home/ubuntu/FollowScope
   git pull origin main
   sudo systemctl restart followscope
   ```

3. **상태 확인**
   - GitHub: https://github.com/cjstmdduq/FollowScope
   - 라이브 서비스: http://3.35.55.31
   - 서비스 로그: `sudo journalctl -u followscope -f`

## 🛠 기술 스택

- **Backend**: Python 3, Flask, Gunicorn
- **Data Processing**: Pandas, OpenPyXL, Requests
- **Visualization**: Chart.js, Plotly
- **Frontend**: HTML5, CSS3, JavaScript
- **Deployment**: AWS Lightsail (Ubuntu 22.04)
- **Version Control**: Git, GitHub
- **Data Sync**: Git LFS, SCP

## 📁 프로젝트 구조

```
FollowScope/
├── src/                    # 핵심 비즈니스 로직
│   ├── parser.py          # CSV/Excel 파싱
│   ├── analysis.py        # 데이터 분석
│   └── review_analyzer.py # 리뷰 분석
├── web_app/               # 웹 애플리케이션
│   ├── app.py            # Flask 서버
│   ├── static/           # CSS, JS
│   └── templates/        # HTML 템플릿
├── FollowScope/data/      # 데이터 저장소
│   ├── products/         # 제품 데이터
│   ├── reviews/          # 리뷰 데이터
│   ├── coupons/          # 쿠폰 정보
│   ├── feeds/            # 피드 데이터
│   └── live/             # 라이브 일정
├── scraping/macros/       # 데이터 수집 매크로
└── update_feeds.py        # 자동 피드 업데이트
```

## 🔄 데이터 동기화

### 피드 데이터 자동 업데이트

최신 피드 데이터를 AWS에서 자동으로 받아오기:

```bash
# 자동 피드 업데이트
python update_feeds.py

# 또는 수동으로 AWS에서 다운로드
scp -i ~/Downloads/LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.35.55.31:/home/ubuntu/FollowScope/FollowScope/data/feeds/feeds.json ./FollowScope/data/feeds/feeds.json
```

## 🖥️ 로컬 실행 (Quickstart)

로컬에서 웹 앱을 실행하려면 아래 스크립트를 사용하세요.

```bash
# 1) 최초 또는 의존성 변경 시
chmod +x run_local.sh
./run_local.sh

# 2) 또는 수동으로
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/python web_app/app.py
```

문제 해결 팁:
- 포트 충돌 시: 8080 포트를 사용하는 프로세스를 종료하거나 `web_app/app.py`의 `app.run(..., port=8080)`을 변경
- 데이터 경로: 모든 경로는 프로젝트 루트 하위 `FollowScope/data/...`를 기준으로 자동 인식됨
- macOS 권한 메시지 발생 시: 터미널 재시작 또는 보안 설정 확인

## 💾 대용량 데이터 관리 (Git LFS)

FollowScope는 Git LFS를 사용하여 로컬과 AWS 서버 간 데이터를 양방향으로 동기화합니다.

### 초기 설정

1. **Git LFS 설치**
```bash
# macOS
brew install git-lfs

# Ubuntu/AWS
sudo apt-get update
sudo apt-get install git-lfs
```

2. **Git LFS 초기화**
```bash
git lfs install
```

### 동기화 방법

#### 자동 동기화 (권장)
```bash
# 동기화 스크립트 실행
./sync_data.sh
```

#### 수동 동기화

**로컬 → AWS**
```bash
# 로컬에서 작업 후
git add FollowScope/data/products/**/*.csv
git commit -m "데이터 업데이트"
git push origin main

# AWS 서버에서
cd /home/ubuntu/FollowScope
git pull origin main
sudo systemctl restart followscope
```

**AWS → 로컬**
```bash
# AWS에서 데이터 변경 후
git add FollowScope/data/products/**/*.csv
git commit -m "서버 데이터 업데이트"
git push origin main

# 로컬에서
git pull origin main
```

### 충돌 해결

동일 파일을 양쪽에서 수정한 경우:

1. **로컬 우선 (내 데이터가 최신)**
```bash
git push --force origin main
```

2. **서버 우선 (AWS 데이터가 최신)**
```bash
git fetch origin
git reset --hard origin/main
```

3. **파일별 선택**
```bash
# 특정 파일만 서버 버전으로
git checkout origin/main -- path/to/file.csv

# 또는 로컬 버전 유지
git add path/to/file.csv
```

### 주의사항
- 작업 전 항상 `git pull` 실행
- 대용량 CSV 파일은 Git LFS로 관리됨
- 충돌 시 데이터 특성상 덮어쓰기 가능
