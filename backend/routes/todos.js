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

