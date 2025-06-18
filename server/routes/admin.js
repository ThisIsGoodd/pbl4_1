const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const checkAdmin = require('../checkAdmin');
const crypto = require('crypto');

// ✅ 관리자 인증코드 확인 → user_schools 테이블에 admin 등록
router.post('/auth/verify-admin', authenticateToken, async (req, res) => {
  const { schoolId, code } = req.body;
  const userId = req.user.user_id;

  try {
    const [rows] = await db.query(
      'SELECT * FROM school_admin_codes WHERE school_id = ? AND code = ?',
      [schoolId, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: '인증코드가 일치하지 않습니다.' });
    }

    await db.query(
      'INSERT INTO user_schools (user_id, school_id, role) VALUES (?, ?, ?)',
      [userId, schoolId, 'teacher']
    );

    res.json({ message: '관리자 승인이 완료되었습니다.' });
  } catch (err) {
    console.error('🔥 관리자 인증 오류:', err);
    res.status(500).json({ message: '서버 오류', details: err.message });
  }
});

// ✅ 관리자용: 교사 목록 조회 - 프로필 사진과 담당 학급 정보 포함 (GROUP BY 오류 해결)
router.get('/teachers', authenticateToken, async (req, res) => {
  const user_id = req.user.user_id;
  const { school_id } = req.query;

  try {
    // 1. 요청자가 해당 학교의 생성자인지 확인
    const [[schoolRow]] = await db.query(
      'SELECT created_by FROM schools WHERE school_id = ?',
      [school_id]
    );

    if (!schoolRow || schoolRow.created_by !== user_id) {
      return res.status(403).json({ error: '해당 학교의 생성자만 교사 목록을 조회할 수 있습니다.' });
    }

    // 🔥 수정: GROUP BY 오류 해결 - 집계 함수 사용
    const [rows] = await db.query(`
      SELECT 
        u.user_id, 
        u.name, 
        u.email, 
        u.created_at, 
        u.profile_picture,
        MAX(c.grade) as grade,
        MAX(c.class_number) as class_number,
        COUNT(DISTINCT c.classroom_id) as classroom_count
      FROM user_schools us
      JOIN users u ON us.user_id = u.user_id
      LEFT JOIN classrooms c ON u.user_id = c.teacher_id
      WHERE us.school_id = ? AND us.role = 'teacher'
      GROUP BY u.user_id, u.name, u.email, u.created_at, u.profile_picture
      ORDER BY u.name
    `, [school_id]);

    console.log('✅ [teachers GET] 교사 목록 조회 완료:', rows.length);
    res.json({ teachers: rows });
  } catch (err) {
    console.error('🔥 교사 목록 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 관리자용: 학급 목록 조회 - 학부모 수 정확히 계산
router.get('/classrooms', authenticateToken, async (req, res) => {
  const user_id = req.user.user_id;
  const { school_id } = req.query;

  console.log('🔍 [admin/classrooms] 요청 정보:', { user_id, school_id });

  try {
    // 1. 요청자가 해당 학교의 생성자인지 확인
    const [[schoolRow]] = await db.query(
      'SELECT created_by FROM schools WHERE school_id = ?',
      [school_id]
    );

    if (!schoolRow || schoolRow.created_by !== user_id) {
      return res.status(403).json({ error: '해당 학교의 생성자만 학급 목록을 조회할 수 있습니다.' });
    }

    // 🔥 완전 수정: 테이블 별칭을 명확히 구분하여 올바른 쿼리 작성
    const [rows] = await db.query(`
      SELECT 
        c.classroom_id, 
        c.grade, 
        c.class_number, 
        c.class_photo,
        s.name as school,
        teacher.name as teacher_name,
        COUNT(CASE WHEN member.role = 'parent' THEN uc.user_id END) as parent_count
      FROM classrooms c
      JOIN schools s ON c.school_id = s.school_id
      LEFT JOIN users teacher ON c.teacher_id = teacher.user_id
      LEFT JOIN user_classrooms uc ON c.classroom_id = uc.classroom_id
      LEFT JOIN users member ON uc.user_id = member.user_id
      WHERE c.school_id = ?
      GROUP BY c.classroom_id, c.grade, c.class_number, c.class_photo, s.name, teacher.name
      ORDER BY c.grade, c.class_number
    `, [school_id]);

    console.log('✅ [admin/classrooms] 학급 목록 조회 완료:', rows.length);
    console.log('🔍 [admin/classrooms] 샘플 데이터:', JSON.stringify(rows[0], null, 2));
    
    res.json({ classrooms: rows });
  } catch (err) {
    console.error('🔥 학급 목록 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 교사 삭제 - 수정된 버전 (classroom_id 컬럼 제거)
router.delete('/teachers/:teacherId', authenticateToken, async (req, res) => {
  const { teacherId } = req.params;
  const user_id = req.user.user_id;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. 권한 확인
    const [[userRow]] = await conn.query(
      'SELECT school_id FROM users WHERE user_id = ?',
      [user_id]
    );

    if (!userRow || !userRow.school_id) {
      return res.status(403).json({ error: '학교 정보가 없습니다.' });
    }

    const school_id = userRow.school_id;

    const [[schoolRow]] = await conn.query(
      'SELECT created_by FROM schools WHERE school_id = ?',
      [school_id]
    );

    if (!schoolRow || schoolRow.created_by !== user_id) {
      return res.status(403).json({ error: '해당 학교의 생성자만 교사를 삭제할 수 있습니다.' });
    }

    // 2. 삭제할 교사 정보 확인
    const [[teacherInfo]] = await conn.query(
      'SELECT name FROM users WHERE user_id = ?',
      [teacherId]
    );

    if (!teacherInfo) {
      return res.status(404).json({ error: '해당 교사를 찾을 수 없습니다.' });
    }

    // 3. 교사가 생성한 학급들 조회
    const [classrooms] = await conn.query(
      'SELECT classroom_id FROM classrooms WHERE teacher_id = ?',
      [teacherId]
    );

    // 4. 각 학급의 연관 데이터 삭제
    for (const classroom of classrooms) {
      const classroomId = classroom.classroom_id;
      
      // 채팅 관련 데이터 삭제
      const [chatRooms] = await conn.query(
        'SELECT room_id FROM chat_rooms WHERE classroom_id = ?',
        [classroomId]
      );

      for (const room of chatRooms) {
        await conn.query('DELETE FROM chat_messages WHERE room_id = ?', [room.room_id]);
        await conn.query('DELETE FROM chat_participants WHERE room_id = ?', [room.room_id]);
        await conn.query('DELETE FROM chat_unread WHERE room_id = ?', [room.room_id]);
      }
      
      await conn.query('DELETE FROM chat_rooms WHERE classroom_id = ?', [classroomId]);

      // 게시글 관련 데이터 삭제 (MySQL 서브쿼리 제한 때문에 단계적으로 실행)
      const [posts] = await conn.query('SELECT post_id FROM posts WHERE classroom_id = ?', [classroomId]);
      const postIds = posts.map(p => p.post_id);
      
      if (postIds.length > 0) {
        await conn.query(`DELETE FROM comments WHERE post_id IN (${postIds.join(',')})`);
        await conn.query(`DELETE FROM post_likes WHERE post_id IN (${postIds.join(',')})`);
        await conn.query(`DELETE FROM post_views WHERE post_id IN (${postIds.join(',')})`);
        await conn.query(`DELETE FROM attachments WHERE post_id IN (${postIds.join(',')})`);
      }
      
      await conn.query('DELETE FROM posts WHERE classroom_id = ?', [classroomId]);
      
      // 기타 학급 관련 데이터 삭제
      await conn.query('DELETE FROM schedules WHERE classroom_id = ?', [classroomId]);
      await conn.query('DELETE FROM notifications WHERE classroom_id = ?', [classroomId]);
      await conn.query('DELETE FROM user_classrooms WHERE classroom_id = ?', [classroomId]);
    }

    // 5. 학급들 삭제
    await conn.query('DELETE FROM classrooms WHERE teacher_id = ?', [teacherId]);

    // 6. 교사가 작성한 모든 게시글 삭제 (학급 외 게시글)
    const [teacherPosts] = await conn.query('SELECT post_id FROM posts WHERE author_id = ?', [teacherId]);
    const teacherPostIds = teacherPosts.map(p => p.post_id);
    
    if (teacherPostIds.length > 0) {
      await conn.query(`DELETE FROM comments WHERE post_id IN (${teacherPostIds.join(',')})`);
      await conn.query(`DELETE FROM post_likes WHERE post_id IN (${teacherPostIds.join(',')})`);
      await conn.query(`DELETE FROM post_views WHERE post_id IN (${teacherPostIds.join(',')})`);
      await conn.query(`DELETE FROM attachments WHERE post_id IN (${teacherPostIds.join(',')})`);
    }
    
    await conn.query('DELETE FROM posts WHERE author_id = ?', [teacherId]);

    // 7. 교사 권한 및 관련 데이터 삭제
    await conn.query('DELETE FROM user_schools WHERE user_id = ? AND school_id = ?', [teacherId, school_id]);
    await conn.query('DELETE FROM schedules WHERE created_by = ?', [teacherId]);
    await conn.query('DELETE FROM notifications WHERE user_id = ?', [teacherId]);

    // 8. 교사 정보 업데이트 (관리자 권한만 해제, classroom_id 제거)
    await conn.query(
      'UPDATE users SET is_admin = 0 WHERE user_id = ?',
      [teacherId]
    );

    await conn.commit();
    
    console.log(`✅ 교사 삭제 완료: ${teacherInfo.name} (${teacherId})`);
    res.json({ 
      message: `${teacherInfo.name} 교사 및 관련 데이터가 모두 삭제되었습니다.`,
      deleted_classrooms: classrooms.length,
      deleted_teacher_name: teacherInfo.name
    });
    
  } catch (err) {
    await conn.rollback();
    console.error('🔥 교사 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  } finally {
    conn.release();
  }
});

// ✅ 인증코드 조회 (수정된 버전)
router.get('/invite-code', authenticateToken, async (req, res) => {
  const user_id = req.user.user_id;

  try {
    console.log('🔍 [admin/invite-code] 사용자 ID:', user_id);

    // 1. 사용자의 최신 정보에서 school_id 가져오기
    const [[userRow]] = await db.query(
      'SELECT school_id, is_admin FROM users WHERE user_id = ?',
      [user_id]
    );

    console.log('🔍 [admin/invite-code] 사용자 정보:', userRow);

    if (!userRow || !userRow.is_admin || !userRow.school_id) {
      return res.status(403).json({ error: '전체 관리자 권한이 없거나 학교 정보가 없습니다.' });
    }

    const school_id = userRow.school_id;
    console.log('🔍 [admin/invite-code] 학교 ID:', school_id);

    // 2. 학교 생성자인지 확인
    const [[schoolRow]] = await db.query(
      'SELECT created_by FROM schools WHERE school_id = ?',
      [school_id]
    );

    console.log('🔍 [admin/invite-code] 학교 정보:', schoolRow);

    if (!schoolRow || schoolRow.created_by !== user_id) {
      return res.status(403).json({ error: '해당 학교의 생성자만 인증코드를 조회할 수 있습니다.' });
    }

    // 3. 인증코드 조회
    const [codeRows] = await db.query(
      'SELECT code FROM school_admin_codes WHERE school_id = ?',
      [school_id]
    );

    console.log('🔍 [admin/invite-code] 조회된 코드:', codeRows);

    if (codeRows.length === 0) {
      // 코드가 없으면 새로 생성
      const newCode = crypto.randomBytes(4).toString('hex');
      
      await db.query(
        'INSERT INTO school_admin_codes (school_id, code) VALUES (?, ?)',
        [school_id, newCode]
      );

      console.log('✅ [admin/invite-code] 새 코드 생성:', newCode);
      return res.json({ invite_code: newCode });
    }

    console.log('✅ [admin/invite-code] 기존 코드 반환:', codeRows[0].code);
    res.json({ invite_code: codeRows[0].code });
  } catch (err) {
    console.error('🔥 인증코드 확인 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 인증코드 재설정 (수정된 버전)
router.patch('/invite-code', authenticateToken, async (req, res) => {
  const user_id = req.user.user_id;

  try {
    console.log('🔍 [admin/invite-code PATCH] 사용자 ID:', user_id);

    // 1. 사용자의 최신 정보에서 school_id 가져오기
    const [[userRow]] = await db.query(
      'SELECT school_id, is_admin FROM users WHERE user_id = ?',
      [user_id]
    );

    if (!userRow || !userRow.is_admin || !userRow.school_id) {
      return res.status(403).json({ error: '전체 관리자 권한이 없거나 학교 정보가 없습니다.' });
    }

    const school_id = userRow.school_id;

    // 2. 학교 생성자인지 확인
    const [[schoolRow]] = await db.query(
      'SELECT created_by FROM schools WHERE school_id = ?',
      [school_id]
    );

    if (!schoolRow || schoolRow.created_by !== user_id) {
      return res.status(403).json({ error: '해당 학교의 생성자만 인증코드를 변경할 수 있습니다.' });
    }

    // 3. 새 코드 생성 및 업데이트
    const newCode = crypto.randomBytes(4).toString('hex');

    await db.query(
      `INSERT INTO school_admin_codes (school_id, code)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE code = VALUES(code)`,
      [school_id, newCode]
    );

    console.log('✅ [admin/invite-code PATCH] 코드 재설정:', newCode);
    res.json({ message: '인증코드가 새로 설정되었습니다.', new_code: newCode });
  } catch (err) {
    console.error('🔥 인증코드 변경 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 전체 관리자용: 인증코드 목록 조회 (기존 코드 유지)
router.get('/auth-codes', authenticateToken, checkAdmin, async (req, res) => {
  const adminId = req.user.user_id;
  const schoolId = req.query.school_id;

  if (!schoolId) {
    return res.status(400).json({ error: 'school_id 쿼리 파라미터가 필요합니다.' });
  }

  try {
    const [schoolRows] = await db.query(
      'SELECT * FROM schools WHERE school_id = ? AND created_by = ?',
      [schoolId, adminId]
    );

    if (schoolRows.length === 0) {
      return res.status(403).json({ error: '이 학교의 전체 관리자만 인증코드를 조회할 수 있습니다.' });
    }

    const [rows] = await db.query(
      'SELECT code, created_at FROM school_admin_codes WHERE school_id = ? ORDER BY created_at DESC',
      [schoolId]
    );

    res.json({ codes: rows });
  } catch (err) {
    console.error('🔥 인증코드 목록 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

module.exports = router;