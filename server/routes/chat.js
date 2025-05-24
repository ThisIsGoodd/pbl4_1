const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// ✅ 내가 속한 채팅방 목록 (읽지 않은 메시지 수 포함)
router.get('/rooms', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  try {
    const [rooms] = await db.query(
      `SELECT cr.room_id, cr.room_type, cr.classroom_id, cr.created_at,
              COALESCE(cu.unread_count, 0) as unread_count
       FROM chat_rooms cr
       JOIN chat_participants cp ON cr.room_id = cp.room_id
       LEFT JOIN chat_unread cu ON cr.room_id = cu.room_id AND cu.user_id = ?
       WHERE cp.user_id = ?`,
      [user_id, user_id]
    );
    res.json({ rooms });
  } catch (err) {
    console.error('❌ 채팅방 목록 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ✅ 채팅 메시지 조회 (sent_at 컬럼 사용 + 에러 방지)
router.get('/rooms/:room_id/messages', authenticateToken, async (req, res) => {
  const { room_id } = req.params;
  const { user_id } = req.user;

  try {
    console.log('🔍 [messages] 메시지 조회 요청:', { room_id, user_id });

    // 메시지 조회 (sent_at이 없으면 created_at 사용)
    const [messages] = await db.query(
      `SELECT 
        cm.message_id, 
        cm.sender_id, 
        u.name AS sender_name, 
        cm.content, 
        COALESCE(cm.sent_at, cm.created_at) AS sent_at
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.user_id
       WHERE cm.room_id = ?
       ORDER BY COALESCE(cm.sent_at, cm.created_at) ASC`,
      [room_id]
    );

    console.log('📦 [messages] 조회된 메시지 수:', messages.length);

    // 읽지 않은 메시지 수 초기화 (선택적)
    try {
      await db.query(
        `INSERT INTO chat_unread (room_id, user_id, unread_count)
         VALUES (?, ?, 0)
         ON DUPLICATE KEY UPDATE unread_count = 0`,
        [room_id, user_id]
      );
    } catch (unreadErr) {
      console.warn('⚠️ 읽음 처리 오류 (무시):', unreadErr.message);
    }

    res.json({ messages });
  } catch (err) {
    console.error('❌ 메시지 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ✅ 메시지 전송 (API를 통한 전송도 지원)
router.post('/messages', authenticateToken, async (req, res) => {
  const { room_id, content } = req.body;
  const { user_id } = req.user;

  if (!room_id || !content) {
    return res.status(400).json({ error: 'room_id, content 필요' });
  }

  try {
    // 메시지 저장
    const [result] = await db.query(
      `INSERT INTO chat_messages (room_id, sender_id, content, sent_at)
       VALUES (?, ?, ?, NOW())`,
      [room_id, user_id, content]
    );

    console.log('✅ API 메시지 저장:', result.insertId);

    // 다른 참여자들의 읽지 않은 메시지 수 증가 (선택적)
    try {
      const [participants] = await db.query(
        `SELECT user_id FROM chat_participants WHERE room_id = ? AND user_id != ?`,
        [room_id, user_id]
      );

      for (const participant of participants) {
        await db.query(
          `INSERT INTO chat_unread (room_id, user_id, unread_count)
           VALUES (?, ?, 1)
           ON DUPLICATE KEY UPDATE unread_count = unread_count + 1`,
          [room_id, participant.user_id]
        );
      }
    } catch (unreadErr) {
      console.warn('⚠️ 읽지 않은 메시지 처리 오류 (무시):', unreadErr.message);
    }

    res.json({ message: '메시지 전송 완료', message_id: result.insertId });
  } catch (err) {
    console.error('❌ 메시지 전송 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ✅ 읽지 않은 메시지 총 개수 조회
router.get('/unread-count', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  try {
    const [result] = await db.query(
      `SELECT SUM(unread_count) as total_unread FROM chat_unread WHERE user_id = ?`,
      [user_id]
    );

    const totalUnread = result[0]?.total_unread || 0;
    res.json({ total_unread: totalUnread });
  } catch (err) {
    console.error('❌ 읽지 않은 메시지 수 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;