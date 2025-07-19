# AWS Lightsail 배포 가이드

## 1. Lightsail 인스턴스 생성

1. [AWS Lightsail 콘솔](https://lightsail.aws.amazon.com/) 접속
2. "인스턴스 생성" 클릭
3. 설정:
   - 리전: Seoul (ap-northeast-2)
   - OS: Ubuntu 22.04 LTS
   - 요금제: $3.5/월 (512MB RAM, 20GB SSD)
4. 인스턴스 이름 입력 후 생성

## 2. 포트 설정

1. 인스턴스 > 네트워킹 탭
2. "규칙 추가" 클릭
3. 사용자 지정, TCP, 8080 포트 추가

## 3. SSH 접속 및 환경 설정

```bash
# Lightsail 콘솔에서 SSH 연결 또는
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@[퍼블릭IP]

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Python 및 필수 패키지 설치
sudo apt install python3-pip python3-venv git -y

# 프로젝트 클론
git clone https://github.com/YOUR_USERNAME/FollowScope.git
cd FollowScope

# 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

## 4. 서비스 파일 생성

```bash
# systemd 서비스 파일 생성
sudo nano /etc/systemd/system/followscope.service
```

서비스 파일 내용:
```ini
[Unit]
Description=FollowScope Web Application
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/FollowScope
Environment="PATH=/home/ubuntu/FollowScope/venv/bin"
ExecStart=/home/ubuntu/FollowScope/venv/bin/gunicorn --config deploy_config/gunicorn_config.py web_app.app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

## 5. 서비스 시작

```bash
# 서비스 활성화 및 시작
sudo systemctl daemon-reload
sudo systemctl enable followscope
sudo systemctl start followscope

# 상태 확인
sudo systemctl status followscope

# 로그 확인
sudo journalctl -u followscope -f
```

## 6. 방화벽 설정 (선택사항)

```bash
sudo ufw allow 22
sudo ufw allow 8080
sudo ufw enable
```

## 7. 접속 확인

브라우저에서 `http://[Lightsail 퍼블릭 IP]:8080` 접속

## 8. 업데이트 방법

```bash
cd /home/ubuntu/FollowScope
git pull
sudo systemctl restart followscope
```

## 9. 도메인 연결 (선택사항)

1. Lightsail > 네트워킹 > 고정 IP 생성
2. Route 53 또는 다른 DNS에서 A 레코드 설정
3. Nginx 설치 및 리버스 프록시 설정:

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/followscope
```

Nginx 설정:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/followscope /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

## 10. HTTPS 설정 (도메인 있을 때)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 비용

- Lightsail: $3.5/월 (약 4,500원)
- 고정 IP: 무료 (인스턴스 연결 시)
- 데이터 전송: 1TB/월 포함

## 팁

1. 데이터 백업: 
   ```bash
   # 크론탭 설정
   crontab -e
   # 매일 새벽 3시 백업
   0 3 * * * tar -czf /home/ubuntu/backup/followscope-data-$(date +\%Y\%m\%d).tar.gz /home/ubuntu/FollowScope/FollowScope/data
   ```

2. 모니터링:
   - CloudWatch 무료 티어 활용
   - 또는 `htop` 설치해서 리소스 확인

3. 보안:
   - SSH 키만 사용 (비밀번호 로그인 비활성화)
   - fail2ban 설치 고려