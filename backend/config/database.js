const mariadb = require('mariadb');
require('dotenv').config();

// 데이터베이스 연결 풀 생성
const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'todo',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 5
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

