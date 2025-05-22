const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// 알림 설정 조회
router.get('/', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  try {
    const [rows] = await db.query(
      `SELECT post_alert, schedule_alert, chat_alert 
       FROM notification_settings 
       WHERE user_id = ?`,
      [user_id]
    );

    if (rows.length === 0) {
      // 기본값 삽입
      await db.query(
        `INSERT INTO notification_settings 
         (user_id, post_alert, schedule_alert, chat_alert)
         VALUES (?, TRUE, TRUE, TRUE)`,
        [user_id]
      );
      return res.json({ settings: { post_alert: true, schedule_alert: true, chat_alert: true } });
    }

    res.json({ settings: rows[0] });
  } catch (err) {
    console.error('🔥 알림 설정 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 알림 설정 저장
router.patch('/', authenticateToken, async (req, res) => {
  const { user_id } = req.user;
  const { post_alert, schedule_alert, chat_alert } = req.body;

  try {
    await db.query(
      `INSERT INTO notification_settings (user_id, post_alert, schedule_alert, chat_alert)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         post_alert = VALUES(post_alert),
         schedule_alert = VALUES(schedule_alert),
         chat_alert = VALUES(chat_alert)`,
      [user_id, post_alert, schedule_alert, chat_alert]
    );

    res.json({ message: '저장 완료' });
  } catch (err) {
    console.error('🔥 알림 설정 저장 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
