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
        profile_picture,
        is_admin: 0,
        school_id: null,
      };
    } else {
      user = userRows[0];
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        name: user.name,
        role: user.role,
        is_admin: user.is_admin,
        school_id: user.school_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ message: '로그인 성공', token, user });
  } catch (err) {
    console.error('🔥 OAuth 로그인 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 교사 인증 코드 검증 및 관리자 권한 부여
router.post('/verify-admin', authenticateToken, async (req, res) => {
  const user_id = req.user.user_id;
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ verified: false, message: '인증 코드를 입력해주세요.' });
  }

  try {
    // 1. 사용자 유효성 확인
    const [userRows] = await db.query('SELECT * FROM users WHERE user_id = ?', [user_id]);
    if (userRows.length === 0 || userRows[0].role !== 'teacher') {
      return res.status(403).json({ verified: false, message: '교사만 인증할 수 있습니다.' });
    }

    // 2. 인증코드 확인
    const [codeRows] = await db.query(
      'SELECT school_id FROM school_admin_codes WHERE code = ?',
      [code]
    );

    if (codeRows.length === 0) {
      return res.status(401).json({ verified: false, message: '유효하지 않은 인증 코드입니다.' });
    }

    const school_id = codeRows[0].school_id;

    // 3. 권한 부여 및 학교 연결
    await db.query(
      'UPDATE users SET is_admin = true, school_id = ? WHERE user_id = ?',
      [school_id, user_id]
    );

    // 4. user_schools에도 추가 (중복 방지)
    await db.query(
      'INSERT IGNORE INTO user_schools (user_id, school_id, role) VALUES (?, ?, ?)',
      [user_id, school_id, 'teacher']
    );

    // 5. 새 user 정보 재조회
    const [updatedUserRows] = await db.query('SELECT * FROM users WHERE user_id = ?', [user_id]);
    const user = updatedUserRows[0];

    // 6. 새 토큰 발급
    const token = jwt.sign(
      {
        user_id: user.user_id,
        name: user.name,
        role: user.role,
        is_admin: user.is_admin,
        school_id: user.school_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 7. 학급 존재 여부 확인
    const [classroomRows] = await db.query(
      'SELECT classroom_id FROM classrooms WHERE teacher_id = ?',
      [user_id]
    );

    const hasClassroom = classroomRows.length > 0;
    const classroomId = hasClassroom ? classroomRows[0].classroom_id : null;

    return res.json({
      verified: true,
      token,
      hasClassroom,
      classroomId
    });
  } catch (err) {
    console.error('❌ verify-admin 오류:', err);
    return res.status(500).json({ verified: false, message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
