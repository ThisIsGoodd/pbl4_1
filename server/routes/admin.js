const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const checkAdmin = require('../checkAdmin');
const crypto = require('crypto');

// ✅ 관리자 인증코드 확인 → 관리자 권한 부여
router.post('/auth/verify-admin', authenticateToken, async (req, res) => {
  const { schoolId, code } = req.body;
  const userId = req.user.user_id;

  try {
    const [rows] = await db.query(
      'SELECT * FROM school_admin_codes WHERE school_id = ? AND code = ?',
      [schoolId, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: '인증코드가 일치하지 않습니다.' });
    }

    await db.query(
      'UPDATE users SET is_admin = true WHERE user_id = ?',
      [userId]
    );

    res.json({ message: '관리자 승인이 완료되었습니다.' });
  } catch (err) {
    console.error('🔥 관리자 인증 오류:', err);
    res.status(500).json({ message: '서버 오류', details: err.message });
  }
});

// ✅ 관리자용: 교사 목록 조회
router.get('/teachers', authenticateToken, checkAdmin, async (req, res) => {
  const school_id = req.user.school_id;

  try {
    const [rows] = await db.query(`
      SELECT 
        u.user_id, u.name, u.email, u.created_at,
        COUNT(c.classroom_id) AS classroom_count
      FROM users u
      LEFT JOIN classrooms c ON u.user_id = c.teacher_id
      WHERE u.school_id = ? AND u.role = 'teacher'
      GROUP BY u.user_id
    `, [school_id]);

    res.json({ teachers: rows });
  } catch (err) {
    console.error('🔥 교사 목록 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 관리자용: 교사 삭제
router.delete('/teachers/:id', authenticateToken, checkAdmin, async (req, res) => {
  const teacherId = req.params.id;
  const adminSchoolId = req.user.school_id;

  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE user_id = ? AND role = "teacher" AND school_id = ?',
      [teacherId, adminSchoolId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '해당 교사를 찾을 수 없거나 다른 학교 소속입니다.' });
    }

    await db.query(
      `UPDATE users SET role = NULL, school_id = NULL, classroom_id = NULL WHERE user_id = ?`,
      [teacherId]
    );

    res.json({ message: '교사 삭제(권한 박탈) 완료' });
  } catch (err) {
    console.error('🔥 교사 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 관리자용: 인증코드 확인
router.get('/invite-code', authenticateToken, checkAdmin, async (req, res) => {
  const school_id = req.user.school_id;

  try {
    const [rows] = await db.query(
      'SELECT code FROM school_admin_codes WHERE school_id = ?',
      [school_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '해당 학교의 인증코드가 존재하지 않습니다.' });
    }

    res.json({ invite_code: rows[0].code });
  } catch (err) {
    console.error('🔥 인증코드 확인 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 관리자용: 인증코드 재설정
router.patch('/invite-code', authenticateToken, checkAdmin, async (req, res) => {
  const school_id = req.user.school_id;
  const newCode = crypto.randomBytes(4).toString('hex');

  try {
    await db.query(
      `INSERT INTO school_admin_codes (school_id, code)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE code = VALUES(code)`,
      [school_id, newCode]
    );

    res.json({ message: '인증코드가 새로 설정되었습니다.', new_code: newCode });
  } catch (err) {
    console.error('🔥 인증코드 변경 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 관리자용: 학급 목록 조회
router.get('/classrooms', authenticateToken, checkAdmin, async (req, res) => {
  const school_id = req.user.school_id;

  try {
    const [rows] = await db.query(`
      SELECT 
        c.classroom_id, c.grade, c.class_number, c.school,
        u.name AS teacher_name,
        (
          SELECT COUNT(*) FROM users u2 WHERE u2.classroom_id = c.classroom_id AND u2.role = 'student'
        ) AS parent_count
      FROM classrooms c
      LEFT JOIN users u ON c.teacher_id = u.user_id
      WHERE u.school_id = ?
      ORDER BY c.grade, c.class_number
    `, [school_id]);

    res.json({ classrooms: rows });
  } catch (err) {
    console.error('🔥 학급 목록 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 학교 생성 요청 목록 조회
router.get('/school-requests', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.request_id, r.school_name, r.region, r.requested_at,
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

// ✅ 학교 생성 요청 승인 처리
router.post('/school-requests/:requestId/approve', authenticateToken, checkAdmin, async (req, res) => {
  const requestId = req.params.requestId;

  try {
    const [rows] = await db.query(
      'SELECT * FROM school_requests WHERE request_id = ?',
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '해당 요청이 존재하지 않습니다.' });
    }

    const { user_id, school_name, region } = rows[0];

    // 학교 등록
    const [insertResult] = await db.query(
      'INSERT INTO schools (name, region) VALUES (?, ?)',
      [school_name, region]
    );
    const school_id = insertResult.insertId;

    // 요청자에게 관리자 권한 부여
    await db.query(
      'UPDATE users SET school_id = ?, is_admin = TRUE WHERE user_id = ?',
      [school_id, user_id]
    );

    // 인증코드 생성
    const code = crypto.randomBytes(4).toString('hex');
    await db.query(
      'INSERT INTO school_admin_codes (school_id, code) VALUES (?, ?)',
      [school_id, code]
    );

    // 요청 삭제
    await db.query('DELETE FROM school_requests WHERE request_id = ?', [requestId]);

    res.json({ message: '학교가 생성되고 관리자 권한이 부여되었습니다.', school_id });
  } catch (err) {
    console.error('🔥 요청 승인 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

module.exports = router;
