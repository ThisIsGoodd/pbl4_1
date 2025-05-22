// 📄 routes/schools.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const checkAdmin = require('../checkAdmin');

// 학교 등록 요청 저장 (일반 사용자용)
router.post('/schools/request', authenticateToken, async (req, res) => {
  const { schoolName, region } = req.body;
  const userId = req.user.user_id;

  if (!schoolName) {
    return res.status(400).json({ error: '학교 이름은 필수입니다.' });
  }

  try {
    await db.query(
      'INSERT INTO school_requests (user_id, school_name, region, requested_at) VALUES (?, ?, ?, NOW())',
      [userId, schoolName, region || null]
    );

    res.json({ message: '학교 등록 요청이 접수되었습니다.' });
  } catch (err) {
    console.error('🔥 요청 저장 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// 학교 등록 및 관리자 권한 부여 (개발자 전용)
router.post('/schools/register', authenticateToken, checkAdmin, async (req, res) => {
  const { schoolName, region, userId } = req.body;

  if (!schoolName || !userId) {
    return res.status(400).json({ error: '필수 항목 누락' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO schools (name, region) VALUES (?, ?)',
      [schoolName, region || null]
    );
    const schoolId = result.insertId;

    await db.query(
      'UPDATE users SET school_id = ?, is_admin = true WHERE user_id = ?',
      [schoolId, userId]
    );

    res.json({ message: '학교 등록 완료 및 관리자 권한 부여', school_id: schoolId });
  } catch (err) {
    console.error('🔥 학교 등록 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

//초대코드 유효성 검사 API
router.post('/verify-invite', async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ message: '초대코드가 필요합니다.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM classrooms WHERE invite_code = ?',
      [inviteCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: '유효하지 않은 초대코드입니다.' });
    }

    // 학교/학급 정보 반환
    const classroom = rows[0];
    res.json({
      message: '유효한 초대코드입니다.',
      classroom: {
        classroom_id: classroom.classroom_id,
        school: classroom.school,
        grade: classroom.grade,
        class_number: classroom.class_number
      }
    });
  } catch (err) {
    console.error('🔥 초대코드 확인 오류:', err);
    res.status(500).json({ message: '서버 오류', details: err.message });
  }
});

module.exports = router;
