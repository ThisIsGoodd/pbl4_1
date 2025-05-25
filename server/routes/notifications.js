const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// 🔥 디버깅용 테스트 엔드포인트 (가장 먼저 배치)
router.get('/test', (req, res) => {
  console.log('🧪 알림 라우터 테스트 엔드포인트 호출됨');
  res.json({ 
    message: '알림 라우터가 정상적으로 작동합니다',
    timestamp: new Date(),
    availableEndpoints: [
      'GET /',
      'PATCH /:id/read', 
      'DELETE /:id',
      'PATCH /mark-all-read',
      'DELETE /delete-all',
      'DELETE /delete-read',
      'GET /stats'
    ]
  });
});

// 📌 전체 읽음 처리 (개선된 버전)
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  try {
    const [result] = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [user_id]
    );

    res.json({ 
      message: '전체 읽음 처리 완료',
      updated_count: result.affectedRows
    });
  } catch (err) {
    console.error('🔥 전체 읽음 처리 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 📌 🔥 전체 삭제 (구체적인 경로를 먼저 배치)
router.delete('/delete-all', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  console.log('🔍 [delete-all] 요청 받음, user_id:', user_id);

  try {
    const [result] = await db.query(
      'DELETE FROM notifications WHERE user_id = ?',
      [user_id]
    );

    console.log('✅ [delete-all] 삭제 완료, 삭제된 개수:', result.affectedRows);

    res.json({ 
      message: '모든 알림이 삭제되었습니다.',
      deleted_count: result.affectedRows
    });
  } catch (err) {
    console.error('🔥 전체 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// 📌 🔥 읽은 알림만 삭제 (구체적인 경로를 먼저 배치)
router.delete('/delete-read', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  console.log('🔍 [delete-read] 요청 받음, user_id:', user_id);

  try {
    const [result] = await db.query(
      'DELETE FROM notifications WHERE user_id = ? AND is_read = TRUE',
      [user_id]
    );

    console.log('✅ [delete-read] 삭제 완료, 삭제된 개수:', result.affectedRows);

    res.json({ 
      message: '읽은 알림이 삭제되었습니다.',
      deleted_count: result.affectedRows
    });
  } catch (err) {
    console.error('🔥 읽은 알림 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// 📌 🆕 알림 통계 조회
router.get('/stats', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count,
        SUM(CASE WHEN is_read = TRUE THEN 1 ELSE 0 END) as read_count
      FROM notifications 
      WHERE user_id = ?
    `, [user_id]);

    res.json({ stats: stats[0] });
  } catch (err) {
    console.error('🔥 알림 통계 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 📌 알림 목록 조회 (SuperAdmin 및 classroom 조건 필터 추가)
router.get('/', authenticateToken, async (req, res) => {
  const { user_id, role } = req.user;

  try {
    // 현재 사용자가 속한 학급 목록 가져오기
    const [joined] = await db.query(
      `SELECT classroom_id FROM user_classrooms WHERE user_id = ?`,
      [user_id]
    );
    const classroomIds = joined.map(c => c.classroom_id);

    let query = `
      SELECT notification_id, type, related_id, message, created_at, is_read
      FROM notifications
      WHERE user_id = ?
    `;
    const params = [user_id];

    if (role === 'superadmin') {
      query += ` AND (type = 'inquiry' OR school_id IS NOT NULL)`;
    } else {
      if (classroomIds.length > 0) {
        const placeholders = classroomIds.map(() => '?').join(',');
        query += ` AND (classroom_id IS NULL OR classroom_id IN (${placeholders}))`;
        params.push(...classroomIds);
      } else {
        query += ` AND classroom_id IS NULL`;
      }
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await db.query(query, params);
    res.json({ notifications: rows });
  } catch (err) {
    console.error('🔥 알림 목록 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 📌 알림 읽음 처리 (본인 알림만)
router.patch('/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.user;

  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE notification_id = ? AND user_id = ?',
      [id, user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '알림을 찾을 수 없거나 권한이 없습니다.' });
    }

    const [result] = await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE notification_id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: '읽음 처리에 실패했습니다.' });
    }

    res.json({ message: '읽음 처리 완료' });
  } catch (err) {
    console.error('🔥 알림 읽음 처리 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 📌 개별 알림 삭제 (동적 파라미터는 마지막에 배치)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.user;

  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE notification_id = ? AND user_id = ?',
      [id, user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '해당 알림이 없거나 권한이 없습니다.' });
    }

    const [result] = await db.query(
      'DELETE FROM notifications WHERE notification_id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: '알림 삭제에 실패했습니다.' });
    }

    res.json({ message: '알림이 삭제되었습니다.' });
  } catch (err) {
    console.error('🔥 알림 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;