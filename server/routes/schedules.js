const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const { createNotification } = require('../utils/notify');

// ✅ 일정 추가
router.post('/', authenticateToken, async (req, res) => {
  const { title, description, start_date, end_date, school_wide = false } = req.body;
  const { user_id } = req.user;

  if (!title || !start_date || !end_date) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    const [userRows] = await db.query(
      'SELECT classroom_id, role FROM users WHERE user_id = ?',
      [user_id]
    );

    if (userRows.length === 0 || !userRows[0].classroom_id) {
      return res.status(400).json({ error: '학급에 가입되어 있지 않습니다.' });
    }

    if (userRows[0].role !== 'teacher') {
      return res.status(403).json({ error: '일정 추가는 선생님만 가능합니다.' });
    }

    const classroom_id = userRows[0].classroom_id;

    const [result] = await db.query(
      `INSERT INTO schedules 
        (title, description, start_date, end_date, created_at, created_by, classroom_id, grade, school_wide) 
       VALUES (?, ?, ?, ?, NOW(), ?, ?, NULL, ?)`,
      [title, description, start_date, end_date, user_id, classroom_id, school_wide]
    );

    const scheduleId = result.insertId;

    res.json({ message: '일정 추가 완료', schedule_id: scheduleId });

    const [parents] = await db.query(
      `SELECT user_id FROM users 
       WHERE classroom_id = ? AND role = 'student'`,
      [classroom_id]
    );

    for (const p of parents) {
      await createNotification({
        userId: p.user_id,
        type: 'schedule',
        relatedId: scheduleId,
        message: `일정이 등록되었습니다: ${title}`
      });
    }
  } catch (err) {
    console.error('🔥 일정 추가 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 일정 조회 (경로 수정)
router.get('/', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  try {
    const [userRows] = await db.query(
      'SELECT classroom_id FROM users WHERE user_id = ?',
      [user_id]
    );

    if (userRows.length === 0 || !userRows[0].classroom_id) {
      return res.status(400).json({ error: '학급에 가입되어 있지 않습니다.' });
    }

    const classroom_id = userRows[0].classroom_id;

    const [scheduleRows] = await db.query(
      `SELECT schedule_id, title, description, 
              start_date AS start, end_date AS end, school_wide, created_by 
       FROM schedules 
       WHERE classroom_id = ? OR school_wide = TRUE 
       ORDER BY start_date ASC`,
      [classroom_id]
    );

    res.json({ schedules: scheduleRows });
  } catch (err) {
    console.error('🔥 일정 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 일정 수정
router.put('/schedules/:id', authenticateToken, async (req, res) => {
  const schedule_id = req.params.id;
  const { title, description, start_date, end_date } = req.body;
  const user_id = req.user.user_id;

  if (!title || !start_date || !end_date) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM schedules WHERE schedule_id = ?',
      [schedule_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }

    const schedule = rows[0];

    const [userRows] = await db.query(
      'SELECT classroom_id, role FROM users WHERE user_id = ?',
      [user_id]
    );

    if (
      schedule.created_by !== user_id &&
      userRows[0]?.classroom_id !== schedule.classroom_id
    ) {
      return res.status(403).json({ error: '일정 수정 권한이 없습니다.' });
    }

    await db.query(
      'UPDATE schedules SET title = ?, description = ?, start_date = ?, end_date = ? WHERE schedule_id = ?',
      [title, description, start_date, end_date, schedule_id]
    );

    res.json({ message: '일정 수정 완료' });
  } catch (err) {
    console.error('🔥 일정 수정 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 일정 삭제
router.delete('/schedules/:id', authenticateToken, async (req, res) => {
  const schedule_id = req.params.id;
  const user_id = req.user.user_id;

  try {
    const [rows] = await db.query(
      'SELECT * FROM schedules WHERE schedule_id = ?',
      [schedule_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }

    const schedule = rows[0];

    const [userRows] = await db.query(
      'SELECT classroom_id, role FROM users WHERE user_id = ?',
      [user_id]
    );

    if (
      schedule.created_by !== user_id &&
      userRows[0]?.classroom_id !== schedule.classroom_id
    ) {
      return res.status(403).json({ error: '일정 삭제 권한이 없습니다.' });
    }

    await db.query('DELETE FROM schedules WHERE schedule_id = ?', [schedule_id]);

    res.json({ message: '일정 삭제 완료' });
  } catch (err) {
    console.error('🔥 일정 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

module.exports = router;
