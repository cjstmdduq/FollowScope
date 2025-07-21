# FollowScope
경쟁사 제품 데이터 분석 및 시각화 플랫폼 

## 🎯 주요 기능
### 1. 자료기반 경쟁사 분석**
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

## 🚀 빠른 시작

### 설치
```bash
# 저장소 클론
git clone https://github.com/yourusername/FollowScope.git
cd FollowScope

# 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt
```

### 실행 [이거]
```bash
# 방법 1: 프로젝트 루트에서 모듈로 실행 (권장)
cd /Users/cjstmdduq/Code/FollowScope && source venv/bin/activate && python -m web_app.app

# 방법 2: web_app 디렉토리에서 직접 실행 (상대 임포트를 절대 임포트로 변경 후)
cd /Users/cjstmdduq/Code/FollowScope && source venv/bin/activate && cd web_app && python app.py
```

### 종료 [로컬]
kill -9 $(lsof -t -i:8080) <- 야 이거안됨>

브라우저에서 http://localhost:8080 접속

## 🛠 기술 스택

- **Backend**: Python 3, Flask
- **Data Processing**: Pandas, OpenPyXL
- **Visualization**: Chart.js, Plotly
- **Frontend**: HTML5, CSS3, JavaScript
- **Deployment**: Railway

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
│   └── live/             # 라이브 일정
└── scraping/macros/       # 데이터 수집 매크로
```
