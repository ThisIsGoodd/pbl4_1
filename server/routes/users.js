const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const multer = require('multer');
const path = require('path');

// ✅ 파일 업로드 설정 (프로필 사진용)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// ✅ 프로필 조회 (복수 학급 대응) - 스키마 변경 반영
router.get('/profile', authenticateToken, async (req, res) => {
  const user_id = req.user.user_id;

  try {
    // 1. 기본 사용자 정보
    const [userRows] = await db.query(`
      SELECT 
        user_id, name, email, role, is_admin, school_id, profile_picture, child_name
      FROM users
      WHERE user_id = ?
    `, [user_id]);

    if (userRows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const user = userRows[0];

    // 2. 가입된 학급 리스트 조회 (수정된 스키마 반영)
    const [classRows] = await db.query(`
      SELECT 
        c.classroom_id, c.grade, c.class_number, s.name as school
      FROM user_classrooms uc
      JOIN classrooms c ON uc.classroom_id = c.classroom_id
      JOIN schools s ON c.school_id = s.school_id
      WHERE uc.user_id = ?
    `, [user_id]);

    // 3. 사용자 객체에 joinedClassrooms 배열 추가
    user.joined_classrooms = classRows;

    res.json({ message: '프로필 데이터 반환', user });
  } catch (err) {
    console.error('🔥 프로필 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 프로필 수정 (이름 + 자녀 이름 + 사진 + DND 시간)
router.patch('/profile', authenticateToken, upload.single('profile_picture'), async (req, res) => {
  const { name, child_name, chat_dnd_start, chat_dnd_end } = req.body;
  const user_id = req.user.user_id;
  const profile_picture = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    let query = `
      UPDATE users
      SET name = ?, child_name = ?, chat_dnd_start = ?, chat_dnd_end = ?
    `;
    const params = [name, child_name, chat_dnd_start || null, chat_dnd_end || null];

    if (profile_picture) {
      query += `, profile_picture = ?`;
      params.push(profile_picture);
    }

    query += ` WHERE user_id = ?`;
    params.push(user_id);

    await db.query(query, params);

    res.json({ message: '프로필 수정 완료' });
  } catch (err) {
    console.error('🔥 프로필 수정 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

//사용자 학급 연결 API
router.patch('/join-classroom', authenticateToken, async (req, res) => {
  const { classroom_id } = req.body;

  if (!classroom_id) {
    return res.status(400).json({ message: 'classroom_id가 필요합니다.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. 이미 가입했는지 확인
    const [exists] = await conn.query(
      'SELECT * FROM user_classrooms WHERE user_id = ? AND classroom_id = ?',
      [req.user.user_id, classroom_id]
    );

    if (exists.length > 0) {
      return res.status(400).json({ message: '이미 학급에 가입되어 있습니다.' });
    }

    // 2. 학급 정보 및 교사 정보 조회
    const [classroomRows] = await conn.query(
      'SELECT teacher_id, grade, class_number FROM classrooms WHERE classroom_id = ?',
      [classroom_id]
    );

    if (classroomRows.length === 0) {
      return res.status(404).json({ message: '해당 학급을 찾을 수 없습니다.' });
    }

    const { teacher_id, grade, class_number } = classroomRows[0];

    // 3. 학급 가입
    await conn.query(
      'INSERT INTO user_classrooms (user_id, classroom_id) VALUES (?, ?)',
      [req.user.user_id, classroom_id]
    );

    console.log(`✅ [users/join-classroom] 학급 가입 완료: ${req.user.user_id} -> ${classroom_id}`);

    // 4. 🆕 그룹 채팅방 처리
    let groupRoomId = null;
    const [groupRoomRows] = await conn.query(
      'SELECT room_id FROM chat_rooms WHERE classroom_id = ? AND room_type = ?',
      [classroom_id, 'group']
    );

    if (groupRoomRows.length > 0) {
      // 기존 그룹 채팅방에 추가
      groupRoomId = groupRoomRows[0].room_id;
      
      const [alreadyInGroup] = await conn.query(
        'SELECT * FROM chat_participants WHERE room_id = ? AND user_id = ?',
        [groupRoomId, req.user.user_id]
      );

      if (alreadyInGroup.length === 0) {
        await conn.query(
          'INSERT INTO chat_participants (room_id, user_id) VALUES (?, ?)',
          [groupRoomId, req.user.user_id]
        );
        console.log('✅ [users/join-classroom] 그룹 채팅방 참가 완료');
      }
    } else {
      // 그룹 채팅방이 없으면 생성
      const [newGroupRoom] = await conn.query(
        'INSERT INTO chat_rooms (room_type, classroom_id) VALUES (?, ?)',
        ['group', classroom_id]
      );
      groupRoomId = newGroupRoom.insertId;

      // 교사와 학부모 모두 추가
      await conn.query(
        'INSERT INTO chat_participants (room_id, user_id) VALUES (?, ?), (?, ?)',
        [groupRoomId, teacher_id, groupRoomId, req.user.user_id]
      );
      console.log('✅ [users/join-classroom] 새 그룹 채팅방 생성 및 참가 완료');
    }

    // 5. 🆕 1:1 채팅방 생성 (교사와 학부모)
    let privateRoomId = null;
    
    // 이미 1:1 채팅방이 있는지 확인
    const [existingPrivateRoom] = await conn.query(
      `SELECT cr.room_id 
       FROM chat_rooms cr
       JOIN chat_participants cp1 ON cr.room_id = cp1.room_id
       JOIN chat_participants cp2 ON cr.room_id = cp2.room_id
       WHERE cr.room_type = 'private' 
         AND cp1.user_id = ? 
         AND cp2.user_id = ?
         AND (SELECT COUNT(*) FROM chat_participants WHERE room_id = cr.room_id) = 2`,
      [teacher_id, req.user.user_id]
    );

    if (existingPrivateRoom.length === 0) {
      // 새 1:1 채팅방 생성
      const [privateRoomResult] = await conn.query(
        'INSERT INTO chat_rooms (room_type) VALUES (?)',
        ['private']
      );
      privateRoomId = privateRoomResult.insertId;

      await conn.query(
        'INSERT INTO chat_participants (room_id, user_id) VALUES (?, ?), (?, ?)',
        [privateRoomId, teacher_id, privateRoomId, req.user.user_id]
      );
      console.log('✅ [users/join-classroom] 1:1 채팅방 생성 완료');
    } else {
      privateRoomId = existingPrivateRoom[0].room_id;
      console.log('✅ [users/join-classroom] 기존 1:1 채팅방 사용');
    }

    await conn.commit();

    res.json({ 
      message: `${grade}학년 ${class_number}반 학급 연결이 완료되었습니다!`,
      details: {
        classroom_id,
        groupRoomId,
        privateRoomId,
        chatRoomsSetup: true
      }
    });
    
  } catch (err) {
    await conn.rollback();
    console.error('🔥 학급 연결 오류:', err);
    res.status(500).json({ message: '서버 오류', details: err.message });
  } finally {
    conn.release();
  }
});

// ✅ [신규] 역할 선택 (role 설정)
router.patch('/update-role', authenticateToken, async (req, res) => {
  const { role } = req.body;
  const allowedRoles = ['parent', 'teacher'];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: '허용되지 않은 역할입니다.' });
  }

  try {
    await db.query(
      'UPDATE users SET role = ? WHERE user_id = ?',
      [role, req.user.user_id]
    );
    res.json({ message: '역할 업데이트 완료' });
  } catch (err) {
    console.error('🔥 역할 업데이트 오류:', err);
    res.status(500).json({ message: '서버 오류', details: err.message });
  }
});

// ✅ 학급 탈퇴 (학부모용)
router.delete('/leave-classroom/:classroomId', authenticateToken, async (req, res) => {
  const { classroomId } = req.params;
  const { user_id } = req.user;

  try {
    // 1. 해당 학급에 속해 있는지 확인
    const [memberCheck] = await db.query(
      'SELECT * FROM user_classrooms WHERE user_id = ? AND classroom_id = ?',
      [user_id, classroomId]
    );

    if (memberCheck.length === 0) {
      return res.status(404).json({ error: '해당 학급에 속해 있지 않습니다.' });
    }

    // 2. 채팅방 참가자에서 제거
    const [chatRooms] = await db.query(
      'SELECT room_id FROM chat_rooms WHERE classroom_id = ?',
      [classroomId]
    );

    for (const room of chatRooms) {
      await db.query(
        'DELETE FROM chat_participants WHERE room_id = ? AND user_id = ?',
        [room.room_id, user_id]
      );
    }

    // 3. 학급에서 제거
    await db.query(
      'DELETE FROM user_classrooms WHERE user_id = ? AND classroom_id = ?',
      [user_id, classroomId]
    );

    // 4. 관련 알림 삭제
    await db.query(
      'DELETE FROM notifications WHERE user_id = ? AND classroom_id = ?',
      [user_id, classroomId]
    );

    res.json({ message: '학급 탈퇴가 완료되었습니다.' });
  } catch (err) {
    console.error('🔥 학급 탈퇴 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 회원 탈퇴
router.delete('/delete-account', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. 사용자가 생성한 학급들의 ID 조회
    const [ownedClassrooms] = await conn.query(
      'SELECT classroom_id FROM classrooms WHERE teacher_id = ?',
      [user_id]
    );

    // 2. 사용자가 생성한 학급들과 관련된 모든 데이터 삭제
    for (const classroom of ownedClassrooms) {
      const classroomId = classroom.classroom_id;
      
      // 해당 학급의 채팅방들 삭제
      const [chatRooms] = await conn.query(
        'SELECT room_id FROM chat_rooms WHERE classroom_id = ?',
        [classroomId]
      );

      for (const room of chatRooms) {
        await conn.query('DELETE FROM chat_messages WHERE room_id = ?', [room.room_id]);
        await conn.query('DELETE FROM chat_participants WHERE room_id = ?', [room.room_id]);
      }
      
      await conn.query('DELETE FROM chat_rooms WHERE classroom_id = ?', [classroomId]);
      
      // 학급 관련 데이터 삭제
      await conn.query('DELETE FROM posts WHERE classroom_id = ?', [classroomId]);
      await conn.query('DELETE FROM schedules WHERE classroom_id = ?', [classroomId]);
      await conn.query('DELETE FROM user_classrooms WHERE classroom_id = ?', [classroomId]);
      await conn.query('DELETE FROM notifications WHERE classroom_id = ?', [classroomId]);
    }

    // 3. 사용자가 생성한 학급들 삭제
    await conn.query('DELETE FROM classrooms WHERE teacher_id = ?', [user_id]);

    // 4. 사용자 관련 데이터 삭제
    await conn.query('DELETE FROM user_classrooms WHERE user_id = ?', [user_id]);
    await conn.query('DELETE FROM user_schools WHERE user_id = ?', [user_id]);
    await conn.query('DELETE FROM post_likes WHERE user_id = ?', [user_id]);
    await conn.query('DELETE FROM post_views WHERE user_id = ?', [user_id]);
    await conn.query('DELETE FROM comments WHERE author_id = ?', [user_id]);
    await conn.query('DELETE FROM posts WHERE author_id = ?', [user_id]);
    await conn.query('DELETE FROM schedules WHERE created_by = ?', [user_id]);
    await conn.query('DELETE FROM notifications WHERE user_id = ?', [user_id]);
    await conn.query('DELETE FROM notification_settings WHERE user_id = ?', [user_id]);
    await conn.query('DELETE FROM chat_participants WHERE user_id = ?', [user_id]);
    await conn.query('DELETE FROM chat_messages WHERE sender_id = ?', [user_id]);
    await conn.query('DELETE FROM chat_unread WHERE user_id = ?', [user_id]);

    // 5. 마지막으로 사용자 계정 삭제
    await conn.query('DELETE FROM users WHERE user_id = ?', [user_id]);

    await conn.commit();
    res.json({ message: '회원 탈퇴가 완료되었습니다.' });
  } catch (err) {
    await conn.rollback();
    console.error('🔥 회원 탈퇴 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;