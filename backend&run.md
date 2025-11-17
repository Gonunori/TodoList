# 백엔드 구성 요청
_Exported on 11/12/2025 at 16:42:34 GMT+9 from Cursor (2.0.69)_

---

**User**

이 프로젝트에서 백엔드를 구성해줘

- 백엔드: Node.js, Express
- DB: mariadb 
  1. database : todo
  2. root계정 (password:1234)
  3. port : 3306


---

**Cursor**


프로젝트 구조 파악을 위해 주요 파일 확인 중.



백엔드 구성 시작. Node.js + Express + MariaDB로 설정 중.



백엔드 폴더 구조 생성 및 필수 파일 작성 중.


```json
{
  "name": "todo-backend",
  "version": "1.0.0",
  "description": "Todo 앱 백엔드 서버",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "keywords": ["todo", "express", "mariadb"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "mariadb": "^3.2.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}

```

```javascript
const mariadb = require('mariadb');

// 데이터베이스 연결 풀 생성
const pool = mariadb.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'todo',
    connectionLimit: 5
});

// 데이터베이스 연결 테스트
async function testConnection() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('✅ MariaDB 연결 성공');
        return true;
    } catch (err) {
        console.error('❌ MariaDB 연결 실패:', err);
        return false;
    } finally {
        if (conn) conn.release();
    }
}

module.exports = {
    pool,
    testConnection
};

```

```javascript
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 모든 할 일 조회
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            'SELECT * FROM todos ORDER BY id DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error('할 일 조회 오류:', err);
        res.status(500).json({ error: '할 일을 불러오는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 특정 할 일 조회
router.get('/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('할 일 조회 오류:', err);
        res.status(500).json({ error: '할 일을 불러오는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 추가
router.post('/', async (req, res) => {
    let conn;
    try {
        const { text, dueDate } = req.body;
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ error: '할 일 내용을 입력해주세요.' });
        }
        
        conn = await pool.getConnection();
        const result = await conn.query(
            'INSERT INTO todos (text, completed, dueDate, completedDate) VALUES (?, ?, ?, ?)',
            [text.trim(), false, dueDate || null, null]
        );
        
        // 생성된 할 일 조회
        const newTodo = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json(newTodo[0]);
    } catch (err) {
        console.error('할 일 추가 오류:', err);
        res.status(500).json({ error: '할 일을 추가하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 수정
router.put('/:id', async (req, res) => {
    let conn;
    try {
        const { text, completed, dueDate } = req.body;
        
        conn = await pool.getConnection();
        
        // 기존 할 일 조회
        const existing = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        
        // 완료 상태가 변경되는 경우 completedDate 업데이트
        let completedDate = existing[0].completedDate;
        if (completed !== undefined) {
            if (completed && !existing[0].completed) {
                // 완료로 변경
                completedDate = new Date().toISOString();
            } else if (!completed && existing[0].completed) {
                // 미완료로 변경
                completedDate = null;
            }
        }
        
        await conn.query(
            'UPDATE todos SET text = ?, completed = ?, dueDate = ?, completedDate = ? WHERE id = ?',
            [
                text !== undefined ? text.trim() : existing[0].text,
                completed !== undefined ? completed : existing[0].completed,
                dueDate !== undefined ? dueDate : existing[0].dueDate,
                completedDate,
                req.params.id
            ]
        );
        
        // 업데이트된 할 일 조회
        const updated = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        res.json(updated[0]);
    } catch (err) {
        console.error('할 일 수정 오류:', err);
        res.status(500).json({ error: '할 일을 수정하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 삭제
router.delete('/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'DELETE FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        
        res.json({ message: '할 일이 삭제되었습니다.', id: req.params.id });
    } catch (err) {
        console.error('할 일 삭제 오류:', err);
        res.status(500).json({ error: '할 일을 삭제하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 완료된 할 일 모두 삭제
router.delete('/completed/all', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'DELETE FROM todos WHERE completed = true'
        );
        
        res.json({ 
            message: `${result.affectedRows}개의 완료된 할 일이 삭제되었습니다.`,
            deletedCount: result.affectedRows
        });
    } catch (err) {
        console.error('완료된 할 일 삭제 오류:', err);
        res.status(500).json({ error: '완료된 할 일을 삭제하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;

```

```javascript
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');
const todosRouter = require('./routes/todos');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors()); // CORS 허용 (프론트엔드와 통신)
app.use(express.json()); // JSON 파싱
app.use(express.urlencoded({ extended: true })); // URL 인코딩된 데이터 파싱

// 라우트 설정
app.use('/api/todos', todosRouter);

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '서버가 정상적으로 실행 중입니다.' });
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

```

```sql
-- 데이터베이스 생성 (이미 존재하면 무시)
CREATE DATABASE IF NOT EXISTS todo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 데이터베이스 사용
USE todo;

-- todos 테이블 생성
CREATE TABLE IF NOT EXISTS todos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(500) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    dueDate DATE NULL,
    completedDate DATETIME NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_completed (completed),
    INDEX idx_dueDate (dueDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

```

```markdown
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

```


프론트엔드 코드를 API 호출로 변경 중.



프론트엔드 코드를 API 호출로 변경 중.


```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    // 기존 데이터 마이그레이션: completed가 true인데 completedDate가 없는 경우 처리
    todos.forEach(todo => {
        if (todo.completed && !todo.completedDate) {
            // 기존 완료 항목은 날짜를 null로 유지 (표시하지 않음)
            todo.completedDate = null;
        }
    });
    saveTodos();
    renderCurrentView();
    updateCount();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    checkDueDateNotifications();
});

// 할 일 추가 함수
function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        id: Date.now(),
        text: text,
        completed: false,
        dueDate: dueDate
    };
    
    todos.push(todo);
    saveTodos();
    renderCurrentView();
    updateCount();
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    const dueDate = new Date(dateString + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        // 완료할 때 날짜/시간 저장, 미완료로 되돌릴 때는 제거
        if (todo.completed) {
            todo.completedDate = new Date().toISOString();
        } else {
            todo.completedDate = null;
        }
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// 할 일 삭제 함수
function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        todos = todos.filter(t => t.id !== id);
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// localStorage에 저장하는 함수
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
function saveEdit(id, newText) {
    const todo = todos.find(t => t.id === id);
    if (todo && newText.trim() !== '') {
        todo.text = newText.trim();
        saveTodos();
        editingId = null;
        renderTodos();
    } else if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
    } else {
        editingId = null;
        renderTodos();
    }
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        const due = new Date(todo.dueDate + 'T23:59:59');
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```

```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        id: Date.now(),
        text: text,
        completed: false,
        dueDate: dueDate
    };
    
    todos.push(todo);
    saveTodos();
    renderCurrentView();
    updateCount();
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    const dueDate = new Date(dateString + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        // 완료할 때 날짜/시간 저장, 미완료로 되돌릴 때는 제거
        if (todo.completed) {
            todo.completedDate = new Date().toISOString();
        } else {
            todo.completedDate = null;
        }
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// 할 일 삭제 함수
function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        todos = todos.filter(t => t.id !== id);
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// localStorage에 저장하는 함수
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
function saveEdit(id, newText) {
    const todo = todos.find(t => t.id === id);
    if (todo && newText.trim() !== '') {
        todo.text = newText.trim();
        saveTodos();
        editingId = null;
        renderTodos();
    } else if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
    } else {
        editingId = null;
        renderTodos();
    }
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        const due = new Date(todo.dueDate + 'T23:59:59');
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```

```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        text: text,
        dueDate: dueDate
    };
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
    
    await createTodo(todo);
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    const dueDate = new Date(dateString + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        // 완료할 때 날짜/시간 저장, 미완료로 되돌릴 때는 제거
        if (todo.completed) {
            todo.completedDate = new Date().toISOString();
        } else {
            todo.completedDate = null;
        }
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// 할 일 삭제 함수
function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        todos = todos.filter(t => t.id !== id);
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// localStorage에 저장하는 함수
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
function saveEdit(id, newText) {
    const todo = todos.find(t => t.id === id);
    if (todo && newText.trim() !== '') {
        todo.text = newText.trim();
        saveTodos();
        editingId = null;
        renderTodos();
    } else if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
    } else {
        editingId = null;
        renderTodos();
    }
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        const due = new Date(todo.dueDate + 'T23:59:59');
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```

```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        text: text,
        dueDate: dueDate
    };
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
    
    await createTodo(todo);
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    const dueDate = new Date(dateString + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompleted = !todo.completed;
        await updateTodo(id, { completed: newCompleted });
    }
}

// 할 일 삭제 함수
function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        todos = todos.filter(t => t.id !== id);
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// localStorage에 저장하는 함수
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
function saveEdit(id, newText) {
    const todo = todos.find(t => t.id === id);
    if (todo && newText.trim() !== '') {
        todo.text = newText.trim();
        saveTodos();
        editingId = null;
        renderTodos();
    } else if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
    } else {
        editingId = null;
        renderTodos();
    }
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        const due = new Date(todo.dueDate + 'T23:59:59');
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```

```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        text: text,
        dueDate: dueDate
    };
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
    
    await createTodo(todo);
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    const dueDate = new Date(dateString + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompleted = !todo.completed;
        await updateTodo(id, { completed: newCompleted });
    }
}

// 할 일 삭제 함수
async function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        await deleteTodoById(id);
    }
}

// localStorage에 저장하는 함수
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
function saveEdit(id, newText) {
    const todo = todos.find(t => t.id === id);
    if (todo && newText.trim() !== '') {
        todo.text = newText.trim();
        saveTodos();
        editingId = null;
        renderTodos();
    } else if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
    } else {
        editingId = null;
        renderTodos();
    }
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        const due = new Date(todo.dueDate + 'T23:59:59');
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```

```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        text: text,
        dueDate: dueDate
    };
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
    
    await createTodo(todo);
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    const dueDate = new Date(dateString + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompleted = !todo.completed;
        await updateTodo(id, { completed: newCompleted });
    }
}

// 할 일 삭제 함수
async function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        await deleteTodoById(id);
    }
}

// 저장 함수는 더 이상 필요 없음 (API로 처리)

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
function saveEdit(id, newText) {
    const todo = todos.find(t => t.id === id);
    if (todo && newText.trim() !== '') {
        todo.text = newText.trim();
        saveTodos();
        editingId = null;
        renderTodos();
    } else if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
    } else {
        editingId = null;
        renderTodos();
    }
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        const due = new Date(todo.dueDate + 'T23:59:59');
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```

```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        text: text,
        dueDate: dueDate
    };
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
    
    await createTodo(todo);
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    const dueDate = new Date(dateString + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompleted = !todo.completed;
        await updateTodo(id, { completed: newCompleted });
    }
}

// 할 일 삭제 함수
async function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        await deleteTodoById(id);
    }
}

// 저장 함수는 더 이상 필요 없음 (API로 처리)

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
async function saveEdit(id, newText) {
    if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
        return;
    }
    
    editingId = null;
    await updateTodo(id, { text: newText.trim() });
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        renderCurrentView();
        updateCount();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        const due = new Date(todo.dueDate + 'T23:59:59');
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```

```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        text: text,
        dueDate: dueDate
    };
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
    
    await createTodo(todo);
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    const dueDate = new Date(dateString + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompleted = !todo.completed;
        await updateTodo(id, { completed: newCompleted });
    }
}

// 할 일 삭제 함수
async function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        await deleteTodoById(id);
    }
}

// 저장 함수는 더 이상 필요 없음 (API로 처리)

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
async function saveEdit(id, newText) {
    if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
        return;
    }
    
    editingId = null;
    await updateTodo(id, { text: newText.trim() });
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
async function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        await clearCompletedTodos();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        const due = new Date(todo.dueDate + 'T23:59:59');
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```


프로젝트 루트에 `.gitignore`와 `README.md` 추가 중.


```ignore
# Dependencies
node_modules/
backend/node_modules/

# Environment variables
.env
.env.local

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build files
dist/
build/

```

```markdown
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

```


백엔드 구성 완료. Node.js, Express, MariaDB로 구성했습니다.

## 생성된 파일 구조

```
backend/
├── config/
│   └── database.js      # MariaDB 연결 설정
├── routes/
│   └── todos.js         # Todo API 라우트
├── server.js            # Express 서버 메인 파일
├── init-db.sql          # 데이터베이스 초기화 스크립트
├── package.json         # 백엔드 의존성
└── README.md           # 백엔드 사용 설명서
```

## 다음 단계

1. 데이터베이스 초기화:
   ```bash
   mysql -u root -p1234 < backend/init-db.sql
   ```

2. 백엔드 의존성 설치 및 실행:
   ```bash
   cd backend
   npm install
   npm start
   ```

3. 프론트엔드 실행:
   - 웹 서버로 `index.html` 열기
   - 또는 간단한 HTTP 서버 사용: `python -m http.server 8000`

## 주요 변경 사항

- 백엔드: Express 서버와 RESTful API 구성
- 데이터베이스: MariaDB 연결 및 CRUD 작업 구현
- 프론트엔드: localStorage 대신 API 호출로 변경
- API 엔드포인트: 할 일 추가/수정/삭제/조회 기능 제공

프론트엔드는 `http://localhost:3000/api/todos`로 API를 호출합니다. 백엔드 서버가 실행 중이어야 정상 작동합니다.

```plaintext
backend/
├── config/
│   └── database.js      # MariaDB 연결 설정
├── routes/
│   └── todos.js         # Todo API 라우트
├── server.js            # Express 서버 메인 파일
├── init-db.sql          # 데이터베이스 초기화 스크립트
├── package.json         # 백엔드 의존성
└── README.md           # 백엔드 사용 설명서
```

```shellscript
   mysql -u root -p1234 < backend/init-db.sql
```

```shellscript
   cd backend
   npm install
   npm start
```

---

**User**

PS C:\jelee\ToDo> npm install

npm : 이 시스템에서 스크립트를 실행할 수 없으므로 C:\Program Files\nodejs\npm.ps1 파일을 로드할 수 없습니다. 자세한 내용은 about_Execution_Policies(https://go.microsoft.com/fwlink/?LinkID=13517

 로드할 수 없습니다. 자세한 내용은 about_Execution_Policies(https://go.microsoft.com/fwlink/?LinkID=13517

0)를 참조하십시오.

위치 줄:1 문자:1

+ npm install

+ ~~~

    + CategoryInfo          : 보안 오류: (:) [], PSSecurityException

    + FullyQualifiedErrorId : UnauthorizedAccess

---

**Cursor**


PowerShell 실행 정책 때문에 발생한 오류입니다. 해결 방법:



PowerShell 실행 정책 오류입니다. 해결 방법:

- 방법 1: CMD 사용 (권장)
  - PowerShell을 닫고 CMD를 열어 실행:



PowerShell에서는 `&&`가 동작하지 않습니다. PowerShell에서 실행:


---

**User**

db에 테이블을 구성할수 있는 sql문을 만들어줘

---

**Cursor**


기존 SQL 파일을 확인하고, 필요 시 개선하겠습니다.



기존 SQL 파일을 더 상세하고 사용하기 쉽게 개선 중입니다.


```sql
-- ============================================
-- Todo 앱 데이터베이스 초기화 스크립트
-- ============================================

-- 기존 데이터베이스 삭제 (선택사항 - 주석 해제하여 사용)
-- DROP DATABASE IF EXISTS todo;

-- 데이터베이스 생성 (이미 존재하면 무시)
CREATE DATABASE IF NOT EXISTS todo 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- 데이터베이스 사용
USE todo;

-- 기존 테이블 삭제 (재생성 시 사용 - 주석 해제하여 사용)
-- DROP TABLE IF EXISTS todos;

-- todos 테이블 생성
CREATE TABLE IF NOT EXISTS todos (
    -- 기본 키: 자동 증가하는 고유 ID
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 할 일 내용 (최대 500자)
    text VARCHAR(500) NOT NULL,
    
    -- 완료 여부 (기본값: false)
    completed BOOLEAN DEFAULT FALSE,
    
    -- 마감일 (선택사항)
    dueDate DATE NULL,
    
    -- 완료 날짜 및 시간 (완료 시 자동 기록)
    completedDate DATETIME NULL,
    
    -- 생성 날짜 및 시간 (자동 기록)
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 수정 날짜 및 시간 (자동 업데이트)
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 인덱스: 완료 여부로 빠른 검색
    INDEX idx_completed (completed),
    
    -- 인덱스: 마감일로 빠른 정렬 및 검색
    INDEX idx_dueDate (dueDate),
    
    -- 인덱스: 생성일로 정렬
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='할 일 목록 테이블';

-- 테이블 구조 확인 (선택사항)
-- DESCRIBE todos;

-- 샘플 데이터 삽입 (선택사항 - 주석 해제하여 사용)
-- INSERT INTO todos (text, completed, dueDate) VALUES
--     ('프로젝트 계획서 작성', FALSE, '2024-12-31'),
--     ('회의 준비 자료 정리', FALSE, '2024-12-25'),
--     ('코드 리뷰 완료', TRUE, '2024-12-20'),
--     ('데이터베이스 설계', FALSE, NULL);

-- 데이터 확인 (선택사항)
-- SELECT * FROM todos;


```


데이터베이스 테이블 구성 SQL을 개선했습니다.

## 주요 개선 사항

1. 주석 추가: 각 필드 설명
2. 인덱스 추가: `createdAt` 인덱스 추가로 정렬 성능 개선
3. 선택적 기능: 주석 처리된 옵션들
   - 데이터베이스/테이블 삭제 (재생성 시 사용)
   - 샘플 데이터 삽입
   - 테이블 구조 확인

## 사용 방법

### 방법 1: 명령줄에서 실행
```bash
mysql -u root -p1234 < backend/init-db.sql
```

### 방법 2: MariaDB 클라이언트에서 실행
```sql
source backend/init-db.sql
```

### 방법 3: 직접 SQL 실행
MariaDB 클라이언트(예: HeidiSQL, DBeaver)에서 파일 내용을 복사해 실행하세요.

## 테이블 구조

- `id`: 자동 증가 기본 키
- `text`: 할 일 내용 (필수, 최대 500자)
- `completed`: 완료 여부 (기본값: false)
- `dueDate`: 마감일 (선택사항)
- `completedDate`: 완료 날짜/시간
- `createdAt`: 생성 날짜/시간 (자동)
- `updatedAt`: 수정 날짜/시간 (자동 업데이트)

인덱스가 설정되어 있어 검색과 정렬이 빠릅니다.

```shellscript
mysql -u root -p1234 < backend/init-db.sql
```

```sql
source backend/init-db.sql
```

---

**User**

@powershell (9-17) 

---

**Cursor**


PowerShell 실행 정책 오류 해결 방법:

- 방법 1: npm.cmd 직접 사용 (권장, 관리자 권한 불필요)


---

**User**

@powershell (16-32) 

---

**Cursor**


`npm start`도 같은 오류가 발생합니다. `npm.cmd start`로 실행하세요.



서버가 백그라운드에서 실행 중입니다.

## PowerShell에서 npm 사용 방법

PowerShell 실행 정책 때문에 `npm` 대신 `npm.cmd`를 사용하세요:

### 일반적인 npm 명령어 대체 방법:

```powershell
# ❌ 이렇게 하면 오류 발생
npm install
npm start
npm run dev

# ✅ 이렇게 사용하세요
npm.cmd install
npm.cmd start
npm.cmd run dev
```

### 영구적인 해결 방법 (선택사항)

PowerShell 실행 정책을 변경하려면 관리자 권한으로 PowerShell을 열고 다음 명령을 실행하세요:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

이렇게 하면 `npm` 명령을 직접 사용할 수 있습니다. 보안상 권장하지 않을 수 있으므로, `npm.cmd` 사용을 권장합니다.

서버가 실행 중이면 `http://localhost:3000`에서 확인할 수 있습니다.

```powershell
# ❌ 이렇게 하면 오류 발생
npm install
npm start
npm run dev

# ✅ 이렇게 사용하세요
npm.cmd install
npm.cmd start
npm.cmd run dev
```

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```


서버는 실행 중이지만 루트 경로(`/`)에 라우트가 없어 "Cannot GET /" 오류가 발생합니다. 루트 경로에 안내 페이지를 추가하거나 프론트엔드를 서빙하도록 설정하겠습니다.



루트 경로에 안내 페이지를 추가하고, 프론트엔드 파일을 서빙하도록 설정 중입니다.


```javascript
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
app.use(express.static(path.join(__dirname, '..')));

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
                <p><a href="/index.html">Todo 앱 열기</a></p>
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


```


서버 코드를 수정했습니다. 변경 사항을 적용하려면 서버를 재시작하세요.

## 변경 사항

1. 루트 경로(`/`) 추가: API 정보 안내 페이지
2. 정적 파일 서빙: 프론트엔드 파일(`index.html`, `app.js`, `style.css`) 서빙
3. 프론트엔드 접근: `http://localhost:3000/index.html`로 직접 접근 가능

## 서버 재시작 방법

현재 실행 중인 서버를 중지하고 다시 시작하세요:

1. 터미널에서 `Ctrl + C`로 서버 중지
2. 다시 시작:
   ```powershell
   cd backend
   npm.cmd start
   ```

또는 새 터미널 창에서:
```powershell
cd C:\jelee\ToDo\backend
npm.cmd start
```

## 접속 방법

서버 재시작 후:

- `http://localhost:3000` - API 정보 안내 페이지
- `http://localhost:3000/index.html` - Todo 앱 (프론트엔드)
- `http://localhost:3000/api/todos` - API 엔드포인트
- `http://localhost:3000/api/health` - 서버 상태 확인

이제 "Cannot GET /" 오류 없이 접속할 수 있습니다.

```powershell
   cd backend
   npm.cmd start
```

```powershell
cd C:\jelee\ToDo\backend
npm.cmd start
```

---

**User**

completeddate가 null로 주입

---

**Cursor**


날짜가 "NaN/NaN/NaN"으로 표시되는 문제 확인 중. 데이터베이스 날짜 처리와 프론트엔드 파싱을 점검합니다.



날짜 파싱 문제 확인 중. `formatDueDate` 함수와 데이터베이스 날짜 반환 형식 확인 중.



날짜가 null이거나 형식이 잘못되어 NaN이 발생합니다. API와 프론트엔드에서 날짜 처리 로직을 수정 중입니다.



API에서 날짜 필드를 정리하고, 프론트엔드에서 날짜 파싱을 개선 중입니다.


```javascript
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 날짜 필드 정리 헬퍼 함수
function formatTodoResponse(todo) {
    if (!todo) return todo;
    
    return {
        ...todo,
        // DATE 타입을 문자열로 변환 (null인 경우 null 유지)
        dueDate: todo.dueDate ? (typeof todo.dueDate === 'string' ? todo.dueDate : todo.dueDate.toISOString().split('T')[0]) : null,
        // DATETIME 타입을 ISO 문자열로 변환 (null인 경우 null 유지)
        completedDate: todo.completedDate ? (typeof todo.completedDate === 'string' ? todo.completedDate : new Date(todo.completedDate).toISOString()) : null,
        // BOOLEAN 타입 보장
        completed: Boolean(todo.completed)
    };
}

// 모든 할 일 조회
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            'SELECT * FROM todos ORDER BY id DESC'
        );
        // 각 항목의 날짜 필드 정리
        const formattedRows = rows.map(formatTodoResponse);
        res.json(formattedRows);
    } catch (err) {
        console.error('할 일 조회 오류:', err);
        res.status(500).json({ error: '할 일을 불러오는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 특정 할 일 조회
router.get('/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('할 일 조회 오류:', err);
        res.status(500).json({ error: '할 일을 불러오는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 추가
router.post('/', async (req, res) => {
    let conn;
    try {
        const { text, dueDate } = req.body;
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ error: '할 일 내용을 입력해주세요.' });
        }
        
        conn = await pool.getConnection();
        const result = await conn.query(
            'INSERT INTO todos (text, completed, dueDate, completedDate) VALUES (?, ?, ?, ?)',
            [text.trim(), false, dueDate || null, null]
        );
        
        // 생성된 할 일 조회
        const newTodo = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json(newTodo[0]);
    } catch (err) {
        console.error('할 일 추가 오류:', err);
        res.status(500).json({ error: '할 일을 추가하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 수정
router.put('/:id', async (req, res) => {
    let conn;
    try {
        const { text, completed, dueDate } = req.body;
        
        conn = await pool.getConnection();
        
        // 기존 할 일 조회
        const existing = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        
        // 완료 상태가 변경되는 경우 completedDate 업데이트
        let completedDate = existing[0].completedDate;
        if (completed !== undefined) {
            if (completed && !existing[0].completed) {
                // 완료로 변경
                completedDate = new Date().toISOString();
            } else if (!completed && existing[0].completed) {
                // 미완료로 변경
                completedDate = null;
            }
        }
        
        await conn.query(
            'UPDATE todos SET text = ?, completed = ?, dueDate = ?, completedDate = ? WHERE id = ?',
            [
                text !== undefined ? text.trim() : existing[0].text,
                completed !== undefined ? completed : existing[0].completed,
                dueDate !== undefined ? dueDate : existing[0].dueDate,
                completedDate,
                req.params.id
            ]
        );
        
        // 업데이트된 할 일 조회
        const updated = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        res.json(updated[0]);
    } catch (err) {
        console.error('할 일 수정 오류:', err);
        res.status(500).json({ error: '할 일을 수정하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 삭제
router.delete('/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'DELETE FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        
        res.json({ message: '할 일이 삭제되었습니다.', id: req.params.id });
    } catch (err) {
        console.error('할 일 삭제 오류:', err);
        res.status(500).json({ error: '할 일을 삭제하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 완료된 할 일 모두 삭제
router.delete('/completed/all', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'DELETE FROM todos WHERE completed = true'
        );
        
        res.json({ 
            message: `${result.affectedRows}개의 완료된 할 일이 삭제되었습니다.`,
            deletedCount: result.affectedRows
        });
    } catch (err) {
        console.error('완료된 할 일 삭제 오류:', err);
        res.status(500).json({ error: '완료된 할 일을 삭제하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;


```

```javascript
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 날짜 필드 정리 헬퍼 함수
function formatTodoResponse(todo) {
    if (!todo) return todo;
    
    return {
        ...todo,
        // DATE 타입을 문자열로 변환 (null인 경우 null 유지)
        dueDate: todo.dueDate ? (typeof todo.dueDate === 'string' ? todo.dueDate : todo.dueDate.toISOString().split('T')[0]) : null,
        // DATETIME 타입을 ISO 문자열로 변환 (null인 경우 null 유지)
        completedDate: todo.completedDate ? (typeof todo.completedDate === 'string' ? todo.completedDate : new Date(todo.completedDate).toISOString()) : null,
        // BOOLEAN 타입 보장
        completed: Boolean(todo.completed)
    };
}

// 모든 할 일 조회
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            'SELECT * FROM todos ORDER BY id DESC'
        );
        // 각 항목의 날짜 필드 정리
        const formattedRows = rows.map(formatTodoResponse);
        res.json(formattedRows);
    } catch (err) {
        console.error('할 일 조회 오류:', err);
        res.status(500).json({ error: '할 일을 불러오는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 특정 할 일 조회
router.get('/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        res.json(formatTodoResponse(rows[0]));
    } catch (err) {
        console.error('할 일 조회 오류:', err);
        res.status(500).json({ error: '할 일을 불러오는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 추가
router.post('/', async (req, res) => {
    let conn;
    try {
        const { text, dueDate } = req.body;
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ error: '할 일 내용을 입력해주세요.' });
        }
        
        conn = await pool.getConnection();
        const result = await conn.query(
            'INSERT INTO todos (text, completed, dueDate, completedDate) VALUES (?, ?, ?, ?)',
            [text.trim(), false, dueDate || null, null]
        );
        
        // 생성된 할 일 조회
        const newTodo = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json(newTodo[0]);
    } catch (err) {
        console.error('할 일 추가 오류:', err);
        res.status(500).json({ error: '할 일을 추가하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 수정
router.put('/:id', async (req, res) => {
    let conn;
    try {
        const { text, completed, dueDate } = req.body;
        
        conn = await pool.getConnection();
        
        // 기존 할 일 조회
        const existing = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        
        // 완료 상태가 변경되는 경우 completedDate 업데이트
        let completedDate = existing[0].completedDate;
        if (completed !== undefined) {
            if (completed && !existing[0].completed) {
                // 완료로 변경
                completedDate = new Date().toISOString();
            } else if (!completed && existing[0].completed) {
                // 미완료로 변경
                completedDate = null;
            }
        }
        
        await conn.query(
            'UPDATE todos SET text = ?, completed = ?, dueDate = ?, completedDate = ? WHERE id = ?',
            [
                text !== undefined ? text.trim() : existing[0].text,
                completed !== undefined ? completed : existing[0].completed,
                dueDate !== undefined ? dueDate : existing[0].dueDate,
                completedDate,
                req.params.id
            ]
        );
        
        // 업데이트된 할 일 조회
        const updated = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        res.json(updated[0]);
    } catch (err) {
        console.error('할 일 수정 오류:', err);
        res.status(500).json({ error: '할 일을 수정하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 삭제
router.delete('/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'DELETE FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        
        res.json({ message: '할 일이 삭제되었습니다.', id: req.params.id });
    } catch (err) {
        console.error('할 일 삭제 오류:', err);
        res.status(500).json({ error: '할 일을 삭제하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 완료된 할 일 모두 삭제
router.delete('/completed/all', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'DELETE FROM todos WHERE completed = true'
        );
        
        res.json({ 
            message: `${result.affectedRows}개의 완료된 할 일이 삭제되었습니다.`,
            deletedCount: result.affectedRows
        });
    } catch (err) {
        console.error('완료된 할 일 삭제 오류:', err);
        res.status(500).json({ error: '완료된 할 일을 삭제하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;


```

```javascript
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 날짜 필드 정리 헬퍼 함수
function formatTodoResponse(todo) {
    if (!todo) return todo;
    
    return {
        ...todo,
        // DATE 타입을 문자열로 변환 (null인 경우 null 유지)
        dueDate: todo.dueDate ? (typeof todo.dueDate === 'string' ? todo.dueDate : todo.dueDate.toISOString().split('T')[0]) : null,
        // DATETIME 타입을 ISO 문자열로 변환 (null인 경우 null 유지)
        completedDate: todo.completedDate ? (typeof todo.completedDate === 'string' ? todo.completedDate : new Date(todo.completedDate).toISOString()) : null,
        // BOOLEAN 타입 보장
        completed: Boolean(todo.completed)
    };
}

// 모든 할 일 조회
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            'SELECT * FROM todos ORDER BY id DESC'
        );
        // 각 항목의 날짜 필드 정리
        const formattedRows = rows.map(formatTodoResponse);
        res.json(formattedRows);
    } catch (err) {
        console.error('할 일 조회 오류:', err);
        res.status(500).json({ error: '할 일을 불러오는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 특정 할 일 조회
router.get('/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        res.json(formatTodoResponse(rows[0]));
    } catch (err) {
        console.error('할 일 조회 오류:', err);
        res.status(500).json({ error: '할 일을 불러오는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 추가
router.post('/', async (req, res) => {
    let conn;
    try {
        const { text, dueDate } = req.body;
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ error: '할 일 내용을 입력해주세요.' });
        }
        
        conn = await pool.getConnection();
        const result = await conn.query(
            'INSERT INTO todos (text, completed, dueDate, completedDate) VALUES (?, ?, ?, ?)',
            [text.trim(), false, dueDate || null, null]
        );
        
        // 생성된 할 일 조회
        const newTodo = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json(formatTodoResponse(newTodo[0]));
    } catch (err) {
        console.error('할 일 추가 오류:', err);
        res.status(500).json({ error: '할 일을 추가하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 수정
router.put('/:id', async (req, res) => {
    let conn;
    try {
        const { text, completed, dueDate } = req.body;
        
        conn = await pool.getConnection();
        
        // 기존 할 일 조회
        const existing = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        
        // 완료 상태가 변경되는 경우 completedDate 업데이트
        let completedDate = existing[0].completedDate;
        if (completed !== undefined) {
            if (completed && !existing[0].completed) {
                // 완료로 변경
                completedDate = new Date().toISOString();
            } else if (!completed && existing[0].completed) {
                // 미완료로 변경
                completedDate = null;
            }
        }
        
        await conn.query(
            'UPDATE todos SET text = ?, completed = ?, dueDate = ?, completedDate = ? WHERE id = ?',
            [
                text !== undefined ? text.trim() : existing[0].text,
                completed !== undefined ? completed : existing[0].completed,
                dueDate !== undefined ? dueDate : existing[0].dueDate,
                completedDate,
                req.params.id
            ]
        );
        
        // 업데이트된 할 일 조회
        const updated = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        res.json(updated[0]);
    } catch (err) {
        console.error('할 일 수정 오류:', err);
        res.status(500).json({ error: '할 일을 수정하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 삭제
router.delete('/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'DELETE FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        
        res.json({ message: '할 일이 삭제되었습니다.', id: req.params.id });
    } catch (err) {
        console.error('할 일 삭제 오류:', err);
        res.status(500).json({ error: '할 일을 삭제하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 완료된 할 일 모두 삭제
router.delete('/completed/all', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'DELETE FROM todos WHERE completed = true'
        );
        
        res.json({ 
            message: `${result.affectedRows}개의 완료된 할 일이 삭제되었습니다.`,
            deletedCount: result.affectedRows
        });
    } catch (err) {
        console.error('완료된 할 일 삭제 오류:', err);
        res.status(500).json({ error: '완료된 할 일을 삭제하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;


```

```javascript
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 날짜 필드 정리 헬퍼 함수
function formatTodoResponse(todo) {
    if (!todo) return todo;
    
    return {
        ...todo,
        // DATE 타입을 문자열로 변환 (null인 경우 null 유지)
        dueDate: todo.dueDate ? (typeof todo.dueDate === 'string' ? todo.dueDate : todo.dueDate.toISOString().split('T')[0]) : null,
        // DATETIME 타입을 ISO 문자열로 변환 (null인 경우 null 유지)
        completedDate: todo.completedDate ? (typeof todo.completedDate === 'string' ? todo.completedDate : new Date(todo.completedDate).toISOString()) : null,
        // BOOLEAN 타입 보장
        completed: Boolean(todo.completed)
    };
}

// 모든 할 일 조회
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            'SELECT * FROM todos ORDER BY id DESC'
        );
        // 각 항목의 날짜 필드 정리
        const formattedRows = rows.map(formatTodoResponse);
        res.json(formattedRows);
    } catch (err) {
        console.error('할 일 조회 오류:', err);
        res.status(500).json({ error: '할 일을 불러오는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 특정 할 일 조회
router.get('/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        res.json(formatTodoResponse(rows[0]));
    } catch (err) {
        console.error('할 일 조회 오류:', err);
        res.status(500).json({ error: '할 일을 불러오는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 추가
router.post('/', async (req, res) => {
    let conn;
    try {
        const { text, dueDate } = req.body;
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ error: '할 일 내용을 입력해주세요.' });
        }
        
        conn = await pool.getConnection();
        const result = await conn.query(
            'INSERT INTO todos (text, completed, dueDate, completedDate) VALUES (?, ?, ?, ?)',
            [text.trim(), false, dueDate || null, null]
        );
        
        // 생성된 할 일 조회
        const newTodo = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json(formatTodoResponse(newTodo[0]));
    } catch (err) {
        console.error('할 일 추가 오류:', err);
        res.status(500).json({ error: '할 일을 추가하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 수정
router.put('/:id', async (req, res) => {
    let conn;
    try {
        const { text, completed, dueDate } = req.body;
        
        conn = await pool.getConnection();
        
        // 기존 할 일 조회
        const existing = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        
        // 완료 상태가 변경되는 경우 completedDate 업데이트
        let completedDate = existing[0].completedDate;
        if (completed !== undefined) {
            if (completed && !existing[0].completed) {
                // 완료로 변경
                completedDate = new Date().toISOString();
            } else if (!completed && existing[0].completed) {
                // 미완료로 변경
                completedDate = null;
            }
        }
        
        await conn.query(
            'UPDATE todos SET text = ?, completed = ?, dueDate = ?, completedDate = ? WHERE id = ?',
            [
                text !== undefined ? text.trim() : existing[0].text,
                completed !== undefined ? completed : existing[0].completed,
                dueDate !== undefined ? dueDate : existing[0].dueDate,
                completedDate,
                req.params.id
            ]
        );
        
        // 업데이트된 할 일 조회
        const updated = await conn.query(
            'SELECT * FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        res.json(formatTodoResponse(updated[0]));
    } catch (err) {
        console.error('할 일 수정 오류:', err);
        res.status(500).json({ error: '할 일을 수정하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 할 일 삭제
router.delete('/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'DELETE FROM todos WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        
        res.json({ message: '할 일이 삭제되었습니다.', id: req.params.id });
    } catch (err) {
        console.error('할 일 삭제 오류:', err);
        res.status(500).json({ error: '할 일을 삭제하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 완료된 할 일 모두 삭제
router.delete('/completed/all', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'DELETE FROM todos WHERE completed = true'
        );
        
        res.json({ 
            message: `${result.affectedRows}개의 완료된 할 일이 삭제되었습니다.`,
            deletedCount: result.affectedRows
        });
    } catch (err) {
        console.error('완료된 할 일 삭제 오류:', err);
        res.status(500).json({ error: '완료된 할 일을 삭제하는 중 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;


```

```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        text: text,
        dueDate: dueDate
    };
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
    
    await createTodo(todo);
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    // 날짜 문자열이 유효한지 확인
    let dueDate;
    if (typeof dateString === 'string' && dateString.includes('T')) {
        // ISO 형식인 경우
        dueDate = new Date(dateString);
    } else if (typeof dateString === 'string') {
        // YYYY-MM-DD 형식인 경우
        dueDate = new Date(dateString + 'T23:59:59');
    } else {
        dueDate = new Date(dateString);
    }
    
    // 유효한 날짜인지 확인
    if (isNaN(dueDate.getTime())) {
        return '';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompleted = !todo.completed;
        await updateTodo(id, { completed: newCompleted });
    }
}

// 할 일 삭제 함수
async function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        await deleteTodoById(id);
    }
}

// 저장 함수는 더 이상 필요 없음 (API로 처리)

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
async function saveEdit(id, newText) {
    if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
        return;
    }
    
    editingId = null;
    await updateTodo(id, { text: newText.trim() });
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
async function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        await clearCompletedTodos();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        const due = new Date(todo.dueDate + 'T23:59:59');
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```

```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        text: text,
        dueDate: dueDate
    };
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
    
    await createTodo(todo);
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    // 날짜 문자열이 유효한지 확인
    let dueDate;
    if (typeof dateString === 'string' && dateString.includes('T')) {
        // ISO 형식인 경우
        dueDate = new Date(dateString);
    } else if (typeof dateString === 'string') {
        // YYYY-MM-DD 형식인 경우
        dueDate = new Date(dateString + 'T23:59:59');
    } else {
        dueDate = new Date(dateString);
    }
    
    // 유효한 날짜인지 확인
    if (isNaN(dueDate.getTime())) {
        return '';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    let due;
    if (typeof dueDate === 'string' && dueDate.includes('T')) {
        due = new Date(dueDate);
    } else if (typeof dueDate === 'string') {
        due = new Date(dueDate + 'T23:59:59');
    } else {
        due = new Date(dueDate);
    }
    
    if (isNaN(due.getTime())) return false;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    const due = new Date(dueDate + 'T23:59:59');
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompleted = !todo.completed;
        await updateTodo(id, { completed: newCompleted });
    }
}

// 할 일 삭제 함수
async function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        await deleteTodoById(id);
    }
}

// 저장 함수는 더 이상 필요 없음 (API로 처리)

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
async function saveEdit(id, newText) {
    if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
        return;
    }
    
    editingId = null;
    await updateTodo(id, { text: newText.trim() });
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
async function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        await clearCompletedTodos();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        const due = new Date(todo.dueDate + 'T23:59:59');
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```

```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        text: text,
        dueDate: dueDate
    };
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
    
    await createTodo(todo);
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    // 날짜 문자열이 유효한지 확인
    let dueDate;
    if (typeof dateString === 'string' && dateString.includes('T')) {
        // ISO 형식인 경우
        dueDate = new Date(dateString);
    } else if (typeof dateString === 'string') {
        // YYYY-MM-DD 형식인 경우
        dueDate = new Date(dateString + 'T23:59:59');
    } else {
        dueDate = new Date(dateString);
    }
    
    // 유효한 날짜인지 확인
    if (isNaN(dueDate.getTime())) {
        return '';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    let due;
    if (typeof dueDate === 'string' && dueDate.includes('T')) {
        due = new Date(dueDate);
    } else if (typeof dueDate === 'string') {
        due = new Date(dueDate + 'T23:59:59');
    } else {
        due = new Date(dueDate);
    }
    
    if (isNaN(due.getTime())) return false;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    let due;
    if (typeof dueDate === 'string' && dueDate.includes('T')) {
        due = new Date(dueDate);
    } else if (typeof dueDate === 'string') {
        due = new Date(dueDate + 'T23:59:59');
    } else {
        due = new Date(dueDate);
    }
    
    if (isNaN(due.getTime())) return false;
    
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompleted = !todo.completed;
        await updateTodo(id, { completed: newCompleted });
    }
}

// 할 일 삭제 함수
async function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        await deleteTodoById(id);
    }
}

// 저장 함수는 더 이상 필요 없음 (API로 처리)

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
async function saveEdit(id, newText) {
    if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
        return;
    }
    
    editingId = null;
    await updateTodo(id, { text: newText.trim() });
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
async function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        await clearCompletedTodos();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        const due = new Date(todo.dueDate + 'T23:59:59');
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```


알림 체크 함수도 수정 중입니다.


```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        text: text,
        dueDate: dueDate
    };
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
    
    await createTodo(todo);
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    // 날짜 문자열이 유효한지 확인
    let dueDate;
    if (typeof dateString === 'string' && dateString.includes('T')) {
        // ISO 형식인 경우
        dueDate = new Date(dateString);
    } else if (typeof dateString === 'string') {
        // YYYY-MM-DD 형식인 경우
        dueDate = new Date(dateString + 'T23:59:59');
    } else {
        dueDate = new Date(dateString);
    }
    
    // 유효한 날짜인지 확인
    if (isNaN(dueDate.getTime())) {
        return '';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    let due;
    if (typeof dueDate === 'string' && dueDate.includes('T')) {
        due = new Date(dueDate);
    } else if (typeof dueDate === 'string') {
        due = new Date(dueDate + 'T23:59:59');
    } else {
        due = new Date(dueDate);
    }
    
    if (isNaN(due.getTime())) return false;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    let due;
    if (typeof dueDate === 'string' && dueDate.includes('T')) {
        due = new Date(dueDate);
    } else if (typeof dueDate === 'string') {
        due = new Date(dueDate + 'T23:59:59');
    } else {
        due = new Date(dueDate);
    }
    
    if (isNaN(due.getTime())) return false;
    
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompleted = !todo.completed;
        await updateTodo(id, { completed: newCompleted });
    }
}

// 할 일 삭제 함수
async function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        await deleteTodoById(id);
    }
}

// 저장 함수는 더 이상 필요 없음 (API로 처리)

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
async function saveEdit(id, newText) {
    if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
        return;
    }
    
    editingId = null;
    await updateTodo(id, { text: newText.trim() });
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
async function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        await clearCompletedTodos();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        let due;
        if (typeof todo.dueDate === 'string' && todo.dueDate.includes('T')) {
            due = new Date(todo.dueDate);
        } else if (typeof todo.dueDate === 'string') {
            due = new Date(todo.dueDate + 'T23:59:59');
        } else {
            due = new Date(todo.dueDate);
        }
        
        if (isNaN(due.getTime())) return false;
        
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```


주간 뷰와 캘린더 뷰의 날짜 비교 로직도 수정 중입니다.


```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        text: text,
        dueDate: dueDate
    };
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
    
    await createTodo(todo);
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    // 날짜 문자열이 유효한지 확인
    let dueDate;
    if (typeof dateString === 'string' && dateString.includes('T')) {
        // ISO 형식인 경우
        dueDate = new Date(dateString);
    } else if (typeof dateString === 'string') {
        // YYYY-MM-DD 형식인 경우
        dueDate = new Date(dateString + 'T23:59:59');
    } else {
        dueDate = new Date(dateString);
    }
    
    // 유효한 날짜인지 확인
    if (isNaN(dueDate.getTime())) {
        return '';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    let due;
    if (typeof dueDate === 'string' && dueDate.includes('T')) {
        due = new Date(dueDate);
    } else if (typeof dueDate === 'string') {
        due = new Date(dueDate + 'T23:59:59');
    } else {
        due = new Date(dueDate);
    }
    
    if (isNaN(due.getTime())) return false;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    let due;
    if (typeof dueDate === 'string' && dueDate.includes('T')) {
        due = new Date(dueDate);
    } else if (typeof dueDate === 'string') {
        due = new Date(dueDate + 'T23:59:59');
    } else {
        due = new Date(dueDate);
    }
    
    if (isNaN(due.getTime())) return false;
    
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompleted = !todo.completed;
        await updateTodo(id, { completed: newCompleted });
    }
}

// 할 일 삭제 함수
async function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        await deleteTodoById(id);
    }
}

// 저장 함수는 더 이상 필요 없음 (API로 처리)

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
async function saveEdit(id, newText) {
    if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
        return;
    }
    
    editingId = null;
    await updateTodo(id, { text: newText.trim() });
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
async function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        await clearCompletedTodos();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            // 날짜 형식 정규화 (YYYY-MM-DD)
            let todoDateStr = todo.dueDate;
            if (typeof todoDateStr === 'string' && todoDateStr.includes('T')) {
                todoDateStr = todoDateStr.split('T')[0];
            }
            return todoDateStr === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            return todo.dueDate === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        let due;
        if (typeof todo.dueDate === 'string' && todo.dueDate.includes('T')) {
            due = new Date(todo.dueDate);
        } else if (typeof todo.dueDate === 'string') {
            due = new Date(todo.dueDate + 'T23:59:59');
        } else {
            due = new Date(todo.dueDate);
        }
        
        if (isNaN(due.getTime())) return false;
        
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```

```javascript
// DOM 요소 가져오기
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// API 기본 URL
const API_BASE_URL = 'http://localhost:3000/api/todos';

// 할 일 데이터
let todos = [];

// 필터 및 검색 상태
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let sortByDueDate = false;
let currentView = 'list';
let currentWeekStart = new Date();
let currentMonth = new Date();

// API 호출 함수들
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('할 일을 불러오는데 실패했습니다.');
        todos = await response.json();
        renderCurrentView();
        updateCount();
    } catch (error) {
        console.error('할 일 불러오기 오류:', error);
        alert('할 일을 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTodo(todo) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todo)
        });
        if (!response.ok) throw new Error('할 일 추가에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일을 추가하는데 실패했습니다.');
    }
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('할 일 수정에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        alert('할 일을 수정하는데 실패했습니다.');
    }
}

async function deleteTodoById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일을 삭제하는데 실패했습니다.');
    }
}

async function clearCompletedTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/completed/all`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('완료된 할 일 삭제에 실패했습니다.');
        await fetchTodos();
    } catch (error) {
        console.error('완료된 할 일 삭제 오류:', error);
        alert('완료된 할 일을 삭제하는데 실패했습니다.');
    }
}

// 페이지 로드 시 저장된 할 일 목록 표시
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
    
    // 알림 체크 시작 (1분마다)
    setInterval(checkDueDateNotifications, 60000);
    
    // 페이지 로드 시 즉시 체크
    setTimeout(checkDueDateNotifications, 1000);
});

// 할 일 추가 함수
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할 일을 입력해주세요!');
        return;
    }
    
    const dueDate = dueDateInput.value || null;
    
    const todo = {
        text: text,
        dueDate: dueDate
    };
    
    // 입력 필드 초기화
    todoInput.value = '';
    dueDateInput.value = '';
    todoInput.focus();
    
    await createTodo(todo);
}

// 필터링 및 검색된 할 일 목록 가져오기
function getFilteredTodos() {
    let filtered = todos;
    
    // 검색 필터
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(todo => 
            todo.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 상태 필터
    if (currentFilter === 'active') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    }
    
    // 마감순 정렬
    if (sortByDueDate) {
        filtered = sortTodosByDueDate(filtered);
    }
    
    return filtered;
}

// 마감순 정렬 함수
function sortTodosByDueDate(todos) {
    return [...todos].sort((a, b) => {
        // 완료된 항목은 맨 아래
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 둘 다 완료되었거나 둘 다 미완료인 경우
        // 기한이 없는 항목은 맨 아래
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        // 마감일이 가까운 순으로 정렬
        const dateA = new Date(a.dueDate + 'T23:59:59');
        const dateB = new Date(b.dueDate + 'T23:59:59');
        return dateA - dateB;
    });
}

// 할 일 목록 렌더링 함수
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-message">할 일이 없습니다. 새로운 할 일을 추가해보세요! ✨</li>';
        } else {
            todoList.innerHTML = '<li class="empty-message">검색 결과가 없습니다. 🔍</li>';
        }
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        const isOverdueItem = !todo.completed && isOverdue(todo.dueDate);
        const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdueItem ? 'overdue' : ''} ${isUrgentItem ? 'urgent' : ''}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        if (editingId === todo.id) {
            // 편집 모드
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = todo.text;
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
            editInput.addEventListener('blur', () => {
                saveEdit(todo.id, editInput.value);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-btn';
            saveBtn.textContent = '저장';
            saveBtn.addEventListener('click', () => saveEdit(todo.id, editInput.value));
            
            li.appendChild(checkbox);
            li.appendChild(editInput);
            li.appendChild(saveBtn);
            
            setTimeout(() => editInput.focus(), 0);
        } else {
            // 일반 모드
            const textContainer = document.createElement('div');
            textContainer.className = 'todo-text-container';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('dblclick', () => startEdit(todo.id));
            
            const dateInfoContainer = document.createElement('div');
            dateInfoContainer.className = 'date-info-container';
            
            // 완료 날짜 표시
            if (todo.completed && todo.completedDate) {
                const completedDateSpan = document.createElement('span');
                completedDateSpan.className = 'todo-date completed-date';
                completedDateSpan.textContent = `완료: ${formatDate(todo.completedDate)}`;
                dateInfoContainer.appendChild(completedDateSpan);
            }
            
            // 완료 기한 표시
            if (todo.dueDate) {
                const dueDateSpan = document.createElement('span');
                const isUrgentItem = !todo.completed && isUrgent(todo.dueDate);
                dueDateSpan.className = `todo-date due-date ${isOverdueItem ? 'overdue-date' : ''} ${isUrgentItem ? 'urgent-date' : ''}`;
                dueDateSpan.textContent = formatDueDate(todo.dueDate);
                dateInfoContainer.appendChild(dueDateSpan);
            }
            
            textContainer.appendChild(textSpan);
            if (dateInfoContainer.children.length > 0) {
                textContainer.appendChild(dateInfoContainer);
            }
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => startEdit(todo.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }
        
        todoList.appendChild(li);
    });
}

// 날짜 포맷팅 함수 (완료 날짜용)
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 오늘인지 확인
    if (todoDate.getTime() === today.getTime()) {
        return `오늘 ${hours}:${minutes}`;
    }
    
    // 어제인지 확인
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (todoDate.getTime() === yesterday.getTime()) {
        return `어제 ${hours}:${minutes}`;
    }
    
    // 올해인지 확인
    if (date.getFullYear() === now.getFullYear()) {
        return `${month}/${day} ${hours}:${minutes}`;
    }
    
    // 다른 해
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 완료 기한 포맷팅 함수
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    // 날짜 문자열이 유효한지 확인
    let dueDate;
    if (typeof dateString === 'string' && dateString.includes('T')) {
        // ISO 형식인 경우
        dueDate = new Date(dateString);
    } else if (typeof dateString === 'string') {
        // YYYY-MM-DD 형식인 경우
        dueDate = new Date(dateString + 'T23:59:59');
    } else {
        dueDate = new Date(dateString);
    }
    
    // 유효한 날짜인지 확인
    if (isNaN(dueDate.getTime())) {
        return '';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    // 오늘인지 확인
    if (dueDateOnly.getTime() === today.getTime()) {
        return '오늘까지';
    }
    
    // 어제인지 확인 (만료됨)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dueDateOnly.getTime() === yesterday.getTime()) {
        return '어제까지 (만료)';
    }
    
    // 과거인지 확인
    if (dueDateOnly.getTime() < today.getTime()) {
        return `${year}/${month}/${day} (만료)`;
    }
    
    // 내일인지 확인
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDateOnly.getTime() === tomorrow.getTime()) {
        return '내일까지';
    }
    
    // 올해인지 확인
    if (dueDate.getFullYear() === now.getFullYear()) {
        return `${month}/${day}까지`;
    }
    
    // 다른 해
    return `${year}/${month}/${day}까지`;
}

// 완료 기한이 지났는지 확인
function isOverdue(dueDate) {
    if (!dueDate) return false;
    
    let due;
    if (typeof dueDate === 'string' && dueDate.includes('T')) {
        due = new Date(dueDate);
    } else if (typeof dueDate === 'string') {
        due = new Date(dueDate + 'T23:59:59');
    } else {
        due = new Date(dueDate);
    }
    
    if (isNaN(due.getTime())) return false;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    return dueDateOnly.getTime() < today.getTime();
}

// 마감 임박(24시간 이내)인지 확인
function isUrgent(dueDate) {
    if (!dueDate) return false;
    
    let due;
    if (typeof dueDate === 'string' && dueDate.includes('T')) {
        due = new Date(dueDate);
    } else if (typeof dueDate === 'string') {
        due = new Date(dueDate + 'T23:59:59');
    } else {
        due = new Date(dueDate);
    }
    
    if (isNaN(due.getTime())) return false;
    
    const now = new Date();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    // 24시간 이내이고 아직 지나지 않았으면 임박
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

// 할 일 완료 상태 토글 함수
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompleted = !todo.completed;
        await updateTodo(id, { completed: newCompleted });
    }
}

// 할 일 삭제 함수
async function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        await deleteTodoById(id);
    }
}

// 저장 함수는 더 이상 필요 없음 (API로 처리)

// 할 일 수정 시작 함수
function startEdit(id) {
    editingId = id;
    renderCurrentView();
}

// 할 일 수정 저장 함수
async function saveEdit(id, newText) {
    if (newText.trim() === '') {
        alert('할 일 내용을 입력해주세요!');
        return;
    }
    
    editingId = null;
    await updateTodo(id, { text: newText.trim() });
}

// 할 일 수정 취소 함수
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 완료된 항목 모두 삭제 함수
async function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        await clearCompletedTodos();
    }
}

// 필터 변경 함수
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderCurrentView();
}

// 카운트 업데이트 함수
function updateCount() {
    const completed = todos.filter(t => t.completed).length;
    const remaining = todos.filter(t => !t.completed).length;
    completedCount.textContent = completed;
    totalCount.textContent = todos.length;
    document.getElementById('remainingCount').textContent = remaining;
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 검색 기능
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

// 필터 버튼 이벤트
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 완료된 항목 모두 삭제 버튼
clearCompletedBtn.addEventListener('click', clearCompleted);

// 정렬 버튼
const sortBtn = document.getElementById('sortBtn');
const sortIcon = document.getElementById('sortIcon');
sortBtn.addEventListener('click', () => {
    sortByDueDate = !sortByDueDate;
    if (sortByDueDate) {
        sortIcon.textContent = '⬇️';
        sortBtn.classList.add('active');
    } else {
        sortIcon.textContent = '🔀';
        sortBtn.classList.remove('active');
    }
    renderCurrentView();
});

// 뷰 모드 전환
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCurrentView();
    });
});

// 현재 뷰 렌더링
function renderCurrentView() {
    if (currentView === 'list') {
        document.getElementById('todoList').classList.remove('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderTodos();
    } else if (currentView === 'week') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
        renderWeekView();
    } else if (currentView === 'calendar') {
        document.getElementById('todoList').classList.add('hidden');
        document.getElementById('weekView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
        renderCalendarView();
    }
}

// 주간 뷰 렌더링
function renderWeekView() {
    const weekDays = document.getElementById('weekDays');
    weekDays.innerHTML = '';
    
    // 주의 시작일 계산 (월요일)
    const start = new Date(currentWeekStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // 주의 종료일 (일요일)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주 제목 업데이트
    const weekTitle = document.getElementById('weekTitle');
    const month = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    weekTitle.textContent = `${start.getFullYear()}년 ${month}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
    
    // 각 날짜별 할 일 표시
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeader.innerHTML = `
            <div class="week-day-name">${dayNames[date.getDay()]}</div>
            <div class="week-day-date">${date.getDate()}</div>
        `;
        
        const dayTodos = document.createElement('div');
        dayTodos.className = 'week-day-todos';
        
        // 해당 날짜의 할 일 필터링
        const dayTodosList = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            // 날짜 형식 정규화 (YYYY-MM-DD)
            let todoDateStr = todo.dueDate;
            if (typeof todoDateStr === 'string' && todoDateStr.includes('T')) {
                todoDateStr = todoDateStr.split('T')[0];
            }
            return todoDateStr === dateStr;
        });
        
        if (dayTodosList.length === 0) {
            dayTodos.innerHTML = '<div class="week-empty">할 일 없음</div>';
        } else {
            dayTodosList.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'week-todo-item';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoItem.classList.add('overdue');
                if (isUrgentItem) todoItem.classList.add('urgent');
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                        onchange="toggleTodo(${todo.id})">
                    <span class="week-todo-text">${todo.text}</span>
                `;
                dayTodos.appendChild(todoItem);
            });
        }
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayTodos);
        weekDays.appendChild(dayDiv);
    }
    
    // 이전/다음 주 버튼
    document.getElementById('prevWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekView();
    };
    
    document.getElementById('nextWeekBtn').onclick = () => {
        currentWeekStart = new Date(start);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekView();
    };
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 캘린더 제목 업데이트
    document.getElementById('calendarTitle').textContent = `${year}년 ${month + 1}월`;
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정
    
    // 요일 헤더
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // 날짜 셀 생성
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        if (!isCurrentMonth) {
            cell.classList.add('other-month');
        }
        if (isToday) {
            cell.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = currentDate.getDate();
        cell.appendChild(dayNumber);
        
        // 해당 날짜의 할 일 표시
        const dayTodos = todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dueDate) return false;
            // 날짜 형식 정규화 (YYYY-MM-DD)
            let todoDateStr = todo.dueDate;
            if (typeof todoDateStr === 'string' && todoDateStr.includes('T')) {
                todoDateStr = todoDateStr.split('T')[0];
            }
            return todoDateStr === dateStr;
        });
        
        if (dayTodos.length > 0) {
            const todosContainer = document.createElement('div');
            todosContainer.className = 'calendar-todos';
            
            dayTodos.slice(0, 3).forEach(todo => {
                const todoDot = document.createElement('div');
                todoDot.className = 'calendar-todo-dot';
                const isOverdueItem = isOverdue(todo.dueDate);
                const isUrgentItem = isUrgent(todo.dueDate);
                if (isOverdueItem) todoDot.classList.add('overdue');
                else if (isUrgentItem) todoDot.classList.add('urgent');
                todosContainer.appendChild(todoDot);
            });
            
            if (dayTodos.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-more';
                more.textContent = `+${dayTodos.length - 3}`;
                todosContainer.appendChild(more);
            }
            
            cell.appendChild(todosContainer);
        }
        
        calendarGrid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 이전/다음 월 버튼
    document.getElementById('prevMonthBtn').onclick = () => {
        currentMonth = new Date(year, month - 1, 1);
        renderCalendarView();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        currentMonth = new Date(year, month + 1, 1);
        renderCalendarView();
    };
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
            }
        });
    }
}

// 마감 알림 체크 및 표시
function checkDueDateNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const now = new Date();
    const urgentTodos = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        
        let due;
        if (typeof todo.dueDate === 'string' && todo.dueDate.includes('T')) {
            due = new Date(todo.dueDate);
        } else if (typeof todo.dueDate === 'string') {
            due = new Date(todo.dueDate + 'T23:59:59');
        } else {
            due = new Date(todo.dueDate);
        }
        
        if (isNaN(due.getTime())) return false;
        
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        // 24시간 이내이고 아직 지나지 않았으면 알림 대상
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });
    
    // 임박한 할 일이 있으면 알림 표시
    if (urgentTodos.length > 0) {
        const todoTexts = urgentTodos.map(t => t.text).join(', ');
        const message = urgentTodos.length === 1 
            ? `"${urgentTodos[0].text}"의 마감이 24시간 이내입니다!`
            : `${urgentTodos.length}개의 할 일이 24시간 이내에 마감됩니다!`;
        
        new Notification('⏰ 마감 임박 알림', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffc107"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            tag: 'todo-urgent-notification',
            requireInteraction: false
        });
    }
}


```


날짜 처리 문제를 수정했습니다.

## 수정 사항

### 1. **백엔드 (API)**
- `formatTodoResponse` 헬퍼 함수 추가: 날짜 필드를 일관된 형식으로 변환
- `dueDate`: DATE 타입을 `YYYY-MM-DD` 문자열로 변환
- `completedDate`: DATETIME을 ISO 문자열로 변환
- null 값 처리

### 2. **프론트엔드**
- `formatDueDate`: 날짜 파싱 시 유효성 검사 추가 (NaN 방지)
- `isOverdue`, `isUrgent`: 날짜 형식 처리 개선
- 주간/캘린더 뷰: 날짜 비교 시 형식 정규화

## 다음 단계

서버를 재시작하세요:

1. 현재 실행 중인 서버 중지 (`Ctrl + C`)
2. 서버 재시작:
   ```powershell
   cd backend
   npm.cmd start
   ```
3. 브라우저 새로고침 (`F5` 또는 `Ctrl + R`)

이제 "NaN/NaN/NaN" 대신 날짜가 정상적으로 표시됩니다. `completedDate`가 null인 경우에도 오류 없이 처리됩니다.

```powershell
   cd backend
   npm.cmd start
```

