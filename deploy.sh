#!/bin/bash

# AWS 배포 스크립트
# 사용법: ./deploy.sh [환경] [EC2-IP] [키파일]
# 예시: ./deploy.sh production 1.2.3.4 ~/.ssh/todo-key.pem

ENVIRONMENT=${1:-production}
EC2_IP=${2:-""}
KEY_FILE=${3:-""}

if [ -z "$EC2_IP" ] || [ -z "$KEY_FILE" ]; then
    echo "사용법: ./deploy.sh [환경] [EC2-IP] [키파일]"
    echo "예시: ./deploy.sh production 1.2.3.4 ~/.ssh/todo-key.pem"
    exit 1
fi

echo "🚀 배포 시작..."
echo "환경: $ENVIRONMENT"
echo "EC2 IP: $EC2_IP"

# 백엔드 파일 업로드
echo "📦 백엔드 파일 업로드 중..."
scp -i "$KEY_FILE" -r backend/* ec2-user@$EC2_IP:~/ToDo_aws/backend/

# 프론트엔드 파일 업로드
echo "📦 프론트엔드 파일 업로드 중..."
scp -i "$KEY_FILE" -r frontend/* ec2-user@$EC2_IP:~/ToDo_aws/frontend/

# 배포 명령 실행
echo "🔄 서버 재시작 중..."
ssh -i "$KEY_FILE" ec2-user@$EC2_IP << 'ENDSSH'
cd ~/ToDo_aws/backend
npm install --production
pm2 restart todo-backend || pm2 start server.js --name todo-backend
pm2 save
ENDSSH

echo "✅ 배포 완료!"

