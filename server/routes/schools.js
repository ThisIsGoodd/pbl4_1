const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// ✅ 학교 등록 요청 저장
router.post('/request', authenticateToken, async (req, res) => {
  const { schoolName, schoolType, schoolCode, name, phone } = req.body;
  const userId = req.user.user_id;

  if (!schoolName || !name || !phone) {
    return res.status(400).json({ error: '학교 이름, 담당자 이름, 연락처는 필수입니다.' });
  }

  try {
    await db.query(
      `INSERT INTO school_requests 
       (user_id, school_name, school_type, school_code, contact_name, contact_phone, requested_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, schoolName, schoolType, schoolCode, name, phone]
    );

    res.status(200).json({ message: '학교 등록 요청이 접수되었습니다.' });
  } catch (err) {
    console.error('🔥 요청 저장 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 초대코드 유효성 검사 - school_id 포함하도록 수정
router.post('/verify-invite', async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ error: '초대코드가 필요합니다.' });
  }

  try {
    // 🔥 수정: classrooms와 schools를 조인하여 school_id도 함께 반환
    const [rows] = await db.query(
      `SELECT c.classroom_id, c.school_id, c.grade, c.class_number, s.name as school_name
       FROM classrooms c
       JOIN schools s ON c.school_id = s.school_id
       WHERE c.invite_code = ?`,
      [inviteCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 초대코드입니다.' });
    }

    const classroom = rows[0];
    res.status(200).json({
      message: '유효한 초대코드입니다.',
      classroom: {
        classroom_id: classroom.classroom_id,
        school_id: classroom.school_id, // 🔥 추가: school_id 반환
        school_name: classroom.school_name, // 🔥 추가: 학교명도 반환
        grade: classroom.grade,
        class_number: classroom.class_number
      }
    });
  } catch (err) {
    console.error('🔥 초대코드 확인 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 내가 관리자 권한을 가진 학교 조회
router.get('/created-by/me', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const [rows] = await db.query(`
      SELECT s.*
      FROM user_schools us
      JOIN schools s ON us.school_id = s.school_id
      WHERE us.user_id = ? AND us.role = 'admin'
      LIMIT 1
    `, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: '등록된 관리자 학교가 없습니다.' });
    }

    res.status(200).json({ school: rows[0] });
  } catch (err) {
    console.error('🔥 관리자 학교 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 내가 요청한 학교 확인
router.get('/school-requests/my', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const [requests] = await db.query(
      'SELECT * FROM school_requests WHERE user_id = ? ORDER BY requested_at DESC LIMIT 1',
      [userId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: '학교 요청이 없습니다.' });
    }

    res.status(200).json({ request: requests[0] });
  } catch (err) {
    console.error('🔥 학교 요청 확인 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ schoolId로 학교 조회 (🆕 추가된 부분)
router.get('/:schoolId', authenticateToken, async (req, res) => {
  const { schoolId } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT * FROM schools WHERE school_id = ?',
      [schoolId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '해당 학교를 찾을 수 없습니다.' });
    }

    res.status(200).json(rows[0]); // ✅ 주의: 직접 객체 반환
  } catch (err) {
    console.error('🔥 학교 정보 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

module.exports = router;
