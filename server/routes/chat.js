const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// ✅ 내가 속한 채팅방 목록
router.get('/rooms', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  try {
    const [rooms] = await db.query(
      `SELECT cr.room_id, cr.room_type, cr.classroom_id, cr.created_at
       FROM chat_rooms cr
       JOIN chat_participants cp ON cr.room_id = cp.room_id
       WHERE cp.user_id = ?`,
      [user_id]
    );
    res.json({ rooms });
  } catch (err) {
    console.error('❌ 채팅방 목록 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ✅ 메시지 전송
router.post('/messages', authenticateToken, async (req, res) => {
  const { room_id, content } = req.body;
  const { user_id } = req.user;

  if (!room_id || !content) {
    return res.status(400).json({ error: 'room_id, content 필요' });
  }

  try {
    await db.query(
      `INSERT INTO chat_messages (room_id, sender_id, content)
       VALUES (?, ?, ?)`,
      [room_id, user_id, content]
    );
    res.json({ message: '메시지 전송 완료' });
  } catch (err) {
    console.error('❌ 메시지 전송 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ✅ 채팅 메시지 조회
router.get('/rooms/:room_id/messages', authenticateToken, async (req, res) => {
  const { room_id } = req.params;

  try {
    const [messages] = await db.query(
      `SELECT cm.message_id, cm.sender_id, u.name AS sender_name, cm.content, cm.sent_at
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.user_id
       WHERE cm.room_id = ?
       ORDER BY cm.sent_at ASC`,
      [room_id]
    );
    res.json({ messages });
  } catch (err) {
    console.error('❌ 메시지 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
