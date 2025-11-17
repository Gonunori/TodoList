# Todo 백엔드 서버

Node.js, Express, MariaDB를 사용한 Todo 앱 백엔드 서버입니다.

## 설치 방법

1. 의존성 패키지 설치:
```bash
npm install
```

2. MariaDB 데이터베이스 설정:
   - MariaDB가 실행 중인지 확인
   - `init-db.sql` 파일을 실행하여 데이터베이스와 테이블 생성:
   ```bash
   mysql -u root -p1234 < init-db.sql
   ```
   또는 MariaDB 클라이언트에서 직접 실행:
   ```sql
   source init-db.sql
   ```

## 실행 방법

```bash
npm start
```

서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

## API 엔드포인트

### 할 일 조회 (전체)
- **GET** `/api/todos`
- 응답: 할 일 목록 배열

### 할 일 조회 (단일)
- **GET** `/api/todos/:id`
- 응답: 할 일 객체

### 할 일 추가
- **POST** `/api/todos`
- 요청 본문:
  ```json
  {
    "text": "할 일 내용",
    "dueDate": "2024-12-31" // 선택사항
  }
  ```
- 응답: 생성된 할 일 객체

### 할 일 수정
- **PUT** `/api/todos/:id`
- 요청 본문:
  ```json
  {
    "text": "수정된 내용", // 선택사항
    "completed": true,     // 선택사항
    "dueDate": "2024-12-31" // 선택사항
  }
  ```
- 응답: 수정된 할 일 객체

### 할 일 삭제
- **DELETE** `/api/todos/:id`
- 응답: 삭제 성공 메시지

### 완료된 할 일 모두 삭제
- **DELETE** `/api/todos/completed/all`
- 응답: 삭제된 개수와 메시지

## 데이터베이스 설정

- **호스트**: localhost
- **포트**: 3306
- **사용자**: root
- **비밀번호**: 1234
- **데이터베이스**: todo

설정을 변경하려면 `config/database.js` 파일을 수정하세요.

