const db = require('../db');

// 방해 금지 시간 체크
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

/**
 * 알림 생성 함수
 * @param {{
 *   userId: number,
 *   classroomId?: number|null,
 *   schoolId?: number|null,
 *   type: 'post'|'schedule'|'chat'|'inquiry',
 *   relatedId?: number|null,
 *   message: string
 * }} options 
 */
async function createNotification({ userId, classroomId = null, schoolId = null, type, relatedId = null, message }) {
  try {
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

    await db.query(
      `INSERT INTO notifications (user_id, classroom_id, school_id, type, related_id, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, classroomId, schoolId, type, relatedId, message]
    );
  } catch (err) {
    console.error('❌ 알림 생성 오류:', err);
  }
}

module.exports = { createNotification };
