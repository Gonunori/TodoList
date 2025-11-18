# 환경 변수 설정 예시

`backend` 폴더에 `.env` 파일을 생성하고 다음 내용을 추가하세요.

## 로컬 개발 환경

```env
# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3312
DB_USER=root
DB_PASSWORD=1wjadbdbfdlsmfrh%WJQTHRWKRKSMFDJ0
DB_NAME=todo
DB_CONNECTION_LIMIT=5

# 서버 설정
PORT=3000
NODE_ENV=development
```

## AWS RDS 사용 시

```env
# 데이터베이스 설정 (RDS)
DB_HOST=todo.cdug2aa4s2o8.ap-northeast-2.rds.amazonaws.com
DB_PORT=3312
DB_USER=root
DB_PASSWORD=1wjadbdbfdlsmfrh%WJQTHRWKRKSMFDJ0
DB_NAME=todo
DB_CONNECTION_LIMIT=5

# 서버 설정
PORT=3000
NODE_ENV=production
```

## 주의사항

- `.env` 파일은 절대 Git에 커밋하지 마세요
- `.gitignore`에 `.env`가 포함되어 있는지 확인하세요
- 프로덕션 환경에서는 AWS Systems Manager Parameter Store나 Secrets Manager 사용을 권장합니다

