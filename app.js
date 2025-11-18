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

