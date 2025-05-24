console.log('✅ superAdmin.js 불러와짐');

const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const checkSuperAdmin = require('../checkSuperAdmin');
const crypto = require('crypto');

// ✅ 공통 로그 기록 함수
async function logSchoolAction({ db, school_id, action, admin_id, message }) {
  await db.query(
    `INSERT INTO school_logs (school_id, action, admin_id, message) VALUES (?, ?, ?, ?)`,
    [school_id, action, admin_id, message]
  );
}

// ✅ 학교 생성 요청 목록 조회
router.get('/school-requests', authenticateToken, checkSuperAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.request_id, r.school_name, r.school_type, r.school_code,
             r.contact_name, r.contact_phone, r.requested_at,
             u.name AS requester_name, u.email
      FROM school_requests r
      JOIN users u ON r.user_id = u.user_id
      ORDER BY r.requested_at DESC
    `);
    res.json({ requests: rows });
  } catch (err) {
    console.error('🔥 요청 목록 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 학교 요청 승인
router.post('/school-requests/:requestId/approve', authenticateToken, checkSuperAdmin, async (req, res) => {
  const requestId = req.params.requestId;

  try {
    const [rows] = await db.query(
      'SELECT * FROM school_requests WHERE request_id = ?',
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '해당 요청이 존재하지 않습니다.' });
    }

    const { user_id, school_name, school_code, school_type, contact_phone } = rows[0];

    // 1. 학교 생성
    const [insertResult] = await db.query(
      'INSERT INTO schools (name, code, type, created_by, phone) VALUES (?, ?, ?, ?, ?)',
      [school_name, school_code, school_type, user_id, contact_phone]
    );
    const school_id = insertResult.insertId;

    // 2. 요청자 -> 관리자 등록
    await db.query(
      'INSERT INTO user_schools (user_id, school_id, role) VALUES (?, ?, ?)',
      [user_id, school_id, 'admin']
    );

    // ✅ 3. 요청자 → users 테이블에도 관리자 표시 반영
    await db.query(
      'UPDATE users SET is_admin = 1, school_id = ? WHERE user_id = ?',
      [school_id, user_id]
    );

    // 4. 인증 코드 생성
    const code = crypto.randomBytes(4).toString('hex');
    await db.query(
      `INSERT INTO school_admin_codes (school_id, code)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE code = VALUES(code)`,
      [school_id, code]
    );

    // 5. 요청 삭제
    await db.query('DELETE FROM school_requests WHERE request_id = ?', [requestId]);

    // 6. 로그 기록
    await logSchoolAction({
      db, school_id, action: 'create', admin_id: req.user.user_id,
      message: `학교 승인됨: ${school_name} (${school_id})`
    });

    res.json({ message: '학교가 생성되고 관리자 권한이 부여되었습니다.', school_id });
  } catch (err) {
    console.error('🔥 승인 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 전체 학교 목록 조회
router.get('/schools', authenticateToken, checkSuperAdmin, async (req, res) => {
  try {
    console.log('✅ [GET /schools] 요청 도착');
    const [rows] = await db.query(`
      SELECT 
        s.school_id,
        s.name AS school_name,
        s.code AS school_code,
        s.phone,
        s.created_at,
        (
          SELECT COUNT(*) FROM user_schools us WHERE us.school_id = s.school_id AND us.role = 'teacher'
        ) AS teacher_count,
        (
          SELECT COUNT(*) FROM user_schools us WHERE us.school_id = s.school_id AND us.role = 'admin'
        ) AS admin_count,
        u.name AS admin_name,
        u.email
      FROM schools s
      LEFT JOIN user_schools us ON s.school_id = us.school_id AND us.role = 'admin'
      LEFT JOIN users u ON us.user_id = u.user_id
      ORDER BY s.created_at DESC;
    `);

    console.log('📦 [GET /schools] 결과:', rows);
    res.json({ schools: rows });
  } catch (err) {
    console.error('🔥 학교 목록 조회 오류 (전체 에러 객체):', err);
    console.error('🔥 학교 목록 조회 오류 (message):', err.message);
    res.status(500).json({ error: '서버 오류', details: err.message || '에러 메시지 없음' });
  }
});

// ✅ 학교 삭제 (스키마 수정 반영)
router.delete('/schools/:schoolId', authenticateToken, checkSuperAdmin, async (req, res) => {
  const schoolId = req.params.schoolId;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. 해당 학교의 학급 목록 조회 (수정된 스키마 반영)
    const [classroomRows] = await conn.query(
      'SELECT classroom_id FROM classrooms WHERE school_id = ?',
      [schoolId]
    );
    const classroomIds = classroomRows.map(row => row.classroom_id);

    if (classroomIds.length > 0) {
      const idList = classroomIds.join(',');

      // 2. 학급 기반 종속 데이터 삭제
      await conn.query(`DELETE FROM user_classrooms WHERE classroom_id IN (${idList})`);
      await conn.query(`DELETE FROM posts WHERE classroom_id IN (${idList})`);
      await conn.query(`DELETE FROM comments WHERE post_id IN 
        (SELECT post_id FROM posts WHERE classroom_id IN (${idList}))`);
      await conn.query(`DELETE FROM schedules WHERE classroom_id IN (${idList})`);
      await conn.query(`DELETE FROM chat_messages WHERE room_id IN 
        (SELECT room_id FROM chat_rooms WHERE classroom_id IN (${idList}))`);
      await conn.query(`DELETE FROM chat_participants WHERE room_id IN 
        (SELECT room_id FROM chat_rooms WHERE classroom_id IN (${idList}))`);
      await conn.query(`DELETE FROM chat_rooms WHERE classroom_id IN (${idList})`);
      await conn.query(`DELETE FROM notifications WHERE classroom_id IN (${idList})`);
    }

    // 3. 학급 삭제
    await conn.query('DELETE FROM classrooms WHERE school_id = ?', [schoolId]);

    // 4. 학교 종속 데이터 삭제
    await conn.query('DELETE FROM user_schools WHERE school_id = ?', [schoolId]);
    await conn.query('DELETE FROM school_admin_codes WHERE school_id = ?', [schoolId]);
    await conn.query('DELETE FROM school_logs WHERE school_id = ?', [schoolId]);

    // 5. 사용자 테이블에서 해당 학교 참조 제거
    await conn.query(
      'UPDATE users SET school_id = NULL, is_admin = 0 WHERE school_id = ?',
      [schoolId]
    );

    // 6. 학교 자체 삭제
    await conn.query('DELETE FROM schools WHERE school_id = ?', [schoolId]);

    await conn.commit();
    res.json({ message: '학교 및 관련된 모든 데이터가 삭제되었습니다.' });
  } catch (err) {
    await conn.rollback();
    console.error('❌ 학교 삭제 실패:', err);
    res.status(500).json({ error: '삭제 중 오류 발생', details: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;