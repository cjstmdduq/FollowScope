# FollowScope
경쟁사 제품 데이터 분석 및 시각화 플랫폼 

## 🚀 실행하기

```bash
git clone https://github.com/cjstmdduq/FollowScope.git
cd FollowScope
```

### 방법 1: 자동 실행
```bash
./run_local.sh
```

### 방법 2: 가상환경에서 직접 실행
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python web_app/app.py
```

### 방법 3: 실행 문제 해결
```bash
# ./run_local.sh 실행 안될 때
bash run_local.sh

# 이미 가상환경 활성화된 상태에서
python web_app/app.py
```

**http://localhost:8080 접속**

```bash
# 종료
lsof -ti:8080 | xargs kill -9
```


```bash
#  가상환경 종료
deactivate
```

### 방법 4: 외부실행

```
# 외부 터미널 실행
cd /Users/cjstmdduq/Code/FollowScope && ./run_local.sh
```


## 📁 구조

```
FollowScope/
├── src/                # 데이터 처리 로직
│   ├── parser.py      # 파일 파싱
│   ├── analysis.py    # 데이터 분석
│   └── review_analyzer.py # 리뷰 분석
├── web_app/           # Flask 웹앱
│   ├── app.py        # 메인 서버
│   ├── static/       # CSS, JS
│   └── templates/    # HTML
├── data/               # 데이터 저장소
│   ├── products/       # 제품 데이터
│   ├── reviews/        # 리뷰 데이터
│   └── feeds/          # 피드 데이터
└── scraping/         # 데이터 수집
```

## 기타

- **데이터**: `data/` 폴더에 CSV/JSON 저장
- **포트 변경**: `web_app/app.py`에서 수정 가능
- **요구사항**: Python 3.x