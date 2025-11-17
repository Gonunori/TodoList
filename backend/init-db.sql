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

