#!/bin/bash

# FollowScope 배포 스크립트
# AWS Lightsail 서버에 최신 코드 배포

SERVER_IP="52.78.99.213"
SERVER_USER="ubuntu"
PROJECT_PATH="~/FollowScope"

echo "======================================"
echo "FollowScope 배포 스크립트"
echo "서버: $SERVER_IP"
echo "======================================"

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# SSH 키 파일 확인
SSH_KEY=""
if [ -f "$HOME/.ssh/LightsailDefaultKey-ap-northeast-2.pem" ]; then
    SSH_KEY="-i $HOME/.ssh/LightsailDefaultKey-ap-northeast-2.pem"
    echo -e "${GREEN}SSH 키 파일을 찾았습니다.${NC}"
elif [ -f "$HOME/Downloads/LightsailDefaultKey-ap-northeast-2.pem" ]; then
    SSH_KEY="-i $HOME/Downloads/LightsailDefaultKey-ap-northeast-2.pem"
    echo -e "${GREEN}SSH 키 파일을 찾았습니다.${NC}"
else
    echo -e "${RED}SSH 키 파일을 찾을 수 없습니다!${NC}"
    echo ""
    echo "대체 방법:"
    echo "1. AWS Lightsail 콘솔에서 브라우저 기반 SSH 사용"
    echo "2. 아래 명령어를 브라우저 SSH에서 직접 실행:"
    echo ""
    echo "cd $PROJECT_PATH"
    echo "git pull origin main"
    echo "source venv/bin/activate"
    echo "pip install -r requirements.txt"
    echo "sudo systemctl restart followscope"
    echo "sudo systemctl status followscope"
    echo ""
    exit 1
fi

# SSH 연결 테스트
echo -n "서버 연결 테스트 중..."
if ssh $SSH_KEY -o ConnectTimeout=5 -o BatchMode=yes $SERVER_USER@$SERVER_IP exit 2>/dev/null; then
    echo -e " ${GREEN}성공!${NC}"
else
    echo -e " ${RED}실패!${NC}"
    echo "SSH 연결을 확인해주세요."
    exit 1
fi

# 배포 시작
echo ""
echo "배포를 시작합니다..."

# 원격 명령 실행
ssh $SSH_KEY $SERVER_USER@$SERVER_IP << 'ENDSSH'
    set -e
    
    echo "1. 프로젝트 디렉토리로 이동"
    cd ~/FollowScope
    
    echo "2. Git 상태 확인"
    git status
    
    echo "3. 최신 코드 가져오기"
    git pull origin main
    
    echo "4. 가상환경 활성화 및 패키지 업데이트"
    source venv/bin/activate
    pip install -r requirements.txt
    
    echo "5. 서비스 재시작"
    sudo systemctl restart followscope
    
    echo "6. 서비스 상태 확인"
    sudo systemctl status followscope --no-pager
    
    echo "7. 최근 로그 확인"
    sudo journalctl -u followscope -n 20 --no-pager
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}배포가 성공적으로 완료되었습니다!${NC}"
    echo "서비스 URL: http://$SERVER_IP:8080"
else
    echo ""
    echo -e "${RED}배포 중 오류가 발생했습니다.${NC}"
    exit 1
fi