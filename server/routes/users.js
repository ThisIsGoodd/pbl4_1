const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const multer = require('multer');
const path = require('path');

// ✅ 파일 업로드 설정 (프로필 사진용)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// ✅ 프로필 조회 (복수 학급 대응)
router.get('/profile', authenticateToken, async (req, res) => {
  const user_id = req.user.user_id;

  try {
    // 1. 기본 사용자 정보
    const [userRows] = await db.query(`
      SELECT 
        user_id, name, email, role, is_admin, school_id, profile_picture, child_name
      FROM users
      WHERE user_id = ?
    `, [user_id]);

    if (userRows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const user = userRows[0];

    // 2. 가입된 학급 리스트 조회
    const [classRows] = await db.query(`
      SELECT 
        c.classroom_id, c.school, c.grade, c.class_number
      FROM user_classrooms uc
      JOIN classrooms c ON uc.classroom_id = c.classroom_id
      WHERE uc.user_id = ?
    `, [user_id]);

    // 3. 사용자 객체에 joinedClassrooms 배열 추가
    user.joined_classrooms = classRows;

    res.json({ message: '프로필 데이터 반환', user });
  } catch (err) {
    console.error('🔥 프로필 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 프로필 수정 (이름 + 자녀 이름 + 사진 + DND 시간)
router.patch('/profile', authenticateToken, upload.single('profile_picture'), async (req, res) => {
  const { name, child_name, chat_dnd_start, chat_dnd_end } = req.body;
  const user_id = req.user.user_id;
  const profile_picture = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    let query = `
      UPDATE users
      SET name = ?, child_name = ?, chat_dnd_start = ?, chat_dnd_end = ?
    `;
    const params = [name, child_name, chat_dnd_start || null, chat_dnd_end || null];

    if (profile_picture) {
      query += `, profile_picture = ?`;
      params.push(profile_picture);
    }

    query += ` WHERE user_id = ?`;
    params.push(user_id);

    await db.query(query, params);

    res.json({ message: '프로필 수정 완료' });
  } catch (err) {
    console.error('🔥 프로필 수정 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

//사용자 학급 연결 API
router.patch('/join-classroom', authenticateToken, async (req, res) => {
  const { classroom_id } = req.body;

  if (!classroom_id) {
    return res.status(400).json({ message: 'classroom_id가 필요합니다.' });
  }

  try {
    await db.query(
      'INSERT IGNORE INTO user_classrooms (user_id, classroom_id) VALUES (?, ?)',
      [req.user.user_id, classroom_id]
    );

    res.json({ message: '학급 연결 완료' });
  } catch (err) {
    console.error('🔥 학급 연결 오류:', err);
    res.status(500).json({ message: '서버 오류', details: err.message });
  }
});

// ✅ [신규] 역할 선택 (role 설정)
router.patch('/update-role', authenticateToken, async (req, res) => {
  const { role } = req.body;
  const allowedRoles = ['parent', 'teacher'];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: '허용되지 않은 역할입니다.' });
  }

  try {
    await db.query(
      'UPDATE users SET role = ? WHERE user_id = ?',
      [role, req.user.user_id]
    );
    res.json({ message: '역할 업데이트 완료' });
  } catch (err) {
    console.error('🔥 역할 업데이트 오류:', err);
    res.status(500).json({ message: '서버 오류', details: err.message });
  }
});

module.exports = router;
