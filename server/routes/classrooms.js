// server/routes/classrooms.js - 스키마 수정 버전

const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const authenticateToken = require('../authMiddleware');
const checkAdmin = require('../checkAdmin');
const multer = require('multer');
const path = require('path');

// ✅ 단체사진 업로드를 위한 multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    cb(null, `class_photo_${timestamp}${ext}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// ✅ 내가 생성한 학급 1개 반환 (수정된 버전) - 먼저 정의
router.get('/my-classroom', authenticateToken, async (req, res) => {
  const teacher_id = req.user.user_id;
  
  console.log('🔍 [my-classroom] 요청자 ID:', teacher_id);
  
  try {
    const [rows] = await db.query(
      'SELECT * FROM classrooms WHERE teacher_id = ? LIMIT 1',
      [teacher_id]
    );
    
    console.log('🔍 [my-classroom] 조회 결과:', rows);
    
    if (rows.length === 0) {
      console.log('❌ [my-classroom] 생성한 학급이 없음');
      return res.status(404).json({ error: '생성한 학급이 없습니다.' });
    }

    console.log('✅ [my-classroom] 학급 반환:', rows[0]);
    res.json({ classroom: rows[0] });
  } catch (err) {
    console.error('🔥 my-classroom 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 내가 생성한 학급 목록 조회
router.get('/my-classrooms', authenticateToken, async (req, res) => {
  const teacher_id = req.user.user_id;
  try {
    const [classrooms] = await db.query(
      'SELECT * FROM classrooms WHERE teacher_id = ?',
      [teacher_id]
    );
    res.json({ classrooms });
  } catch (err) {
    console.error('🔥 학급 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// 🧪 테스트용 엔드포인트
router.get('/test', (req, res) => {
  console.log('🧪 [TEST] 테스트 엔드포인트 호출됨');
  res.json({ message: 'classrooms 라우터 작동 중', timestamp: new Date() });
});

// ✅ 학급 생성 - school_id 사용하도록 수정
router.post('/', authenticateToken, checkAdmin, async (req, res) => {
  const { grade, class_number } = req.body;
  const teacher_id = req.user.user_id;
  const school_id = req.user.school_id;

  if (!school_id || !grade || !class_number) {
    return res.status(400).json({ error: '학년, 반, 학교 정보가 필요합니다.' });
  }

  try {
    const [existingClassroom] = await db.query(
      'SELECT * FROM classrooms WHERE grade = ? AND class_number = ? AND school_id = ?',
      [grade, class_number, school_id]
    );
    if (existingClassroom.length > 0) {
      return res.json({ message: '이미 존재하는 학급입니다.', invite_code: existingClassroom[0].invite_code });
    }

    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [result] = await db.query(
      'INSERT INTO classrooms (grade, class_number, invite_code, school_id, teacher_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [grade, class_number, invite_code, school_id, teacher_id]
    );
    const classroom_id = result.insertId;

    await db.query(
      'INSERT INTO user_classrooms (user_id, classroom_id) VALUES (?, ?)',
      [teacher_id, classroom_id]
    );

    try {
      const [chatResult] = await db.query(
        'INSERT INTO chat_rooms (room_type, classroom_id) VALUES (?, ?)',
        ['group', classroom_id]
      );
      const room_id = chatResult.insertId;

      await db.query(
        'INSERT INTO chat_participants (room_id, user_id) VALUES (?, ?)',
        [room_id, teacher_id]
      );
    } catch (chatErr) {
      console.error('⚠️ 채팅방 생성 실패:', chatErr);
      return res.status(200).json({
        message: '학급은 생성되었으나 채팅방 설정 중 오류가 발생했습니다.',
        invite_code,
        partial_error: true
      });
    }

    res.json({ message: '학급 생성 완료', invite_code });
  } catch (err) {
    console.error('🔥 학급 생성 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 학급 가입 - 채팅방 참가 로직 개선 (강화된 버전)
router.post('/join-classroom', authenticateToken, async (req, res) => {
  const { invite_code } = req.body;
  const user_id = req.user.user_id;

  if (!invite_code) return res.status(400).json({ error: '초대코드를 입력해주세요.' });

  try {
    // 1. 학급 정보 조회
    const [classroomRows] = await db.query(
      'SELECT classroom_id, teacher_id FROM classrooms WHERE invite_code = ?',
      [invite_code]
    );
    if (classroomRows.length === 0) return res.status(404).json({ error: '유효하지 않은 초대코드입니다.' });

    const classroom_id = classroomRows[0].classroom_id;
    const teacher_id = classroomRows[0].teacher_id;
    
    console.log('🔍 [join-classroom] 학급 정보:', { classroom_id, teacher_id, user_id });

    // 2. 이미 가입했는지 확인
    const [exists] = await db.query(
      'SELECT * FROM user_classrooms WHERE user_id = ? AND classroom_id = ?',
      [user_id, classroom_id]
    );
    if (exists.length > 0) return res.status(400).json({ error: '이미 학급에 가입되어 있습니다.' });

    // 3. 학급 가입
    await db.query(
      'INSERT INTO user_classrooms (user_id, classroom_id) VALUES (?, ?)',
      [user_id, classroom_id]
    );
    console.log('✅ [join-classroom] 학급 가입 완료');

    // 4. 그룹 채팅방 처리 (수정된 버전)
    let groupRoomId = null;
    const [groupRoomRows] = await db.query(
      'SELECT room_id FROM chat_rooms WHERE classroom_id = ? AND room_type = ?',
      [classroom_id, 'group']
    );

    if (groupRoomRows.length > 0) {
      // 기존 그룹 채팅방이 있는 경우
      groupRoomId = groupRoomRows[0].room_id;
      console.log('🔍 [join-classroom] 기존 그룹 채팅방 발견:', groupRoomId);
      
      // 이미 참가했는지 확인
      const [participantExists] = await db.query(
        'SELECT * FROM chat_participants WHERE room_id = ? AND user_id = ?',
        [groupRoomId, user_id]
      );

      if (participantExists.length === 0) {
        await db.query(
          'INSERT INTO chat_participants (room_id, user_id) VALUES (?, ?)',
          [groupRoomId, user_id]
        );
        console.log('✅ [join-classroom] 기존 그룹 채팅방에 사용자 추가 완료');
      } else {
        console.log('ℹ️ [join-classroom] 이미 그룹 채팅방에 참가 중');
      }
    } else {
      // 그룹 채팅방이 없으면 새로 생성하고 모든 멤버 추가
      console.log('🔧 [join-classroom] 새 그룹 채팅방 생성');
      const [newGroupRoom] = await db.query(
        'INSERT INTO chat_rooms (room_type, classroom_id) VALUES (?, ?)',
        ['group', classroom_id]
      );
      groupRoomId = newGroupRoom.insertId;

      // 해당 학급의 모든 멤버 조회 (교사 + 기존 학부모 + 새 학부모)
      const [allMembers] = await db.query(
        `SELECT DISTINCT uc.user_id
         FROM user_classrooms uc
         WHERE uc.classroom_id = ?
         UNION
         SELECT teacher_id as user_id FROM classrooms WHERE classroom_id = ?`,
        [classroom_id, classroom_id]
      );

      console.log('🔍 [join-classroom] 그룹 채팅방에 추가할 모든 멤버:', allMembers);

      // 모든 멤버를 그룹 채팅방에 추가
      if (allMembers.length > 0) {
        const participantValues = allMembers.map(member => 
          `(${groupRoomId}, ${member.user_id})`
        ).join(', ');
        
        await db.query(
          `INSERT INTO chat_participants (room_id, user_id) VALUES ${participantValues}`
        );
        console.log('✅ [join-classroom] 새 그룹 채팅방에 모든 멤버 추가 완료');
      }
    }

    // 5. 1:1 채팅방 생성 (교사와 학부모)
    const [privateRoomResult] = await db.query(
      'INSERT INTO chat_rooms (room_type) VALUES (?)',
      ['private']
    );
    const privateRoomId = privateRoomResult.insertId;

    await db.query(
      'INSERT INTO chat_participants (room_id, user_id) VALUES (?, ?), (?, ?)',
      [privateRoomId, teacher_id, privateRoomId, user_id]
    );
    console.log('✅ [join-classroom] 1:1 채팅방 생성:', privateRoomId);

    // 6. 생성된 채팅방 확인
    const [finalRooms] = await db.query(
      `SELECT cr.room_id, cr.room_type, cr.classroom_id
       FROM chat_rooms cr
       JOIN chat_participants cp ON cr.room_id = cp.room_id
       WHERE cp.user_id = ? AND (cr.classroom_id = ? OR cr.classroom_id IS NULL)`,
      [user_id, classroom_id]
    );
    console.log('🔍 [join-classroom] 최종 채팅방 목록:', finalRooms);

    res.json({ 
      message: '학급 가입 성공', 
      classroom_id,
      groupRoomId,
      privateRoomId,
      totalRooms: finalRooms.length
    });
  } catch (err) {
    console.error('🔥 학급 가입 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 학급 정보 조회 (학교 이름 포함) - 수정
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT c.classroom_id, c.grade, c.class_number, c.invite_code, c.teacher_id, c.created_at, c.class_photo,
             s.name AS school
      FROM classrooms c
      JOIN schools s ON c.school_id = s.school_id
      WHERE c.classroom_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: '학급을 찾을 수 없습니다.' });
    }

    res.json(rows[0]); // 여기서 school = 학교 이름으로 반환됨
  } catch (err) {
    console.error('🔥 학급 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ✅ 학급 멤버 목록
router.get('/:id/members', authenticateToken, async (req, res) => {
  const classroom_id = req.params.id;
  const requester_id = req.user.user_id;

  try {
    const [classroomRows] = await db.query(
      'SELECT * FROM classrooms WHERE classroom_id = ? AND teacher_id = ?',
      [classroom_id, requester_id]
    );
    if (classroomRows.length === 0) return res.status(403).json({ error: '접근 권한이 없습니다.' });

    const [members] = await db.query(
      'SELECT u.user_id, u.name, u.email, u.child_name FROM user_classrooms uc JOIN users u ON uc.user_id = u.user_id WHERE uc.classroom_id = ? AND u.role = "parent"',
      [classroom_id]
    );

    res.json({ members });
  } catch (err) {
    console.error('🔥 멤버 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 초대코드 재발급
router.patch('/:id/invite-code', authenticateToken, async (req, res) => {
  const classroom_id = req.params.id;
  const teacher_id = req.user.user_id;

  try {
    const [rows] = await db.query(
      'SELECT * FROM classrooms WHERE classroom_id = ? AND teacher_id = ?',
      [classroom_id, teacher_id]
    );
    if (rows.length === 0) return res.status(403).json({ error: '접근 권한이 없습니다.' });

    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await db.query(
      'UPDATE classrooms SET invite_code = ? WHERE classroom_id = ?',
      [newCode, classroom_id]
    );

    res.json({ message: '초대코드가 재발급되었습니다.', invite_code: newCode });
  } catch (err) {
    console.error('🔥 초대코드 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 학급 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const teacher_id = req.user.user_id;
  try {
    const [classroom] = await db.query(
      'SELECT * FROM classrooms WHERE classroom_id = ? AND teacher_id = ?',
      [id, teacher_id]
    );
    if (classroom.length === 0) return res.status(403).json({ error: '권한이 없습니다.' });

    await db.query('DELETE FROM posts WHERE classroom_id = ?', [id]);
    await db.query('DELETE FROM user_classrooms WHERE classroom_id = ?', [id]);
    await db.query('DELETE FROM classrooms WHERE classroom_id = ?', [id]);

    res.json({ message: '학급 삭제 완료' });
  } catch (err) {
    console.error('🔥 학급 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 단체사진 업로드
router.post('/:id/photo', authenticateToken, upload.single('class_photo'), async (req, res) => {
  const classroom_id = req.params.id;
  const teacher_id = req.user.user_id;

  if (!req.file) {
    return res.status(400).json({ error: '사진 파일이 필요합니다.' });
  }

  try {
    // 교사 권한 확인
    const [classroomRows] = await db.query(
      'SELECT * FROM classrooms WHERE classroom_id = ? AND teacher_id = ?',
      [classroom_id, teacher_id]
    );

    if (classroomRows.length === 0) {
      return res.status(403).json({ error: '해당 학급의 교사만 사진을 업로드할 수 있습니다.' });
    }

    const photo_url = `/uploads/${req.file.filename}`;

    // 학급 테이블에 사진 URL 저장
    await db.query(
      'UPDATE classrooms SET class_photo = ? WHERE classroom_id = ?',
      [photo_url, classroom_id]
    );

    res.json({ 
      message: '단체사진 업로드 완료',
      photo_url 
    });
  } catch (err) {
    console.error('🔥 사진 업로드 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

module.exports = router;