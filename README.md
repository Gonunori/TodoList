# Todo 앱

할 일 관리 웹 애플리케이션입니다. 프론트엔드는 순수 HTML/CSS/JavaScript로 구성되어 있고, 백엔드는 Node.js, Express, MariaDB를 사용합니다.

## 프로젝트 구조

```
ToDo/
├── backend/              # 백엔드 서버
│   ├── config/          # 데이터베이스 설정
│   ├── routes/          # API 라우트
│   ├── server.js        # Express 서버
│   ├── init-db.sql      # 데이터베이스 초기화 스크립트
│   └── package.json     # 백엔드 의존성
├── app.js               # 프론트엔드 JavaScript
├── index.html           # 메인 HTML 파일
├── style.css            # 스타일시트
└── README.md            # 프로젝트 설명서
```

## 시작하기

### 1. 데이터베이스 설정

MariaDB가 설치되어 있고 실행 중이어야 합니다.

데이터베이스와 테이블을 생성합니다:

```bash
mysql -u root -p1234 < backend/init-db.sql
```

또는 MariaDB 클라이언트에서 직접 실행:

```sql
source backend/init-db.sql
```

### 2. 백엔드 서버 실행

```bash
cd backend
npm install
npm start
```

서버는 `http://localhost:3000`에서 실행됩니다.

### 3. 프론트엔드 실행

웹 서버를 통해 `index.html`을 열거나, 간단한 HTTP 서버를 사용할 수 있습니다:

```bash
# Python 3를 사용하는 경우
python -m http.server 8000

# Node.js http-server를 사용하는 경우
npx http-server -p 8000
```

그 후 브라우저에서 `http://localhost:8000`을 열어주세요.

## 기능

- ✅ 할 일 추가, 수정, 삭제
- ✅ 할 일 완료 처리
- ✅ 마감일 설정 및 알림
- ✅ 검색 및 필터링 (전체/미완료/완료)
- ✅ 마감순 정렬
- ✅ 리스트/주간/캘린더 뷰
- ✅ 완료된 항목 일괄 삭제

## API 엔드포인트

### 할 일 조회 (전체)
- **GET** `/api/todos`

### 할 일 조회 (단일)
- **GET** `/api/todos/:id`

### 할 일 추가
- **POST** `/api/todos`
- Body: `{ "text": "할 일 내용", "dueDate": "2024-12-31" }`

### 할 일 수정
- **PUT** `/api/todos/:id`
- Body: `{ "text": "수정된 내용", "completed": true, "dueDate": "2024-12-31" }`

### 할 일 삭제
- **DELETE** `/api/todos/:id`

### 완료된 할 일 모두 삭제
- **DELETE** `/api/todos/completed/all`

## 데이터베이스 설정

- **호스트**: localhost
- **포트**: 3306
- **사용자**: root
- **비밀번호**: 1234
- **데이터베이스**: todo

설정을 변경하려면 `backend/config/database.js` 파일을 수정하세요.

## 기술 스택

### 프론트엔드
- HTML5
- CSS3
- Vanilla JavaScript

### 백엔드
- Node.js
- Express.js
- MariaDB

