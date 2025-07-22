#!/bin/bash
# FollowScope 데이터 동기화 스크립트

echo "🔄 FollowScope 데이터 동기화 시작..."

# 현재 디렉토리 저장
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. 로컬 변경사항 확인
if [[ -n $(git status -s) ]]; then
    echo "📝 로컬 변경사항 발견"
    git add FollowScope/data/products/**/*.csv
    git add FollowScope/data/raw/*.csv
    git commit -m "데이터 업데이트: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "✅ 로컬 변경사항 커밋 완료"
fi

# 2. 원격 저장소와 동기화
echo "📡 원격 저장소 확인 중..."
git fetch origin

# 3. 충돌 확인
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})
BASE=$(git merge-base @ @{u})

if [ $LOCAL = $REMOTE ]; then
    echo "✅ 이미 최신 상태입니다"
elif [ $LOCAL = $BASE ]; then
    echo "⬇️ 원격 저장소에서 변경사항 가져오기"
    git pull origin main
    echo "✅ 동기화 완료"
elif [ $REMOTE = $BASE ]; then
    echo "⬆️ 로컬 변경사항을 원격으로 푸시"
    git push origin main
    echo "✅ 푸시 완료"
else
    echo "⚠️ 충돌 가능성 감지!"
    echo "다음 중 하나를 선택하세요:"
    echo "1) 로컬 버전으로 덮어쓰기 (force push)"
    echo "2) 원격 버전으로 덮어쓰기 (reset hard)"
    echo "3) 수동으로 해결하기"
    read -p "선택 (1/2/3): " choice
    
    case $choice in
        1)
            git push --force origin main
            echo "✅ 로컬 버전으로 강제 푸시 완료"
            ;;
        2)
            git reset --hard origin/main
            echo "✅ 원격 버전으로 리셋 완료"
            ;;
        3)
            echo "수동으로 해결해주세요:"
            echo "git status로 충돌 파일 확인"
            echo "git checkout origin/main -- <file> 또는 git add <file>"
            ;;
    esac
fi

echo "🎉 동기화 프로세스 완료!"