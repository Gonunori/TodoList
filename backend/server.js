const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./config/database');
const todosRouter = require('./routes/todos');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors()); // CORS 허용 (프론트엔드와 통신)
app.use(express.json()); // JSON 파싱
app.use(express.urlencoded({ extended: true })); // URL 인코딩된 데이터 파싱

// 정적 파일 서빙 (프론트엔드 파일들)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// 라우트 설정
app.use('/api/todos', todosRouter);

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '서버가 정상적으로 실행 중입니다.' });
});

// 루트 경로 - API 정보 안내
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Todo API 서버</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 20px;
                    background: #f5f5f5;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 { color: #333; }
                .endpoint {
                    background: #f8f9fa;
                    padding: 15px;
                    margin: 10px 0;
                    border-left: 4px solid #007bff;
                    border-radius: 4px;
                }
                .method {
                    display: inline-block;
                    padding: 3px 8px;
                    border-radius: 3px;
                    font-weight: bold;
                    font-size: 12px;
                    margin-right: 10px;
                }
                .get { background: #28a745; color: white; }
                .post { background: #007bff; color: white; }
                .put { background: #ffc107; color: black; }
                .delete { background: #dc3545; color: white; }
                a {
                    color: #007bff;
                    text-decoration: none;
                }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📝 Todo API 서버</h1>
                <p>서버가 정상적으로 실행 중입니다.</p>
                
                <h2>API 엔드포인트</h2>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <strong>/api/todos</strong> - 모든 할 일 조회
                </div>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <strong>/api/todos/:id</strong> - 특정 할 일 조회
                </div>
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <strong>/api/todos</strong> - 할 일 추가
                </div>
                <div class="endpoint">
                    <span class="method put">PUT</span>
                    <strong>/api/todos/:id</strong> - 할 일 수정
                </div>
                <div class="endpoint">
                    <span class="method delete">DELETE</span>
                    <strong>/api/todos/:id</strong> - 할 일 삭제
                </div>
                <div class="endpoint">
                    <span class="method delete">DELETE</span>
                    <strong>/api/todos/completed/all</strong> - 완료된 할 일 모두 삭제
                </div>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <strong>/api/health</strong> - 서버 상태 확인
                </div>
                
                <h2>프론트엔드</h2>
                <p><a href="/index.html">Todo 앱 열기</a> (프론트엔드는 frontend 폴더에 있습니다)</p>
            </div>
        </body>
        </html>
    `);
});

// 데이터베이스 연결 테스트 및 서버 시작
async function startServer() {
    const dbConnected = await testConnection();
    
    if (dbConnected) {
        app.listen(PORT, () => {
            console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
            console.log(`📡 API 엔드포인트: http://localhost:${PORT}/api/todos`);
        });
    } else {
        console.error('❌ 데이터베이스 연결에 실패했습니다. 서버를 시작할 수 없습니다.');
        process.exit(1);
    }
}

startServer();

