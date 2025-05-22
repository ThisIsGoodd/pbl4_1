// 📄 routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const authenticateToken = require('../authMiddleware');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ✅ OAuth 로그인 (Google)
router.post('/oauth-login', async (req, res) => {
  const { id_token } = req.body;

  if (!id_token) {
    return res.status(400).json({ error: 'id_token이 없습니다.' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const oauth_id = payload.sub;
    const name = payload.name;
    const email = payload.email;
    const profile_picture = payload.picture;
    const oauth_provider = 'google';

    const [userRows] = await db.query(
      'SELECT * FROM users WHERE oauth_id = ? AND oauth_provider = ?',
      [oauth_id, oauth_provider]
    );

    let user;

    if (userRows.length === 0) {
      const [result] = await db.query(
        'INSERT INTO users (oauth_id, oauth_provider, name, email, role, profile_picture, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [oauth_id, oauth_provider, name, email, null, profile_picture]
      );
      user = {
        user_id: result.insertId,
        oauth_id,
        name,
        email,
        role: null,
        profile_picture
      };
    } else {
      user = userRows[0];
    }

    const token = jwt.sign(
      { user_id: user.user_id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ message: '로그인 성공', token, user });
  } catch (err) {
    console.error('🔥 OAuth 로그인 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 교사 인증 코드 검증 라우터
router.post('/verify-admin', authenticateToken, async (req, res) => {
  const user_id = req.user.user_id;
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ verified: false, message: '인증 코드를 입력해주세요.' });
  }

  try {
    // 1. 사용자 정보 확인
    const [userRows] = await db.query('SELECT * FROM users WHERE user_id = ?', [user_id]);
    if (userRows.length === 0 || userRows[0].role !== 'teacher') {
      return res.status(403).json({ verified: false, message: '교사만 인증할 수 있습니다.' });
    }

    const user = userRows[0];

    // 2. 해당 사용자의 소속 학급 → 학교 ID 가져오기
    const [classroomRows] = await db.query(
      'SELECT school_id FROM classrooms WHERE classroom_id = ?',
      [user.classroom_id]
    );

    if (classroomRows.length === 0) {
      return res.status(400).json({ verified: false, message: '소속 학급이 없습니다.' });
    }

    const school_id = classroomRows[0].school_id;

    // 3. school_admin_codes 테이블에서 인증 코드 일치 여부 확인
    const [codeRows] = await db.query(
      'SELECT * FROM school_admin_codes WHERE school_id = ? AND code = ?',
      [school_id, code]
    );

    if (codeRows.length === 0) {
      return res.status(401).json({ verified: false, message: '인증 코드가 일치하지 않습니다.' });
    }

    // 4. 교사가 만든 학급 있는지 확인
    const [createdClasses] = await db.query(
      'SELECT * FROM classrooms WHERE created_by = ?',
      [user_id]
    );

    const hasClassroom = createdClasses.length > 0;

    return res.json({ verified: true, hasClassroom });
  } catch (err) {
    console.error('❌ verify-admin 오류:', err);
    return res.status(500).json({ verified: false, message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
