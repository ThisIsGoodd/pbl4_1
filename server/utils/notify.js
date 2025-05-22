const db = require('../db');

// 방해 금지 시간 안에 있는지 확인하는 함수
function isWithinDndTime(now, start, end) {
  if (!start || !end) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(':');
  const [eh, em] = end.split(':');

  const startMinutes = parseInt(sh) * 60 + parseInt(sm);
  const endMinutes = parseInt(eh) * 60 + parseInt(em);

  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  } else {
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  }
}

async function createNotification({ userId, type, relatedId, message }) {
  try {
    // ✅ 사용자 DND 시간 가져오기
    const [rows] = await db.query(
      'SELECT chat_dnd_start, chat_dnd_end FROM users WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) return;

    const { chat_dnd_start, chat_dnd_end } = rows[0];
    const now = new Date();

    if (isWithinDndTime(now, chat_dnd_start, chat_dnd_end)) {
      console.log(`⏳ 알림 생성 보류: 사용자 ${userId}는 방해 금지 시간대`);
      return;
    }

    // ✅ 알림 생성
    await db.query(
      `INSERT INTO notifications (user_id, type, related_id, message)
       VALUES (?, ?, ?, ?)`,
      [userId, type, relatedId, message]
    );
  } catch (err) {
    console.error('❌ 알림 생성 오류:', err);
  }
}

module.exports = { createNotification };
