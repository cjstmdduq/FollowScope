#!/usr/bin/env python3
"""
FollowScope AWS Lightsail 배포 스크립트
SSH 키 없이도 배포 명령어를 생성하여 수동 실행 가능
"""

import os
import sys
import subprocess
from datetime import datetime

# 서버 정보
# Note: Keep this consistent with README server info
SERVER_IP = "3.35.55.31"
SERVER_USER = "ubuntu"
PROJECT_PATH = "~/FollowScope"
SERVICE_NAME = "followscope"

# 색상 코드
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header():
    """배포 스크립트 헤더 출력"""
    print(f"{BLUE}{'='*50}{RESET}")
    print(f"{BLUE}FollowScope AWS Lightsail 배포{RESET}")
    print(f"서버: {SERVER_IP}")
    print(f"시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{BLUE}{'='*50}{RESET}\n")

def check_ssh_key():
    """SSH 키 파일 확인"""
    possible_paths = [
        os.path.expanduser("~/.ssh/LightsailDefaultKey-ap-northeast-2.pem"),
        os.path.expanduser("~/Downloads/LightsailDefaultKey-ap-northeast-2.pem"),
        "./LightsailDefaultKey-ap-northeast-2.pem"
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            print(f"{GREEN}✓ SSH 키 파일 발견: {path}{RESET}")
            return path
    
    return None

def generate_manual_commands():
    """수동 실행을 위한 명령어 생성"""
    commands = f"""
{YELLOW}AWS Lightsail 콘솔에서 브라우저 SSH를 열고 다음 명령어를 순서대로 실행하세요:{RESET}

{BLUE}1. 프로젝트 디렉토리로 이동:{RESET}
   cd {PROJECT_PATH}

{BLUE}2. 현재 상태 확인:{RESET}
   git status

{BLUE}3. 최신 코드 가져오기:{RESET}
   git pull origin main

{BLUE}4. 패키지 업데이트 (필요시):{RESET}
   source venv/bin/activate
   pip install -r requirements.txt

{BLUE}5. 서비스 재시작:{RESET}
   sudo systemctl restart {SERVICE_NAME}

{BLUE}6. 서비스 상태 확인:{RESET}
   sudo systemctl status {SERVICE_NAME}

{BLUE}7. 로그 확인 (선택사항):{RESET}
   sudo journalctl -u {SERVICE_NAME} -f

{BLUE}8. 배포 확인:{RESET}
   curl -I http://localhost:8080
"""
    return commands

def execute_ssh_deployment(ssh_key_path):
    """SSH를 통한 자동 배포 실행"""
    ssh_command = f"ssh -i {ssh_key_path} {SERVER_USER}@{SERVER_IP}"
    
    deployment_script = f"""
    echo "배포를 시작합니다..."
    cd {PROJECT_PATH}
    
    echo "현재 브랜치 및 상태 확인..."
    git branch
    git status
    
    echo "최신 코드 가져오기..."
    git pull origin main
    
    echo "가상환경 활성화 및 패키지 업데이트..."
    source venv/bin/activate
    pip install -r requirements.txt
    
    echo "서비스 재시작..."
    sudo systemctl restart {SERVICE_NAME}
    
    echo "서비스 상태 확인..."
    sudo systemctl status {SERVICE_NAME} --no-pager
    
    echo "배포 완료!"
    """
    
    try:
        print(f"{YELLOW}SSH를 통해 배포를 시작합니다...{RESET}")
        result = subprocess.run(
            f"{ssh_command} << 'EOF'\n{deployment_script}\nEOF",
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print(f"{GREEN}✓ 배포가 성공적으로 완료되었습니다!{RESET}")
            print(result.stdout)
        else:
            print(f"{RED}✗ 배포 중 오류가 발생했습니다.{RESET}")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"{RED}✗ SSH 연결 실패: {e}{RESET}")
        return False
    
    return True

def create_deployment_checklist():
    """배포 체크리스트 생성"""
    checklist = f"""
{YELLOW}배포 전 체크리스트:{RESET}
□ 로컬에서 모든 변경사항이 커밋되었는지 확인
□ 로컬에서 git push가 완료되었는지 확인
□ 중요한 설정 파일이 올바른지 확인
□ 테스트가 통과했는지 확인

{YELLOW}배포 후 확인사항:{RESET}
□ 서비스가 정상적으로 실행 중인지 확인
□ 웹 브라우저에서 http://{SERVER_IP}:8080 접속 확인
□ 주요 기능 동작 테스트
□ 로그에 에러가 없는지 확인
"""
    return checklist

def main():
    """메인 실행 함수"""
    print_header()
    
    # Git 상태 확인
    print(f"{YELLOW}로컬 Git 상태 확인 중...{RESET}")
    git_status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
    if git_status.stdout:
        print(f"{RED}⚠ 커밋되지 않은 변경사항이 있습니다:{RESET}")
        print(git_status.stdout)
        response = input(f"{YELLOW}계속 진행하시겠습니까? (y/N): {RESET}")
        if response.lower() != 'y':
            print("배포를 취소합니다.")
            return
    
    # SSH 키 확인
    ssh_key_path = check_ssh_key()
    
    if ssh_key_path:
        # SSH 키가 있는 경우 자동 배포 시도
        print(f"\n{GREEN}SSH 키를 사용하여 자동 배포를 시도합니다.{RESET}")
        if execute_ssh_deployment(ssh_key_path):
            print(f"\n{GREEN}✓ 배포가 완료되었습니다!{RESET}")
            print(f"서비스 URL: http://{SERVER_IP}:8080")
        else:
            print(f"\n{YELLOW}자동 배포가 실패했습니다. 수동 배포 방법을 안내합니다.{RESET}")
            print(generate_manual_commands())
    else:
        # SSH 키가 없는 경우 수동 배포 안내
        print(f"{YELLOW}SSH 키 파일을 찾을 수 없습니다.{RESET}")
        print(f"{YELLOW}수동 배포 방법을 안내합니다.{RESET}")
        print(generate_manual_commands())
    
    # 체크리스트 출력
    print(create_deployment_checklist())
    
    # 원클릭 복사를 위한 명령어 모음
    print(f"\n{BLUE}{'='*50}{RESET}")
    print(f"{BLUE}원클릭 복사용 명령어:{RESET}")
    print(f"cd {PROJECT_PATH} && git pull origin main && source venv/bin/activate && pip install -r requirements.txt && sudo systemctl restart {SERVICE_NAME} && sudo systemctl status {SERVICE_NAME}")
    print(f"{BLUE}{'='*50}{RESET}")

if __name__ == "__main__":
    main()
