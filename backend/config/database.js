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

