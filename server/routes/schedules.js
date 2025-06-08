const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const { createNotification } = require('../utils/notify');

/**
 * ✅ 일정 생성 - 학교 전체 관리자와 학급 교사 모두 지원 (타임존 문제 해결)
 */
router.post('/', authenticateToken, async (req, res) => {
  const { title, description, start_date, end_date, classroom_id, school_wide } = req.body;
  const { user_id, is_admin, school_id: userSchoolId } = req.user;

  console.log('🔍 [schedules POST] 요청 데이터:', {
    title, description, start_date, end_date, classroom_id, school_wide
  });

  if (!title || !start_date || !end_date) {
    return res.status(400).json({ error: '제목, 시작일, 종료일은 필수입니다.' });
  }

  if (end_date < start_date) {
    return res.status(400).json({ error: '종료일은 시작일보다 이전일 수 없습니다.' });
  }

  try {
    let targetClassroomId = null;
    let targetSchoolId = null;
    let finalSchoolWide = false;

    // 기존 권한 체크 로직 (변경 없음)
    if (is_admin && userSchoolId) {
      console.log('🏫 [schedules POST] 학교 전체 관리자 일정 생성');
      targetSchoolId = userSchoolId;
      finalSchoolWide = true;
      
      if (classroom_id) {
        const [classroomInfo] = await db.query(
          'SELECT school_id FROM classrooms WHERE classroom_id = ?',
          [classroom_id]
        );
        if (classroomInfo.length === 0) {
          return res.status(400).json({ error: '존재하지 않는 학급입니다.' });
        }
        if (classroomInfo[0].school_id !== userSchoolId) {
          return res.status(403).json({ error: '해당 학급에 대한 권한이 없습니다.' });
        }
        targetClassroomId = classroom_id;
        finalSchoolWide = school_wide === true || school_wide === 'true';
      }
    } else if (classroom_id) {
      console.log('👩‍🏫 [schedules POST] 교사 학급 일정 생성');
      
      const [classroomInfo] = await db.query(
        'SELECT teacher_id, school_id FROM classrooms WHERE classroom_id = ?',
        [classroom_id]
      );
      if (classroomInfo.length === 0) {
        return res.status(400).json({ error: '존재하지 않는 학급입니다.' });
      }
      if (classroomInfo[0].teacher_id !== user_id) {
        return res.status(403).json({ error: '해당 학급의 교사만 일정을 생성할 수 있습니다.' });
      }
      targetClassroomId = classroom_id;
      targetSchoolId = classroomInfo[0].school_id;
      finalSchoolWide = school_wide === true || school_wide === 'true';
    } else {
      if (!is_admin || !userSchoolId) {
        return res.status(400).json({ error: '학급 정보가 필요합니다.' });
      }
    }

    console.log('🔍 [schedules POST] 최종 설정:', {
      targetClassroomId, targetSchoolId, finalSchoolWide
    });

    // 🔥 DATE 타입 사용 - 매우 간단함!
    const [result] = await db.query(
      `INSERT INTO schedules 
        (title, description, start_date, end_date, created_at, created_by, classroom_id, school_id, school_wide) 
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
      [
        title, 
        description, 
        start_date,  // 🔥 YYYY-MM-DD 그대로 저장 (DATE 타입이므로 타임존 문제 없음)
        end_date,    // 🔥 YYYY-MM-DD 그대로 저장
        user_id, 
        targetClassroomId,
        targetSchoolId, 
        finalSchoolWide
      ]
    );

    const scheduleId = result.insertId;
    console.log('✅ [schedules POST] 일정 저장 완료:', scheduleId);

    // 🔍 저장된 데이터 확인
    const [[savedSchedule]] = await db.query(
      'SELECT schedule_id, title, start_date, end_date FROM schedules WHERE schedule_id = ?',
      [scheduleId]
    );
    
    console.log('🔍 [schedules POST] 입력한 날짜:', { start_date, end_date });
    console.log('🔍 [schedules POST] 저장된 날짜:', { 
      start: savedSchedule.start_date, 
      end: savedSchedule.end_date 
    });

    res.json({ message: '일정 추가 완료', schedule_id: scheduleId });

    // 알림 전송 로직 (기존과 동일)
    try {
      if (finalSchoolWide && targetSchoolId) {
        const [schoolUsers] = await db.query(
          `SELECT DISTINCT uc.user_id 
           FROM user_classrooms uc
           JOIN classrooms c ON uc.classroom_id = c.classroom_id
           WHERE c.school_id = ? AND uc.user_id != ?`,
          [targetSchoolId, user_id]
        );

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
        const [parents] = await db.query(
          `SELECT user_id FROM user_classrooms WHERE classroom_id = ? AND user_id != ?`,
          [targetClassroomId, user_id]
        );

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
      targetSchoolId = school_id;
      console.log('🏫 학교 전체 관리자 일정 조회');
      
      // 🔥 수정: DATE_FORMAT을 사용하여 문자열로 반환
      const [scheduleRows] = await db.query(
        `SELECT schedule_id, title, description, 
                DATE_FORMAT(start_date, '%Y-%m-%d') AS start, 
                DATE_FORMAT(end_date, '%Y-%m-%d') AS end, 
                school_wide, created_by 
         FROM schedules 
         WHERE school_id = ? AND school_wide = TRUE
         ORDER BY start_date ASC`,
        [targetSchoolId]
      );

      console.log('📅 [schedules GET] 학교 전체 일정 수:', scheduleRows.length);
      return res.json({ schedules: scheduleRows });
      
    } else if (classroom_id) {
      targetClassroomId = classroom_id;
      
      const [classroomInfo] = await db.query(
        `SELECT school_id FROM classrooms WHERE classroom_id = ?`,
        [targetClassroomId]
      );

      if (classroomInfo.length === 0) {
        return res.status(400).json({ error: '학급 정보가 없습니다.' });
      }

      targetSchoolId = classroomInfo[0].school_id;
      
      console.log('📚 학급 일정 조회 (학급 + 학교 전체)');
      
      // 🔥 수정: DATE_FORMAT을 사용하여 문자열로 반환
      const [scheduleRows] = await db.query(
        `SELECT schedule_id, title, description, 
                DATE_FORMAT(start_date, '%Y-%m-%d') AS start, 
                DATE_FORMAT(end_date, '%Y-%m-%d') AS end, 
                school_wide, created_by 
         FROM schedules 
         WHERE classroom_id = ? OR (school_id = ? AND school_wide = TRUE)
         ORDER BY start_date ASC`,
        [targetClassroomId, targetSchoolId]
      );

      console.log('📅 [schedules GET] 학급+학교 일정 수:', scheduleRows.length);
      console.log('🔍 [schedules GET] 조회된 일정 샘플:', scheduleRows.slice(0, 2));
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

    // 🔥 수정: DATE_FORMAT을 사용하여 문자열로 반환
    const [scheduleRows] = await db.query(
      `SELECT schedule_id, title, description, 
              DATE_FORMAT(start_date, '%Y-%m-%d') AS start, 
              DATE_FORMAT(end_date, '%Y-%m-%d') AS end, 
              created_by, school_wide
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

// ✅ 일정 수정 - 🔥 타임존 문제 해결
router.put('/:id', authenticateToken, async (req, res) => {
  const schedule_id = req.params.id;
  const { title, description, start_date, end_date } = req.body;
  const user_id = req.user.user_id;

  if (!title || !start_date || !end_date) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  // 🔥 수정: 타임존 문제 해결을 위한 날짜 처리
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  
  if (endDate < startDate) {
    return res.status(400).json({ error: '종료일은 시작일보다 이전일 수 없습니다.' });
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

    // 🔥 수정: 타임존 문제 해결
    const startDateForDB = startDate.toISOString().split('T')[0] + ' 00:00:00';
    const endDateForDB = endDate.toISOString().split('T')[0] + ' 23:59:59';

    await db.query(
      'UPDATE schedules SET title = ?, description = ?, start_date = ?, end_date = ? WHERE schedule_id = ?',
      [title, description, startDateForDB, endDateForDB, schedule_id]
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