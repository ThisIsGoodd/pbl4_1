const db = require('../db');

// Socket.io 인스턴스를 저장할 변수
let io = null;

// Socket.io 인스턴스 설정
function setSocketIO(socketInstance) {
  io = socketInstance;
}

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
 * 알림 생성 함수 (실시간 전송 포함)
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

    // DB에 알림 저장
    const [result] = await db.query(
      `INSERT INTO notifications (user_id, classroom_id, school_id, type, related_id, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, classroomId, schoolId, type, relatedId, message]
    );

    const notificationId = result.insertId;

    // 생성된 알림 데이터
    const notification = {
      notification_id: notificationId,
      user_id: userId,
      classroom_id: classroomId,
      school_id: schoolId,
      type,
      related_id: relatedId,
      message,
      created_at: new Date(),
      is_read: false
    };

    // Socket.io를 통한 실시간 알림 전송
    if (io) {
      console.log(`📡 실시간 알림 전송: 사용자 ${userId}에게 "${message}"`);
      io.to(`user_${userId}`).emit('newNotification', notification);
    }

    console.log(`✅ 알림 생성 완료: ${message} (ID: ${notificationId})`);
    return notificationId;

  } catch (err) {
    console.error('❌ 알림 생성 오류:', err);
  }
}

module.exports = { 
  createNotification,
  setSocketIO 
};