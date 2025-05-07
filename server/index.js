const { OAuth2Client } = require('google-auth-library'); //oauth 로그인
const client = new OAuth2Client('701008683168-eoqi92nqvhp6qk5mfr927hrbrpeujup0.apps.googleusercontent.com');

const passport = require('passport');

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');  // 추가

const app = express();
const PORT = process.env.PORT || 3001;

const authenticateToken = require('./authMiddleware'); //JWT 미들웨어
const crypto = require('crypto');  // 👈 초대코드 생성용 추가

const jwt = require('jsonwebtoken');  // JWT 토큰
require('dotenv').config();

require('./config/passport'); // passport 설정 파일 불러오기
app.use(passport.initialize());

app.use(cors());
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ 백엔드 서버가 잘 동작합니다!');
});

// 모든 유저 가져오기
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    console.error('🔥 DB 에러:', err); 
    res.status(500).json({ error: 'DB 오류', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});

// 회원가입 API
app.post('/api/signup', async (req, res) => {
    const { oauth_id, oauth_provider, name, email, role, profile_picture } = req.body;
  
    if (!oauth_id || !oauth_provider || !name || !email || !role) {
      return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
    }
  
    try {
      const [existingUser] = await db.query('SELECT * FROM users WHERE oauth_id = ?', [oauth_id]);
  
      if (existingUser.length > 0) {
        return res.status(400).json({ error: '이미 가입된 사용자입니다.' });
      }
  
      await db.query(
        'INSERT INTO users (oauth_id, oauth_provider, name, email, role, profile_picture, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [oauth_id, oauth_provider, name, email, role, profile_picture]
      );
  
      res.json({ message: '회원가입 완료' });
    } catch (err) {
      console.error('🔥 회원가입 오류:', err);
      res.status(500).json({ error: '서버 오류', details: err.message });
    }
});

// 로그인 API
app.post('/api/login', async (req, res) => {
    const { oauth_id, oauth_provider } = req.body;
  
    if (!oauth_id || !oauth_provider) {
      return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
    }
  
    try {
      const [userRows] = await db.query(
        'SELECT * FROM users WHERE oauth_id = ? AND oauth_provider = ?',
        [oauth_id, oauth_provider]
      );
  
      if (userRows.length === 0) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }
  
      const user = userRows[0];
  
      // ✅ JWT 토큰 발급
      const token = jwt.sign(
        { user_id: user.user_id, name: user.name, role: user.role }, // payload
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
  
      res.json({ message: '로그인 성공', token, user });
  
    } catch (err) {
      console.error('🔥 로그인 오류:', err);
      res.status(500).json({ error: '서버 오류', details: err.message });
    }
  });

  app.get('/api/profile', authenticateToken, async (req, res) => {
    const user_id = req.user.user_id;
  
    try {
      const [rows] = await db.query(`
        SELECT 
          u.user_id, u.name, u.email, u.role, u.profile_picture,
          c.school, c.grade, c.class_number
        FROM users u
        LEFT JOIN classrooms c ON u.classroom_id = c.classroom_id
        WHERE u.user_id = ?
      `, [user_id]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }
  
      res.json({
        message: '프로필 데이터 반환',
        user: rows[0]
      });
    } catch (err) {
      console.error('🔥 프로필 조회 오류:', err);
      res.status(500).json({ error: '서버 오류', details: err.message });
    }
  });
  
  const multer = require('multer');
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
  });
  const upload = multer({ storage });

  app.patch('/api/profile', authenticateToken, upload.single('profile_picture'), async (req, res) => {
    const { name } = req.body;
    const user_id = req.user.user_id;
    const profile_picture = req.file ? `/uploads/${req.file.filename}` : null;
  
    try {
      const updateQuery = profile_picture
        ? 'UPDATE users SET name = ?, profile_picture = ? WHERE user_id = ?'
        : 'UPDATE users SET name = ? WHERE user_id = ?';
  
      const updateParams = profile_picture
        ? [name, profile_picture, user_id]
        : [name, user_id];
  
      await db.query(updateQuery, updateParams);
      res.json({ message: '프로필 수정 완료' });
    } catch (err) {
      console.error('🔥 프로필 수정 오류:', err);
      res.status(500).json({ error: '서버 오류', details: err.message });
    }
  });
  
  
// 역할 변경 API
app.patch('/api/role', authenticateToken, async (req, res) => {
  const { role } = req.body;
  const user_id = req.user.user_id;

  console.log('🎯 역할 변경 요청 들어옴:', { user_id, role });

  // 허용된 역할인지 검사
  if (!['student', 'teacher'].includes(role)) {
    console.log('❌ 유효하지 않은 역할:', role);
    return res.status(400).json({ error: '유효하지 않은 역할입니다.' });
  }

  try {
    const [result] = await db.query('UPDATE users SET role = ? WHERE user_id = ?', [role, user_id]);

    console.log('✅ 역할 변경 완료:', result);

    res.json({ message: '역할이 성공적으로 변경되었습니다.' });
  } catch (err) {
    console.error('🔥 역할 변경 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// 학급 생성 API
app.post('/api/classrooms', authenticateToken, async (req, res) => {
  const { grade, class_number, school } = req.body;
  const teacher_id = req.user.user_id;

  console.log('📨 학급 생성 요청 데이터:', { grade, class_number, school, teacher_id });

  if (!grade || !class_number || !school) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    // ✅ 먼저 학급 중복 여부 확인
    const [existingClassroom] = await db.query(
      'SELECT * FROM classrooms WHERE grade = ? AND class_number = ? AND school = ?',
      [grade, class_number, school]
    );

    if (existingClassroom.length > 0) {
      // 이미 학급이 존재하면 그 학급의 초대코드를 반환
      return res.json({
        message: '이미 존재하는 학급입니다.',
        invite_code: existingClassroom[0].invite_code
      });
    }

    // 새 학급 생성
    const invite_code = crypto.randomBytes(4).toString('hex');

    const [result] = await db.query(
      'INSERT INTO classrooms (grade, class_number, invite_code, school, teacher_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [grade, class_number, invite_code, school, teacher_id]
    );
    const newClassroomId = result.insertId; // 새로 생성된 classroom_id 가져오기

    // ✅ 학급 생성자도 해당 학급에 자동 가입
    await db.query(
      'UPDATE users SET classroom_id = ? WHERE user_id = ?',
      [newClassroomId, teacher_id]
    );
    res.json({ message: '학급 생성 완료', invite_code });

  } catch (err) {
    console.error('🔥 학급 생성 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});
//생성한 학급 조회 api
app.get('/api/my-classrooms', authenticateToken, async (req, res) => {
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

// 학급 삭제 API
app.delete('/api/classrooms/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const teacher_id = req.user.user_id;

  try {
    // 1. 해당 학급이 요청자의 소유인지 확인
    const [classroom] = await db.query(
      'SELECT * FROM classrooms WHERE classroom_id = ? AND teacher_id = ?',
      [id, teacher_id]
    );

    if (classroom.length === 0) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    // 2. 학급에 소속된 유저들의 classroom_id를 NULL로 초기화
    await db.query(
      'UPDATE users SET classroom_id = NULL WHERE classroom_id = ?',
      [id]
    );

    // 3. 학급 삭제
    await db.query(
      'DELETE FROM classrooms WHERE classroom_id = ?',
      [id]
    );

    res.json({ message: '학급 삭제 완료' });

  } catch (err) {
    console.error('🔥 학급 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});



// 학급 초대코드로 가입하는 API
app.post('/api/join-classroom', authenticateToken, async (req, res) => {
    const { invite_code } = req.body;
    const user_id = req.user.user_id; // 현재 로그인한 사용자 ID
  
    if (!invite_code) {
      return res.status(400).json({ error: '초대코드를 입력해야 합니다.' });
    }
  
    try {
      // 초대코드로 학급 찾기
      const [classroomRows] = await db.query(
        'SELECT classroom_id FROM classrooms WHERE invite_code = ?',
        [invite_code]
      );
  
      if (classroomRows.length === 0) {
        return res.status(404).json({ error: '유효하지 않은 초대코드입니다.' });
      }
  
      const classroom_id = classroomRows[0].classroom_id;
  
      // 이미 학급에 가입했는지 확인
      const [userRows] = await db.query(
        'SELECT classroom_id FROM users WHERE user_id = ?',
        [user_id]
      );
  
      if (userRows.length > 0 && userRows[0].classroom_id) {
        return res.status(400).json({ error: '이미 학급에 가입되어 있습니다.' });
      }
  
      // 학급에 가입 처리
      await db.query(
        'UPDATE users SET classroom_id = ? WHERE user_id = ?',
        [classroom_id, user_id]
      );
  
      res.json({ message: '학급 가입 성공', classroom_id });
  
    } catch (err) {
      console.error('🔥 학급 가입 오류:', err);
      res.status(500).json({ error: '서버 오류', details: err.message });
    }
  });
// 게시글 작성 API
app.post('/api/posts', authenticateToken, async (req, res) => {
  const { classroom_id, grade, school_wide, title, content, category } = req.body;
  const { user_id, role } = req.user;

  if (!title || !content || !category) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    if (classroom_id) {
      // 학급 정보를 가져옴
      const [classroomRows] = await db.query(
        'SELECT * FROM classrooms WHERE classroom_id = ?',
        [classroom_id]
      );
    
      if (classroomRows.length === 0) {
        return res.status(404).json({ error: '학급을 찾을 수 없습니다.' });
      }
    
      const classroom = classroomRows[0];
    
      // ✅ 1. 학급 생성자인 경우
      if (classroom.teacher_id === user_id) {
        // 생성자라서 바로 통과
      }
      // ✅ 2. 학급 구성원(가입자)인 경우
      else {
        const [userRows] = await db.query(
          'SELECT classroom_id FROM users WHERE user_id = ?',
          [user_id]
        );
    
        if (userRows.length === 0 || userRows[0].classroom_id !== classroom_id) {
          return res.status(403).json({ error: '이 학급에 글을 쓸 권한이 없습니다.' });
        }
      }
    }
    // ✅ 글 저장
    await db.query(
      `INSERT INTO posts 
      (author_id, title, category, content, created_at, views, classroom_id, grade, school_wide) 
      VALUES (?, ?, ?, ?, NOW(), 0, ?, ?, ?)`,
      [user_id, title, category, content, classroom_id || null, grade || null, school_wide || false]
    );

    res.json({ message: '게시글 작성 완료' });

  } catch (err) {
    console.error('🔥 게시글 작성 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});


// 게시글 조회 API
app.get('/api/posts', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  try {
    // 1. 내가 만든 학급 목록 (teacher_id 기준)
    const [created] = await db.query(
      'SELECT classroom_id FROM classrooms WHERE teacher_id = ?',
      [user_id]
    );

    const createdClassroomIds = created.map(c => c.classroom_id);

    // 2. 내가 가입한 학급 (users.classroom_id)
    const [userRows] = await db.query(
      'SELECT classroom_id FROM users WHERE user_id = ?',
      [user_id]
    );
    const joinedClassroomId = userRows[0]?.classroom_id;

    if (!joinedClassroomId && createdClassroomIds.length === 0) {
      return res.status(400).json({ error: '학급에 가입되어 있지 않습니다.' });
    }

    // 3. 조회할 classroom_id 목록 구성
    const allVisibleClassroomIds = [...createdClassroomIds];
    if (joinedClassroomId) allVisibleClassroomIds.push(joinedClassroomId);

    // 4. 게시글 불러오기
    const [postRows] = await db.query(
      `SELECT * FROM posts 
       WHERE classroom_id IN (?) OR school_wide = TRUE 
       ORDER BY created_at DESC`,
      [allVisibleClassroomIds]
    );

    res.json({ posts: postRows });

  } catch (err) {
    console.error('🔥 게시글 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// 일정 추가 API
app.post('/api/schedules', authenticateToken, async (req, res) => {
    const { title, description, start_date, end_date, school_wide = false } = req.body;
    const { user_id } = req.user;
  
    if (!title || !start_date || !end_date) {
      return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
    }
  
    try {
      // 현재 사용자 정보 가져오기
      const [userRows] = await db.query(
        'SELECT classroom_id FROM users WHERE user_id = ?',
        [user_id]
      );
  
      if (userRows.length === 0 || !userRows[0].classroom_id) {
        return res.status(400).json({ error: '학급에 가입되어 있지 않습니다.' });
      }
  
      const classroom_id = userRows[0].classroom_id;
  
      await db.query(
        'INSERT INTO schedules (title, description, start_date, end_date, created_at, created_by, classroom_id, grade, school_wide) VALUES (?, ?, ?, ?, NOW(), ?, ?, NULL, ?)',
        [title, description, start_date, end_date, user_id, classroom_id, school_wide]
      );
  
      res.json({ message: '일정 추가 완료' });
  
    } catch (err) {
      console.error('🔥 일정 추가 오류:', err);
      res.status(500).json({ error: '서버 오류', details: err.message });
    }
  });

// 일정 조회 API
app.get('/api/schedules', authenticateToken, async (req, res) => {
    const { user_id } = req.user;
  
    try {
      // 사용자 학급 정보 가져오기
      const [userRows] = await db.query(
        'SELECT classroom_id FROM users WHERE user_id = ?',
        [user_id]
      );
  
      if (userRows.length === 0 || !userRows[0].classroom_id) {
        return res.status(400).json({ error: '학급에 가입되어 있지 않습니다.' });
      }
  
      const classroom_id = userRows[0].classroom_id;
  
      // 학급/학교 전체 공개 일정 조회
      const [scheduleRows] = await db.query(
        'SELECT schedule_id, title, description, start_date AS start, end_date AS end, school_wide FROM schedules WHERE classroom_id = ? OR school_wide = TRUE ORDER BY start_date ASC',
        [classroom_id]
      );
  
      res.json({ schedules: scheduleRows });
  
    } catch (err) {
      console.error('🔥 일정 조회 오류:', err);
      res.status(500).json({ error: '서버 오류', details: err.message });
    }
  });

app.post('/api/oauth-login', async (req, res) => {
    const { id_token } = req.body;
  
    if (!id_token) {
      return res.status(400).json({ error: 'id_token이 없습니다.' });
    }
  
    try {
      // id_token 검증
      const ticket = await client.verifyIdToken({
        idToken: id_token,
        audience: '701008683168-vdtgcfkssnh9joq1fjkjk4utlm3ln9ug.apps.googleusercontent.com', // 클라이언트 ID를 정확히 넣어야 함
      });
  
      const payload = ticket.getPayload();
  
      const oauth_id = payload.sub; // 구글 고유 ID
      const name = payload.name;
      const email = payload.email;
      const profile_picture = payload.picture;
      const oauth_provider = 'google';
  
      // DB 조회해서 이미 가입된 사용자 있는지 확인
      const [userRows] = await db.query(
        'SELECT * FROM users WHERE oauth_id = ? AND oauth_provider = ?',
        [oauth_id, oauth_provider]
      );
  
      let user;
      
      if (userRows.length === 0) {
        // 없으면 회원가입 (기본 role은 student)
        const [result] = await db.query(
          'INSERT INTO users (oauth_id, oauth_provider, name, email, role, profile_picture, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [oauth_id, oauth_provider, name, email, 'student', profile_picture]
        );
        user = { user_id: result.insertId, oauth_id, name, email, role: 'student' };
      } else {
        user = userRows[0];
      }
  
      // JWT 발급
      const token = jwt.sign(
        { user_id: user.user_id, name: user.name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
  
      res.json({ message: '로그인 성공', token, user });
  
    } catch (err) {
      console.error('🔥 OAuth 로그인 오류:', err);
      res.status(500).json({ error: '서버 오류', details: err.message });
    }
});

