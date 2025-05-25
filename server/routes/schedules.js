const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const { createNotification } = require('../utils/notify');

// ✅ 일정 추가 - 학교 전체 관리자와 학급 교사 모두 지원
router.post('/', authenticateToken, async (req, res) => {
  const { title, description, start_date, end_date, school_wide = false, classroom_id } = req.body;
  const { user_id, is_admin, school_id: userSchoolId } = req.user;

  console.log('🔍 [schedules POST] 요청 데이터:', {
    title, description, start_date, end_date, school_wide, classroom_id,
    user_id, is_admin, userSchoolId
  });

  if (!title || !start_date || !end_date) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    let targetClassroomId = null;
    let targetSchoolId = null;
    let finalSchoolWide = false;

    // 🆕 학교 전체 관리자인 경우 (school_id로 판단)
    if (is_admin && userSchoolId) {
      console.log('🏫 학교 전체 관리자의 일정 등록');
      targetSchoolId = userSchoolId;
      
      if (classroom_id) {
        // classroom_id가 제공된 경우 (학급 일정)
        targetClassroomId = classroom_id;
        finalSchoolWide = school_wide === true || school_wide === 'true';
      } else {
        // classroom_id가 없는 경우 (학교 전체 일정)
        finalSchoolWide = true;
        
        // 대표 학급 찾기 (알림용)
        const [representativeClassroom] = await db.query(
          'SELECT classroom_id FROM classrooms WHERE school_id = ? LIMIT 1',
          [userSchoolId]
        );
        
        if (representativeClassroom.length > 0) {
          targetClassroomId = representativeClassroom[0].classroom_id;
        }
      }
    } else {
      // 🔥 일반 교사의 경우
      if (!classroom_id) {
        return res.status(400).json({ error: '학급 정보가 필요합니다.' });
      }

      const [classroomInfo] = await db.query(
        `SELECT school_id FROM classrooms WHERE classroom_id = ?`,
        [classroom_id]
      );

      if (classroomInfo.length === 0) {
        return res.status(400).json({ error: '유효하지 않은 학급입니다.' });
      }

      targetClassroomId = classroom_id;
      targetSchoolId = classroomInfo[0].school_id;
      finalSchoolWide = school_wide === true || school_wide === 'true';
    }

    console.log('🔍 [schedules POST] 최종 설정:', {
      targetClassroomId, targetSchoolId, finalSchoolWide
    });

    // 🔥 일정 저장
    const [result] = await db.query(
      `INSERT INTO schedules 
        (title, description, start_date, end_date, created_at, created_by, classroom_id, school_id, school_wide) 
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
      [title, description, start_date, end_date, user_id, targetClassroomId, targetSchoolId, finalSchoolWide]
    );

    const scheduleId = result.insertId;
    console.log('✅ [schedules POST] 일정 저장 완료:', scheduleId);

    res.json({ message: '일정 추가 완료', schedule_id: scheduleId });

    // 🔥 알림 전송
    try {
      if (finalSchoolWide && targetSchoolId) {
        // 학교 전체 일정인 경우
        const [schoolUsers] = await db.query(
          `SELECT DISTINCT uc.user_id 
           FROM user_classrooms uc
           JOIN classrooms c ON uc.classroom_id = c.classroom_id
           WHERE c.school_id = ? AND uc.user_id != ?`,
          [targetSchoolId, user_id]
        );

        console.log('🔔 [schedules POST] 학교 전체 알림 대상:', schoolUsers.length, '명');

        for (const u of schoolUsers) {
          await createNotification({
            userId: u.user_id,
            classroomId: null,
            schoolId: targetSchoolId,
            type: 'schedule',
            relatedId: scheduleId,
            message: `학교 전체 일정이 등록되었습니다: ${title}`
          });
        }
      } else if (targetClassroomId) {
        // 학급 일정인 경우
        const [parents] = await db.query(
          `SELECT user_id FROM user_classrooms WHERE classroom_id = ? AND user_id != ?`,
          [targetClassroomId, user_id]
        );

        console.log('🔔 [schedules POST] 학급 알림 대상:', parents.length, '명');

        for (const p of parents) {
          await createNotification({
            userId: p.user_id,
            classroomId: targetClassroomId,
            type: 'schedule',
            relatedId: scheduleId,
            message: `일정이 등록되었습니다: ${title}`
          });
        }
      }
    } catch (notifyErr) {
      console.error('⚠️ [schedules POST] 알림 전송 실패 (무시):', notifyErr);
    }
  } catch (err) {
    console.error('🔥 일정 추가 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 일정 조회 - 학교 전체 관리자와 학급 교사 모두 지원
router.get('/', authenticateToken, async (req, res) => {
  const { user_id, is_admin, school_id: userSchoolId } = req.user;
  const { classroom_id, school_id } = req.query;

  console.log('🔍 [schedules GET] 요청 파라미터:', {
    user_id, is_admin, userSchoolId, classroom_id, school_id
  });

  try {
    let targetSchoolId = null;
    let targetClassroomId = null;

    if (school_id && is_admin) {
      // 🆕 학교 전체 관리자의 경우 (school_id 파라미터 사용)
      targetSchoolId = school_id;
      console.log('🏫 학교 전체 관리자 일정 조회');
      
      // 학교 전체 일정만 조회
      const [scheduleRows] = await db.query(
        `SELECT schedule_id, title, description, 
                start_date AS start, end_date AS end, school_wide, created_by 
         FROM schedules 
         WHERE school_id = ? AND school_wide = TRUE
         ORDER BY start_date ASC`,
        [targetSchoolId]
      );

      console.log('📅 [schedules GET] 학교 전체 일정 수:', scheduleRows.length);
      return res.json({ schedules: scheduleRows });
      
    } else if (classroom_id) {
      // 🔥 학급 교사나 학부모의 경우 (classroom_id 파라미터 사용)
      targetClassroomId = classroom_id;
      
      // classroom_id로 school_id 찾기
      const [classroomInfo] = await db.query(
        `SELECT school_id FROM classrooms WHERE classroom_id = ?`,
        [targetClassroomId]
      );

      if (classroomInfo.length === 0) {
        return res.status(400).json({ error: '학급 정보가 없습니다.' });
      }

      targetSchoolId = classroomInfo[0].school_id;
      
      console.log('📚 학급 일정 조회 (학급 + 학교 전체)');
      
      // 해당 학급 일정 + 학교 전체 일정 조회
      const [scheduleRows] = await db.query(
        `SELECT schedule_id, title, description, 
                start_date AS start, end_date AS end, school_wide, created_by 
         FROM schedules 
         WHERE classroom_id = ? OR (school_id = ? AND school_wide = TRUE)
         ORDER BY start_date ASC`,
        [targetClassroomId, targetSchoolId]
      );

      console.log('📅 [schedules GET] 학급+학교 일정 수:', scheduleRows.length);
      return res.json({ schedules: scheduleRows });
      
    } else {
      return res.status(400).json({ error: 'classroom_id 또는 school_id가 필요합니다.' });
    }

  } catch (err) {
    console.error('🔥 일정 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 학교 전체 관리자 전용 일정 조회 (기존 /admin 엔드포인트 유지)
router.get('/admin', authenticateToken, async (req, res) => {
  const { user_id, is_admin, school_id: userSchoolId } = req.user;
  const { school_id } = req.query;

  try {
    const targetSchoolId = school_id || userSchoolId;

    if (!is_admin || !targetSchoolId) {
      return res.status(403).json({ error: '학교 관리자 권한이 없거나 학교 정보가 없습니다.' });
    }

    console.log('🔍 [schedules/admin] 학교 ID:', targetSchoolId);

    const [scheduleRows] = await db.query(
      `SELECT schedule_id, title, description, 
              start_date AS start, end_date AS end, created_by, school_wide
       FROM schedules 
       WHERE school_id = ? AND school_wide = TRUE
       ORDER BY start_date ASC`,
      [targetSchoolId]
    );

    console.log('📅 [schedules/admin] 조회된 일정 수:', scheduleRows.length);

    res.json({ schedules: scheduleRows });
  } catch (err) {
    console.error('🔥 관리자 일정 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 일정 수정
router.put('/:id', authenticateToken, async (req, res) => {
  const schedule_id = req.params.id;
  const { title, description, start_date, end_date } = req.body;
  const user_id = req.user.user_id;

  if (!title || !start_date || !end_date) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    const [[schedule]] = await db.query(
      'SELECT * FROM schedules WHERE schedule_id = ?',
      [schedule_id]
    );

    if (!schedule) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }

    // 권한 체크: 작성자만 수정 가능
    if (schedule.created_by !== user_id) {
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
router.delete('/:id', authenticateToken, async (req, res) => {
  const schedule_id = req.params.id;
  const user_id = req.user.user_id;

  try {
    const [[schedule]] = await db.query(
      'SELECT * FROM schedules WHERE schedule_id = ?',
      [schedule_id]
    );

    if (!schedule) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }

    // 권한 체크: 작성자만 삭제 가능
    if (schedule.created_by !== user_id) {
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