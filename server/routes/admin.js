const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const checkAdmin = require('../checkAdmin');
const crypto = require('crypto');

// ✅ 관리자 인증코드 확인 → user_schools 테이블에 admin 등록
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
      'INSERT INTO user_schools (user_id, school_id, role) VALUES (?, ?, ?)',
      [userId, schoolId, 'teacher']
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
      FROM user_schools us
      JOIN users u ON us.user_id = u.user_id
      LEFT JOIN classrooms c ON u.user_id = c.teacher_id
      WHERE us.school_id = ? AND us.role = 'teacher'
      GROUP BY u.user_id
    `, [school_id]);

    res.json({ teachers: rows });
  } catch (err) {
    console.error('🔥 교사 목록 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 교사 삭제
router.delete('/teachers/:id', authenticateToken, checkAdmin, async (req, res) => {
  const teacherId = req.params.id;
  const school_id = req.user.school_id;

  try {
    const [target] = await db.query(
      'SELECT * FROM user_schools WHERE user_id = ? AND school_id = ? AND role = ?',
      [teacherId, school_id, 'teacher']
    );

    if (target.length === 0) {
      return res.status(404).json({ error: '해당 교사를 찾을 수 없습니다.' });
    }

    await db.query(
      'DELETE FROM user_schools WHERE user_id = ? AND school_id = ?',
      [teacherId, school_id]
    );

    await db.query(
      'UPDATE users SET classroom_id = NULL WHERE user_id = ?',
      [teacherId]
    );

    res.json({ message: '교사 삭제(권한 박탈) 완료' });
  } catch (err) {
    console.error('🔥 교사 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 인증코드 조회 (단일)
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

// ✅ 인증코드 재설정
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

// ✅ 전체 관리자용: 인증코드 목록 조회
router.get('/auth-codes', authenticateToken, checkAdmin, async (req, res) => {
  const adminId = req.user.user_id;
  const schoolId = req.query.school_id;

  if (!schoolId) {
    return res.status(400).json({ error: 'school_id 쿼리 파라미터가 필요합니다.' });
  }

  try {
    const [schoolRows] = await db.query(
      'SELECT * FROM schools WHERE school_id = ? AND created_by = ?',
      [schoolId, adminId]
    );

    if (schoolRows.length === 0) {
      return res.status(403).json({ error: '이 학교의 전체 관리자만 인증코드를 조회할 수 있습니다.' });
    }

    const [rows] = await db.query(
      'SELECT code, created_at FROM school_admin_codes WHERE school_id = ? ORDER BY created_at DESC',
      [schoolId]
    );

    res.json({ codes: rows });
  } catch (err) {
    console.error('🔥 인증코드 목록 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

module.exports = router;
