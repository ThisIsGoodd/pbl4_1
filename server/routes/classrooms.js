const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const authenticateToken = require('../authMiddleware');
const checkAdmin = require('../checkAdmin');

// ✅ 학급 생성
router.post('/', authenticateToken, checkAdmin, async (req, res) => {
  const { grade, class_number } = req.body;
  const teacher_id = req.user.user_id;
  const school_id = req.user.school_id;

  if (!school_id || !grade || !class_number) {
    return res.status(400).json({ error: '학년, 반, 학교 정보가 필요합니다.' });
  }

  try {
    const [existingClassroom] = await db.query(
      'SELECT * FROM classrooms WHERE grade = ? AND class_number = ? AND school = ?',
      [grade, class_number, school_id]
    );
    if (existingClassroom.length > 0) {
      return res.json({ message: '이미 존재하는 학급입니다.', invite_code: existingClassroom[0].invite_code });
    }

    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [result] = await db.query(
      'INSERT INTO classrooms (grade, class_number, invite_code, school, teacher_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [grade, class_number, invite_code, school_id, teacher_id]
    );
    const classroom_id = result.insertId;

    await db.query(
      'INSERT INTO user_classrooms (user_id, classroom_id) VALUES (?, ?)',
      [teacher_id, classroom_id]
    );

    try {
      const [chatResult] = await db.query(
        'INSERT INTO chat_rooms (room_type, classroom_id) VALUES (?, ?)',
        ['group', classroom_id]
      );
      const room_id = chatResult.insertId;

      await db.query(
        'INSERT INTO chat_participants (room_id, user_id) VALUES (?, ?)',
        [room_id, teacher_id]
      );
    } catch (chatErr) {
      console.error('⚠️ 채팅방 생성 실패:', chatErr);
      return res.status(200).json({
        message: '학급은 생성되었으나 채팅방 설정 중 오류가 발생했습니다.',
        invite_code,
        partial_error: true
      });
    }

    res.json({ message: '학급 생성 완료', invite_code });
  } catch (err) {
    console.error('🔥 학급 생성 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 내가 생성한 학급 목록 조회
router.get('/my-classrooms', authenticateToken, async (req, res) => {
  const teacher_id = req.user.user_id;
  try {
    const [classrooms] = await db.query(
      'SELECT * FROM classrooms WHERE teacher_id = ?',
      [teacher_id]
    );
    res.json({ classrooms });
  } catch (err) {
    console.error('🔥 학급 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 학급 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const teacher_id = req.user.user_id;
  try {
    const [classroom] = await db.query(
      'SELECT * FROM classrooms WHERE classroom_id = ? AND teacher_id = ?',
      [id, teacher_id]
    );
    if (classroom.length === 0) return res.status(403).json({ error: '권한이 없습니다.' });

    await db.query('DELETE FROM posts WHERE classroom_id = ?', [id]);
    await db.query('DELETE FROM user_classrooms WHERE classroom_id = ?', [id]);
    await db.query('DELETE FROM classrooms WHERE classroom_id = ?', [id]);

    res.json({ message: '학급 삭제 완료' });
  } catch (err) {
    console.error('🔥 학급 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 학급 가입
router.post('/join-classroom', authenticateToken, async (req, res) => {
  const { invite_code } = req.body;
  const user_id = req.user.user_id;

  if (!invite_code) return res.status(400).json({ error: '초대코드를 입력해주세요.' });

  try {
    const [classroomRows] = await db.query(
      'SELECT classroom_id, teacher_id FROM classrooms WHERE invite_code = ?',
      [invite_code]
    );
    if (classroomRows.length === 0) return res.status(404).json({ error: '유효하지 않은 초대코드입니다.' });

    const classroom_id = classroomRows[0].classroom_id;
    const teacher_id = classroomRows[0].teacher_id;

    const [exists] = await db.query(
      'SELECT * FROM user_classrooms WHERE user_id = ?',
      [user_id]
    );
    if (exists.length > 0) return res.status(400).json({ error: '이미 학급에 가입되어 있습니다.' });

    await db.query(
      'INSERT INTO user_classrooms (user_id, classroom_id) VALUES (?, ?)',
      [user_id, classroom_id]
    );

    const [roomResult] = await db.query(
      'INSERT INTO chat_rooms (room_type) VALUES (?)',
      ['private']
    );
    const room_id = roomResult.insertId;

    await db.query(
      'INSERT INTO chat_participants (room_id, user_id) VALUES (?, ?), (?, ?)',
      [room_id, teacher_id, room_id, user_id]
    );

    res.json({ message: '학급 가입 성공', classroom_id });
  } catch (err) {
    console.error('🔥 학급 가입 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 내가 생성한 학급 1개 반환
router.get('/my-classroom', authenticateToken, async (req, res) => {
  const teacher_id = req.user.user_id;
  try {
    const [rows] = await db.query(
      'SELECT * FROM classrooms WHERE teacher_id = ? LIMIT 1',
      [teacher_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: '생성한 학급이 없습니다.' });

    res.json({ classroom: rows[0] });
  } catch (err) {
    console.error('🔥 my-classroom 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 학급 멤버 목록
router.get('/:id/members', authenticateToken, async (req, res) => {
  const classroom_id = req.params.id;
  const requester_id = req.user.user_id;

  try {
    const [classroomRows] = await db.query(
      'SELECT * FROM classrooms WHERE classroom_id = ? AND teacher_id = ?',
      [classroom_id, requester_id]
    );
    if (classroomRows.length === 0) return res.status(403).json({ error: '접근 권한이 없습니다.' });

    const [members] = await db.query(
      'SELECT u.user_id, u.name, u.email, u.child_name FROM user_classrooms uc JOIN users u ON uc.user_id = u.user_id WHERE uc.classroom_id = ? AND u.role = "parent"',
      [classroom_id]
    );

    res.json({ members });
  } catch (err) {
    console.error('🔥 멤버 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 초대코드 재발급
router.patch('/:id/invite-code', authenticateToken, async (req, res) => {
  const classroom_id = req.params.id;
  const teacher_id = req.user.user_id;

  try {
    const [rows] = await db.query(
      'SELECT * FROM classrooms WHERE classroom_id = ? AND teacher_id = ?',
      [classroom_id, teacher_id]
    );
    if (rows.length === 0) return res.status(403).json({ error: '접근 권한이 없습니다.' });

    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await db.query(
      'UPDATE classrooms SET invite_code = ? WHERE classroom_id = ?',
      [newCode, classroom_id]
    );

    res.json({ message: '초대코드가 재발급되었습니다.', invite_code: newCode });
  } catch (err) {
    console.error('🔥 초대코드 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 학급 정보 조회 (학교 이름 포함)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT c.classroom_id, c.grade, c.class_number, c.invite_code, c.teacher_id, c.created_at,
             s.name AS school
      FROM classrooms c
      JOIN schools s ON c.school = s.school_id
      WHERE c.classroom_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: '학급을 찾을 수 없습니다.' });
    }

    res.json(rows[0]); // 여기서 school = 학교 이름으로 반환됨
  } catch (err) {
    console.error('🔥 학급 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});


module.exports = router;
