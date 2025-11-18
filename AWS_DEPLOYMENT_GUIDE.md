# AWS 배포 가이드

이 문서는 Todo 앱을 AWS에 배포하는 방법을 단계별로 안내합니다.

## 📋 목차

1. [배포 아키텍처 개요](#배포-아키텍처-개요)
2. [사전 준비사항](#사전-준비사항)
3. [데이터베이스 설정 (RDS)](#데이터베이스-설정-rds)
4. [백엔드 배포](#백엔드-배포)
5. [프론트엔드 배포](#프론트엔드-배포)
6. [환경 변수 설정](#환경-변수-설정)
7. [도메인 및 HTTPS 설정](#도메인-및-https-설정)
8. [모니터링 및 로깅](#모니터링-및-로깅)
9. [트러블슈팅](#트러블슈팅)

---

## 🏗️ 배포 아키텍처 개요

### 옵션 1: 단순 배포 (권장 - 시작용)
```
[사용자] 
    ↓
[EC2 인스턴스]
    ├── Express 서버 (백엔드)
    ├── 정적 파일 (프론트엔드)
    └── [RDS MariaDB]
```

### 옵션 2: 분리 배포 (프로덕션 권장)
```
[사용자]
    ↓
[CloudFront CDN]
    ↓
[S3 버킷] (프론트엔드)
    ↓
[EC2/Elastic Beanstalk] (백엔드 API)
    ↓
[RDS MariaDB]
```

---

## 📦 사전 준비사항

### 필요한 AWS 서비스
- **EC2** 또는 **Elastic Beanstalk**: 백엔드 서버
- **RDS**: MariaDB 데이터베이스
- **S3** (선택): 프론트엔드 정적 파일 호스팅
- **CloudFront** (선택): CDN 및 HTTPS
- **Route 53** (선택): 도메인 관리

### 필요한 도구
- AWS CLI 설치 및 구성
- Git
- Node.js 및 npm

---

## 🗄️ 데이터베이스 설정 (RDS)

### 1. RDS MariaDB 인스턴스 생성

1. **AWS 콘솔** → **RDS** → **데이터베이스 생성**

2. **설정 구성**:
   - **엔진 선택**: MariaDB
   - **템플릿**: 프로덕션 또는 개발/테스트
   - **버전**: 최신 안정 버전
   - **인스턴스 클래스**: `db.t3.micro` (프리티어) 또는 `db.t3.small`
   - **스토리지**: 20GB (프리티어) 또는 필요에 따라
   - **마스터 사용자 이름**: `admin` (또는 원하는 이름)
   - **마스터 암호**: 강력한 비밀번호 설정

3. **네트워크 설정**:
   - **VPC**: 기본 VPC 또는 새 VPC
   - **퍼블릭 액세스**: 예 (백엔드 서버에서 접근 가능하도록)
   - **보안 그룹**: 새로 생성하거나 기존 사용
   - **데이터베이스 포트**: `3312` (기본값)

4. **데이터베이스 이름**: `todo`

5. **생성** 클릭

### 2. 보안 그룹 설정

RDS 인스턴스의 보안 그룹에서:
- **인바운드 규칙 추가**:
  - **타입**: MySQL/Aurora
  - **포트**: 3312
  - **소스**: 백엔드 서버의 보안 그룹 또는 특정 IP

### 3. 데이터베이스 초기화

RDS 인스턴스가 생성되면:

1. **엔드포인트 주소 확인**: RDS 콘솔에서 엔드포인트 주소 복사
   - 예: `todo-db.xxxxx.ap-northeast-2.rds.amazonaws.com`

2. **로컬에서 초기화** (MySQL 클라이언트 사용):
   ```bash
   mysql -h [RDS-엔드포인트] -u admin -p < backend/init-db.sql
   ```

   또는 AWS Systems Manager Session Manager를 통해 EC2에서 실행

---

## 🚀 백엔드 배포

### 방법 1: EC2에 직접 배포

#### 1. EC2 인스턴스 생성

1. **AWS 콘솔** → **EC2** → **인스턴스 시작**

2. **설정**:
   - **AMI**: Amazon Linux 2023 또는 Ubuntu 22.04 LTS
   - **인스턴스 유형**: `t3.micro` (프리티어) 또는 `t3.small`
   - **키 페어**: 새로 생성하거나 기존 사용 (다운로드 필수!)
   - **보안 그룹**: 
     - SSH (포트 22) - 내 IP에서만
     - HTTP (포트 80)
     - HTTPS (포트 443)
     - 커스텀 TCP (포트 3000) - 필요시

3. **인스턴스 시작**

#### 2. EC2 인스턴스 설정

SSH로 접속:
```bash
ssh -i [키파일.pem] ec2-user@[EC2-퍼블릭-IP]
# Ubuntu의 경우: ssh -i [키파일.pem] ubuntu@[EC2-퍼블릭-IP]
```

필수 패키지 설치:
```bash
# Amazon Linux
sudo yum update -y
sudo yum install -y nodejs npm git

# Ubuntu
sudo apt update
sudo apt install -y nodejs npm git
```

Node.js 버전 확인 (최신 LTS 권장):
```bash
node --version
npm --version
```

#### 3. 애플리케이션 배포

프로젝트 클론 또는 업로드:
```bash
# Git 사용
git clone [your-repo-url]
cd ToDo_aws

# 또는 SCP로 파일 업로드
# 로컬에서 실행:
# scp -i [키파일.pem] -r backend ec2-user@[EC2-IP]:~/
```

의존성 설치:
```bash
cd backend
npm install --production
```

#### 4. 환경 변수 설정

`.env` 파일 생성:
```bash
cd backend
nano .env
```

다음 내용 추가:
```env
# 데이터베이스 설정
DB_HOST=[RDS-엔드포인트]
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=[RDS-비밀번호]
DB_NAME=todo
DB_CONNECTION_LIMIT=5

# 서버 설정
PORT=3000
NODE_ENV=production
```

#### 5. PM2로 프로세스 관리 (권장)

PM2 설치 및 설정:
```bash
sudo npm install -g pm2

# 애플리케이션 시작
cd ~/ToDo_aws/backend
pm2 start server.js --name todo-backend

# 자동 시작 설정
pm2 startup
pm2 save
```

#### 6. Nginx 리버스 프록시 설정 (선택, 권장)

Nginx 설치:
```bash
# Amazon Linux
sudo amazon-linux-extras install nginx1 -y

# Ubuntu
sudo apt install -y nginx
```

Nginx 설정 파일 생성:
```bash
sudo nano /etc/nginx/conf.d/todo.conf
```

다음 내용 추가:
```nginx
server {
    listen 80;
    server_name [도메인 또는 EC2-IP];

    # 프론트엔드 정적 파일
    location / {
        root /home/ec2-user/ToDo_aws/frontend;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # API 프록시
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Nginx 시작 및 재시작:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo nginx -t  # 설정 테스트
sudo systemctl reload nginx
```

### 방법 2: Elastic Beanstalk 배포 (더 간단)

#### 1. 애플리케이션 준비

프로젝트 루트에 `.ebextensions` 폴더 생성:
```bash
mkdir .ebextensions
```

`.ebextensions/nodecommand.config` 파일 생성:
```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "node server.js"
```

#### 2. Elastic Beanstalk 애플리케이션 생성

1. **AWS 콘솔** → **Elastic Beanstalk** → **애플리케이션 생성**

2. **설정**:
   - **애플리케이션 이름**: `todo-app`
   - **플랫폼**: Node.js
   - **플랫폼 브랜치**: 최신 버전
   - **애플리케이션 코드**: 코드 업로드 또는 Git 연동

3. **환경 변수 설정**:
   - 환경 → 구성 → 소프트웨어 → 환경 속성
   - RDS 연결 정보 추가

#### 3. RDS 연결

Elastic Beanstalk에서 RDS 인스턴스를 환경에 추가:
- 환경 → 구성 → 데이터베이스 → 추가

---

## 🎨 프론트엔드 배포

### 방법 1: EC2에 함께 배포 (Nginx 사용)

백엔드 배포 시 Nginx 설정에서 이미 포함됨 (위 참조)

### 방법 2: S3 + CloudFront 배포 (프로덕션 권장)

#### 1. S3 버킷 생성

1. **AWS 콘솔** → **S3** → **버킷 만들기**

2. **설정**:
   - **버킷 이름**: `todo-app-frontend` (고유한 이름)
   - **리전**: 백엔드와 동일한 리전
   - **퍼블릭 액세스 차단**: 해제 (또는 버킷 정책으로 허용)
   - **정적 웹사이트 호스팅**: 활성화

3. **버킷 정책 추가** (퍼블릭 읽기 허용):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::todo-app-frontend/*"
    }
  ]
}
```

#### 2. 프론트엔드 파일 업로드

API URL 수정:
```javascript
// frontend/app.js
const API_BASE_URL = 'https://[백엔드-도메인]/api/todos';
```

파일 업로드:
```bash
# AWS CLI 사용
aws s3 sync frontend/ s3://todo-app-frontend --delete

# 또는 콘솔에서 직접 업로드
```

#### 3. CloudFront 배포 (HTTPS 및 CDN)

1. **AWS 콘솔** → **CloudFront** → **배포 생성**

2. **설정**:
   - **원본 도메인**: S3 버킷 선택
   - **뷰어 프로토콜 정책**: HTTPS만 또는 리디렉션
   - **캐시 정책**: CachingOptimized
   - **가격 클래스**: All Price Classes

3. **배포 완료 후 도메인 사용**

---

## ⚙️ 환경 변수 설정

### database.js 수정

`backend/config/database.js`를 환경 변수를 사용하도록 수정:

```javascript
const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'todo',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 5
});

// ... 나머지 코드 동일
```

### .env.example 파일 생성

프로젝트에 `.env.example` 파일을 포함하여 필요한 환경 변수를 문서화합니다.

---

## 🌐 도메인 및 HTTPS 설정

### 1. Route 53으로 도메인 연결

1. **Route 53**에서 호스팅 영역 생성
2. 도메인 등록 또는 기존 도메인 연결
3. A 레코드 추가 (EC2 IP 또는 CloudFront 도메인)

### 2. SSL/TLS 인증서 (Let's Encrypt)

EC2에서 Certbot 사용:
```bash
sudo yum install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

### 3. CloudFront 사용 시

ACM (AWS Certificate Manager)에서 인증서 발급 후 CloudFront에 연결

---

## 📊 모니터링 및 로깅

### CloudWatch 설정

1. **로그 그룹 생성**:
   - `/aws/ec2/todo-backend`

2. **PM2 로그 설정**:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### CloudWatch 알람 설정

- CPU 사용률
- 메모리 사용률
- 데이터베이스 연결 수
- API 응답 시간

---

## 🔧 트러블슈팅

### 일반적인 문제

#### 1. 데이터베이스 연결 실패
- **원인**: 보안 그룹 설정 문제
- **해결**: RDS 보안 그룹에서 백엔드 서버의 보안 그룹 허용

#### 2. CORS 오류
- **원인**: 프론트엔드와 백엔드 도메인 불일치
- **해결**: `backend/server.js`의 CORS 설정 확인

#### 3. 포트 접근 불가
- **원인**: 보안 그룹에서 포트 미개방
- **해결**: EC2 보안 그룹에서 필요한 포트 개방

#### 4. 환경 변수 로드 실패
- **원인**: `.env` 파일 경로 문제
- **해결**: `dotenv` 설정 확인 및 파일 경로 확인

### 로그 확인

```bash
# PM2 로그
pm2 logs todo-backend

# Nginx 로그
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 시스템 로그
sudo journalctl -u nginx -f
```

---

## 📝 체크리스트

배포 전 확인사항:

- [ ] RDS 인스턴스 생성 및 데이터베이스 초기화 완료
- [ ] EC2 인스턴스 생성 및 보안 그룹 설정 완료
- [ ] 환경 변수 파일 (.env) 설정 완료
- [ ] 데이터베이스 연결 테스트 성공
- [ ] 백엔드 서버 실행 및 API 테스트 성공
- [ ] 프론트엔드 API URL 수정 완료
- [ ] Nginx 설정 및 정적 파일 서빙 확인
- [ ] HTTPS 인증서 설정 (프로덕션)
- [ ] 도메인 연결 및 DNS 설정
- [ ] 모니터링 및 알람 설정

---

## 💰 비용 최적화 팁

1. **프리티어 활용**: EC2 t3.micro, RDS db.t3.micro
2. **예약 인스턴스**: 장기 사용 시 예약 인스턴스 구매
3. **S3 스토리지 클래스**: IA(Infrequent Access) 사용
4. **CloudWatch 로그 보관**: 필요시 S3로 아카이빙
5. **자동 스케일링**: 트래픽에 따라 인스턴스 조정

---

## 🔐 보안 권장사항

1. **환경 변수**: 민감한 정보는 절대 코드에 포함하지 않기
2. **보안 그룹**: 최소 권한 원칙 적용
3. **HTTPS**: 모든 통신 암호화
4. **데이터베이스**: 퍼블릭 액세스 제한
5. **정기 업데이트**: OS 및 패키지 정기 업데이트
6. **백업**: RDS 자동 백업 활성화

---

## 📚 추가 리소스

- [AWS RDS 문서](https://docs.aws.amazon.com/rds/)
- [AWS EC2 문서](https://docs.aws.amazon.com/ec2/)
- [AWS Elastic Beanstalk 문서](https://docs.aws.amazon.com/elasticbeanstalk/)
- [PM2 문서](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

**작성일**: 2024년
**버전**: 1.0

