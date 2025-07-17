# FollowScope

A Python-based competitive analysis tool for product data visualization and comparison.

## Overview

FollowScope processes raw competitive product data from Excel/CSV files, standardizes the information, calculates key performance metrics, and outputs the analyzed results.

## 🎯 Core Business Logic

### 1. Data Processing Flow

```
Raw Data (CSV/Excel) → Parser → Standardization → Metric Calculation → Visualization
```

### 2. Key Metrics Calculation

- **Volume (cm³)** = Thickness × Width × Length
- **Area (cm²)** = Width × Length  
- **Price per Volume** = Price ÷ Volume (핵심 경쟁력 지표)

### 3. Data Parsing Logic

#### CSV 파일 처리 (한국어 컬럼)
- **옵션1**: 디자인/색상 정보 추출 (예: "🏅BEST🏅 모던크림")
- **옵션2**: 두께와 폭 추출 (예: "두께1cm / 폭110cm")
- **옵션3**: 길이 추출 (예: "길이 50cm", "2m50cm")
- **최종가격**: 제품 가격

#### 단위 변환
- 모든 측정값은 cm로 표준화
- 길이: "2m50cm" → 250cm
- 정규식을 사용한 유연한 파싱

### 4. 경쟁사별 규칙 (config.py)

```python
PRODUCT_RULES = {
    '경쟁사명': {
        'method': 'direct',    # 직접 길이 입력 방식
        'base_unit_cm': None   # unit 방식일 경우 단위당 길이
    }
}
```

- **direct**: 길이가 직접 명시된 경우
- **unit**: 개수 × 단위길이로 계산하는 경우

## 📊 Output Format

### 처리된 데이터
- **위치**: `data/processed/processed_competitive_data.csv`
- **포함 정보**: 
  - 경쟁사명, 제품명, 디자인
  - 두께(cm), 너비(cm), 길이(cm)
  - 부피(cm³), 면적(cm²)
  - 가격(₩), 부피당 가격(₩/cm³)

### 콘솔 출력
- 총 제품 수
- 경쟁사 수
- 평균 가격
- 평균 부피당 가격
- 경쟁사별 요약 통계

## 🚀 Quick Start

### 1. 환경 설정
```bash
# 가상환경 생성
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate  # Windows

# 패키지 설치
pip install pandas openpyxl plotly
```

### 2. 데이터 준비
- CSV/Excel 파일을 `FollowScope/data/raw/` 폴더에 복사
- 파일명 형식: `경쟁사명_옵션가격_날짜.csv`

### 3. 실행
```bash
python src/main.py
```

## 📁 Project Structure

```
FollowScope/
├── data/
│   ├── raw/              # 원본 데이터 (CSV/Excel)
│   └── processed/        # 처리된 데이터 (CSV)
├── src/
│   ├── config.py         # 경쟁사별 파싱 규칙
│   ├── parser.py         # 데이터 파싱 및 표준화
│   └── main.py           # 앱 진입점
├── venv/                 # 가상환경
└── README.md
```

## 🔧 Customization

### 새로운 경쟁사 추가
1. `src/config.py`의 `PRODUCT_RULES`에 규칙 추가
2. 데이터 파일을 `data/raw/`에 추가
3. 앱 재실행

### 파싱 로직 수정
- `src/parser.py`의 정규식 패턴 수정
- `extract_product_attributes_from_csv()` 함수 커스터마이징

## 📈 Use Cases

1. **가격 경쟁력 분석**: Price per Volume로 실질적 가격 비교
2. **제품 포지셔닝**: 두께/너비별 제품 분포 확인
3. **포트폴리오 최적화**: 경쟁사 대비 부족한 스펙 발견
4. **가격 전략 수립**: 세그먼트별 최적 가격대 파악

## ⚠️ 주의사항

- CSV 파일은 UTF-8 with BOM 인코딩 지원
- 빈 행은 자동으로 건너뜀
- 필수 항목(두께, 너비, 가격)이 없으면 해당 행 제외
- 이모지는 자동으로 제거됨

## 🚀 상세 실행 방법

### 1. 프로젝트 디렉토리로 이동
```bash
cd /Users/cjstmdduq/Code/FollowScope
```

### 2. 가상환경 생성 및 활성화
```bash
# 가상환경 생성 (처음 한 번만)
python3 -m venv venv

# 가상환경 활성화
source venv/bin/activate  # Mac/Linux
# 또는
venv\Scripts\activate     # Windows

# 가상환경이 활성화되면 프롬프트에 (venv)가 표시됩니다
```

### 3. 필요한 패키지 설치
```bash
# requirements.txt를 사용하여 설치
pip install -r requirements.txt

# 또는 개별 설치
pip install pandas openpyxl plotly
```

### 4. 데이터 파일 준비
- `FollowScope/data/raw/` 폴더에 분석할 CSV 또는 Excel 파일을 넣습니다
- 현재 폴더에 있는 파일들:
  - 따사룸___2025-07-11-07-07.csv
  - 리포소홈 층간소음 놀이방매트_옵션가격_2025-07-10-05-52.csv
  - 티지오매트 층간소음 롤매트 우다다 거실 아기 놀이방 유아 바닥 복도 크림10T 110x50_옵션가격_2025-07-10-05-52.csv
  - 파크론.csv

### 5. 애플리케이션 실행

#### 옵션 1: 콘솔 애플리케이션 (데이터 처리)
```bash
python src/main.py
```

#### 옵션 2: 웹 애플리케이션 (시각화 대시보드)
```bash
# Flask가 설치되어 있지 않다면 먼저 설치
pip install flask

# 웹 앱 실행
cd web_app
python app.py

# 또는 프로젝트 루트에서
python web_app/app.py
```

웹 앱 실행 후:
- 브라우저에서 http://localhost:8080 접속
- 대시보드에서 데이터 시각화 확인
- 실시간으로 데이터 파일 변경사항 감지

### 6. 실행 결과
- 콘솔에 데이터 처리 과정이 표시됩니다
- 처리된 데이터는 `FollowScope/data/processed/processed_competitive_data.csv`에 저장됩니다
- 데이터 요약 통계가 콘솔에 출력됩니다:
  - 총 제품 수
  - 경쟁사 수
  - 평균 가격
  - 평균 부피당 가격
  - 경쟁사별 요약 통계

### 7. 가상환경 비활성화
```bash
deactivate
```

## 💡 문제 해결

### "ModuleNotFoundError" 오류가 발생하는 경우
```bash
# 가상환경이 활성화되어 있는지 확인
which python  # Mac/Linux
where python  # Windows

# 패키지 재설치
pip install --upgrade pandas openpyxl plotly
```

### 데이터 파일을 찾을 수 없는 경우
```bash
# 현재 위치 확인
pwd

# 데이터 폴더 확인
ls FollowScope/data/raw/
```



# 1. FollowScope 디렉토리로 이동
cd /Users/cjstmdduq/Code/FollowScope

# 2. 가상환경 활성화
source venv/bin/activate

# 3. web_app 디렉토리로 이동
cd web_app

# 4. Flask 앱 실행
python app.py

## 또는 한 번에:
cd /Users/cjstmdduq/Code/FollowScope && source venv/bin/activate && cd web_app && python app.py
  