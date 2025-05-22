const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const authenticateToken = require('../authMiddleware');
const checkAdmin = require('../checkAdmin');

// ✅ 학급 생성 (교사 전용)
router.post('/', authenticateToken, checkAdmin, async (req, res) => {
  const { grade, class_number } = req.body;
  const teacher_id = req.user.user_id;

  try {
    const [userRows] = await db.query('SELECT school_id FROM users WHERE user_id = ?', [teacher_id]);
    if (userRows.length === 0 || !userRows[0].school_id) {
      return res.status(400).json({ error: '학교 정보가 없습니다.' });
    }

    const school_id = userRows[0].school_id;

    if (!grade || !class_number) {
      return res.status(400).json({ error: '학년과 반 번호를 입력해주세요.' });
    }

    const [existingClassroom] = await db.query(
      'SELECT * FROM classrooms WHERE grade = ? AND class_number = ? AND school = ?',
      [grade, class_number, school_id]
    );

    if (existingClassroom.length > 0) {
      return res.json({
        message: '이미 존재하는 학급입니다.',
        invite_code: existingClassroom[0].invite_code
      });
    }

    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const [result] = await db.query(
      'INSERT INTO classrooms (grade, class_number, invite_code, school, teacher_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [grade, class_number, invite_code, school_id, teacher_id]
    );

    const newClassroomId = result.insertId;

    await db.query(
      'UPDATE users SET classroom_id = ? WHERE user_id = ?',
      [newClassroomId, teacher_id]
    );

    // ✅ 단체 채팅방 생성 + 교사 참가
    const [chatResult] = await db.query(
      'INSERT INTO chat_rooms (room_type, classroom_id) VALUES (?, ?)',
      ['group', newClassroomId]
    );
    const room_id = chatResult.insertId;

    await db.query(
      'INSERT INTO chat_participants (room_id, user_id) VALUES (?, ?)',
      [room_id, teacher_id]
    );

    res.json({ message: '학급 생성 완료', invite_code });
  } catch (err) {
    console.error('🔥 학급 생성 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 내가 생성한 학급 조회
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

// ✅ 학급 삭제 (교사 전용)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const teacher_id = req.user.user_id;

  try {
    const [classroom] = await db.query(
      'SELECT * FROM classrooms WHERE classroom_id = ? AND teacher_id = ?',
      [id, teacher_id]
    );

    if (classroom.length === 0) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    await db.query('DELETE FROM posts WHERE classroom_id = ?', [id]);
    await db.query('UPDATE users SET classroom_id = NULL WHERE classroom_id = ?', [id]);
    await db.query('DELETE FROM classrooms WHERE classroom_id = ?', [id]);

    res.json({ message: '학급 삭제 완료' });
  } catch (err) {
    console.error('🔥 학급 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 학부모 초대코드로 학급 가입
router.post('/join-classroom', authenticateToken, async (req, res) => {
  const { invite_code } = req.body;
  const user_id = req.user.user_id;

  if (!invite_code) {
    return res.status(400).json({ error: '초대코드를 입력해야 합니다.' });
  }

  try {
    const [classroomRows] = await db.query(
      'SELECT classroom_id, teacher_id FROM classrooms WHERE invite_code = ?',
      [invite_code]
    );

    if (classroomRows.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 초대코드입니다.' });
    }

    const classroom_id = classroomRows[0].classroom_id;
    const teacher_id = classroomRows[0].teacher_id;

    const [userRows] = await db.query(
      'SELECT classroom_id FROM users WHERE user_id = ?',
      [user_id]
    );

    if (userRows.length > 0 && userRows[0].classroom_id) {
      return res.status(400).json({ error: '이미 학급에 가입되어 있습니다.' });
    }

    await db.query(
      'UPDATE users SET classroom_id = ? WHERE user_id = ?',
      [classroom_id, user_id]
    );

    // ✅ 1:1 상담 채팅방 생성
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

// ✅ 내가 생성한 학급 1개 반환 (선생님 1인 1학급 정책)
router.get('/my-classroom', authenticateToken, async (req, res) => {
  const teacher_id = req.user.user_id;

  try {
    const [rows] = await db.query(
      'SELECT * FROM classrooms WHERE teacher_id = ? LIMIT 1',
      [teacher_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '생성한 학급이 없습니다.' });
    }

    res.json({ classroom: rows[0] });
  } catch (err) {
    console.error('🔥 my-classroom 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 학급에 가입한 학부모 목록 조회 (선생님 본인만 가능)
router.get('/:id/members', authenticateToken, async (req, res) => {
  const classroom_id = req.params.id;
  const requester_id = req.user.user_id;

  try {
    // 1. 요청자가 이 학급의 교사인지 확인
    const [classroomRows] = await db.query(
      'SELECT * FROM classrooms WHERE classroom_id = ? AND teacher_id = ?',
      [classroom_id, requester_id]
    );

    if (classroomRows.length === 0) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    // 2. 학급에 속한 학부모 조회
    const [members] = await db.query(
      'SELECT user_id, name, email, child_name FROM users WHERE classroom_id = ? AND role = "parent"',
      [classroom_id]
    );

    res.json({ members });
  } catch (err) {
    console.error('🔥 학급 멤버 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 초대코드 재발급
router.patch('/:id/invite-code', authenticateToken, async (req, res) => {
  const classroom_id = req.params.id;
  const teacher_id = req.user.user_id;

  try {
    // 1. 교사 본인이 생성한 학급인지 확인
    const [rows] = await db.query(
      'SELECT * FROM classrooms WHERE classroom_id = ? AND teacher_id = ?',
      [classroom_id, teacher_id]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    // 2. 새 코드 생성
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 3. DB 업데이트
    await db.query(
      'UPDATE classrooms SET invite_code = ? WHERE classroom_id = ?',
      [newCode, classroom_id]
    );

    res.json({ message: '초대코드가 재발급되었습니다.', invite_code: newCode });
  } catch (err) {
    console.error('🔥 초대코드 재발급 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// GET /api/classrooms/:id - 학급 정보 조회
router.get('/:id', authenticateToken, async (req, res) => {
  const classroomId = req.params.id;

  try {
    const [rows] = await db.query(
      'SELECT grade, class_number, school FROM classrooms WHERE classroom_id = ?',
      [classroomId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '학급을 찾을 수 없습니다.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('🔥 학급 정보 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

module.exports = router;
