const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const checkSuperAdmin = require('../checkSuperAdmin');
const crypto = require('crypto');

// ✅ 학교 생성 요청 목록
router.get('/school-requests', authenticateToken, checkSuperAdmin, async (req, res) => {
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

// ✅ 요청 승인
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

    const { user_id, school_name, region } = rows[0];

    // 학교 생성
    const [insertResult] = await db.query(
      'INSERT INTO schools (name, region) VALUES (?, ?)',
      [school_name, region]
    );
    const school_id = insertResult.insertId;

    // 관리자 권한 부여
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

    await db.query('DELETE FROM school_requests WHERE request_id = ?', [requestId]);

    res.json({ message: '학교가 생성되고 관리자 권한이 부여되었습니다.', school_id });
  } catch (err) {
    console.error('🔥 승인 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

module.exports = router;
