const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createNotification } = require('../utils/notify');

// 한글 파일명 문제 해결을 위한 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    // 서버에는 영문 파일명으로 저장
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    cb(null, `file_${timestamp}_${randomNum}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ✅ 이미지 단일 업로드 (에디터 이미지 삽입용)
router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });
    return res.status(200).json({ url: `/uploads/${req.file.filename}` });
  } catch (err) {
    console.error('🔥 이미지 업로드 오류:', err);
    res.status(500).json({ error: '이미지 업로드 실패', details: err.message });
  }
});

// 게시글 작성 부분만 수정 (posts.js에서 해당 부분)
router.post('/', authenticateToken, upload.array('files', 10), async (req, res) => {
  const { classroom_id, school_wide, title, content } = req.body;
  const { user_id, role, is_admin, school_id: userSchoolId } = req.user;
  const files = req.files || [];

  console.log('📝 게시글 작성 요청');
  console.log('body:', req.body);
  console.log('files:', req.files);
  console.log('user:', req.user);

  if (role === 'parent') {
    return res.status(403).json({ error: '학부모는 게시글을 작성할 수 없습니다.' });
  }

  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
  }

  try {
    let targetClassroomId = null;
    let finalSchoolWide = false;

    // 🆕 학교 전체 관리자인 경우
    if (is_admin && userSchoolId && !classroom_id) {
      console.log('🏫 학교 전체 관리자의 게시글 작성');
      
      // 🔥 수정: 학교 전체 공지이므로 대표 학급 하나를 가져와서 classroom_id로 사용
      const [[representativeClassroom]] = await db.query(
        'SELECT classroom_id FROM classrooms WHERE school_id = ? LIMIT 1',
        [userSchoolId]
      );
      
      if (representativeClassroom) {
        targetClassroomId = representativeClassroom.classroom_id;
        finalSchoolWide = true; // 학교 전체 관리자는 무조건 학교 전체 공지
      } else {
        return res.status(400).json({ error: '학교에 등록된 학급이 없습니다.' });
      }
    } else {
      // 일반 교사인 경우
      if (!classroom_id) {
        return res.status(400).json({ error: '학급 정보가 필요합니다.' });
      }
      targetClassroomId = classroom_id;
      finalSchoolWide = school_wide === 'true';
    }

    console.log('🔍 [posts POST] 최종 설정:', {
      targetClassroomId, finalSchoolWide
    });

    // 🔥 게시글 저장 - classroom_id가 반드시 존재하도록 보장
    const [result] = await db.query(
      `INSERT INTO posts 
        (author_id, title, content, created_at, views, classroom_id, school_wide, likes) 
        VALUES (?, ?, ?, NOW(), 0, ?, ?, 0)`,
      [user_id, title, content, targetClassroomId, finalSchoolWide]
    );

    const postId = result.insertId;
    console.log('✅ 게시글 저장 완료, ID:', postId);

    // 첨부파일 저장
    for (const file of files) {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      await db.query(
        `INSERT INTO attachments (post_id, original_name, file_path, uploaded_at)
        VALUES (?, ?, ?, NOW())`,
        [postId, originalName, `/uploads/${file.filename}`]
      );
    }

    // 알림 전송 (학급 또는 학교 전체)
    if (finalSchoolWide) {
      // 🏫 학교 전체 공지 - 같은 학교의 모든 학급 학생에게 알림
      let targetSchoolId;
      
      if (is_admin && userSchoolId) {
        // 학교 전체 관리자인 경우 직접 school_id 사용
        targetSchoolId = userSchoolId;
      } else {
        // 일반 교사가 학교 전체 공지를 작성한 경우
        const [[classroomRow]] = await db.query(
          'SELECT school_id FROM classrooms WHERE classroom_id = ? LIMIT 1',
          [targetClassroomId]
        );
        targetSchoolId = classroomRow?.school_id;
      }
      
      if (targetSchoolId) {
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
            classroomId: null, // 학교 전체 공지는 특정 학급 없음
            schoolId: targetSchoolId,
            type: 'post',
            relatedId: postId,
            message: `새 학교 공지: "${title}"`
          });
        }
        console.log('✅ 학교 전체 알림 전송 완료:', schoolUsers.length, '명');
      }
    } else if (targetClassroomId) {
      // 📚 학급 공지 - 해당 학급 학생에게만 알림
      const [classUsers] = await db.query(
        'SELECT user_id FROM user_classrooms WHERE classroom_id = ? AND user_id != ?',
        [targetClassroomId, user_id]
      );

      for (const u of classUsers) {
        await createNotification({
          userId: u.user_id,
          classroomId: targetClassroomId,
          type: 'post',
          relatedId: postId,
          message: `새 공지사항: "${title}"`
        });
      }
      console.log('✅ 학급 알림 전송 완료:', classUsers.length, '명');
    }

    res.json({ message: '게시글 작성 완료', post_id: postId });
  } catch (err) {
    console.error('🔥 게시글 작성 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// 🔥 게시글 목록 조회 - 수정된 버전
router.get('/', authenticateToken, async (req, res) => {
  const { user_id } = req.user;
  const { search, classroom_id } = req.query;

  if (!classroom_id) {
    return res.status(400).json({ error: 'classroom_id가 필요합니다.' });
  }

  try {
    // school_id는 user_schools에서 가져와서 조건으로 사용
    const [[schoolRow]] = await db.query(
      'SELECT school_id FROM user_schools WHERE user_id = ? LIMIT 1',
      [user_id]
    );
    const school_id = schoolRow?.school_id || null;

    // 🔥 수정: 학교 전체 공지를 위한 JOIN 쿼리 수정
    let query = `
      SELECT DISTINCT posts.*, users.name AS author_name
      FROM posts
      JOIN users ON posts.author_id = users.user_id
      WHERE (
        posts.classroom_id = ? 
        OR (
          posts.school_wide = TRUE 
          AND posts.classroom_id IN (
            SELECT classroom_id FROM classrooms WHERE school_id = ?
          )
        )
      )
    `;
    const params = [classroom_id, school_id];

    if (search) {
      query += ` AND (posts.title LIKE ? OR posts.content LIKE ?)`;
      const likeKeyword = `%${search}%`;
      params.push(likeKeyword, likeKeyword);
    }

    query += ` ORDER BY posts.created_at DESC`;

    const [postRows] = await db.query(query, params);
    res.json({ posts: postRows });
  } catch (err) {
    console.error('🔥 게시글 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

//✅ 게시글 상세 조회 - 권한 정보 포함
router.get('/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;

  try {
    // 🔥 수정: 게시글 + 작성자 정보 + 담당교사 정보 가져오기
    const [rows] = await db.query(
      `SELECT posts.*, users.name AS author_name, classrooms.teacher_id
       FROM posts
       JOIN users ON posts.author_id = users.user_id
       LEFT JOIN classrooms ON posts.classroom_id = classrooms.classroom_id
       WHERE posts.post_id = ?`,
      [postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    const post = rows[0];

    // 첨부파일 목록 가져오기
    const [attachments] = await db.query(
      `SELECT attachment_id, original_name, file_path
       FROM attachments
       WHERE post_id = ?`,
      [postId]
    );

    // 🔥 수정: post 객체에 attachments와 권한 정보를 포함시켜서 반환
    const postWithAttachments = {
      ...post,
      attachments: attachments
    };

    console.log('📋 게시글 상세 조회 결과:', {
      post_id: post.post_id,
      author_id: post.author_id,
      teacher_id: post.teacher_id,
      attachments_count: attachments.length
    });

    res.json(postWithAttachments);
  } catch (err) {
    console.error('🔥 게시글 상세 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

/**
 * ✅ 조회수 증가 (10분 제한)
 */
router.post('/:id/view', authenticateToken, async (req, res) => {
  const post_id = req.params.id;
  const user_id = req.user.user_id;

  try {
    const [rows] = await db.query(
      'SELECT last_viewed FROM post_views WHERE post_id = ? AND user_id = ?',
      [post_id, user_id]
    );

    const now = new Date();

    if (rows.length > 0) {
      const lastViewed = new Date(rows[0].last_viewed);
      if (now - lastViewed < 10 * 60 * 1000) {
        return res.json({ message: '10분 내 재조회: 조회수 증가 안 함' });
      }

      await db.query(
        'UPDATE post_views SET last_viewed = ? WHERE post_id = ? AND user_id = ?',
        [now, post_id, user_id]
      );
    } else {
      await db.query(
        'INSERT INTO post_views (post_id, user_id, last_viewed) VALUES (?, ?, ?)',
        [post_id, user_id, now]
      );
    }

    await db.query('UPDATE posts SET views = views + 1 WHERE post_id = ?', [post_id]);
    res.json({ message: '조회수 증가' });
  } catch (err) {
    console.error('🔥 조회수 제어 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * ✅ 게시글 수정
 */
router.put('/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const { title, content, category, school_wide } = req.body;
  const userId = req.user.user_id;

  if (!title || !content || !category) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT posts.*, classrooms.teacher_id
       FROM posts
       LEFT JOIN classrooms ON posts.classroom_id = classrooms.classroom_id
       WHERE posts.post_id = ?`,
      [postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '게시글이 존재하지 않습니다.' });
    }

    const post = rows[0];
    if (post.author_id !== userId && post.teacher_id !== userId) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    await db.query(
      `UPDATE posts SET title = ?, content = ?, category = ?, school_wide = ? WHERE post_id = ?`,
      [title, content, category, school_wide === true, postId]
    );

    res.json({ message: '게시글 수정 완료' });
  } catch (err) {
    console.error('🔥 게시글 수정 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

/**
 * ✅ 게시글 삭제
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.user_id;

  try {
    const [rows] = await db.query(
      `SELECT posts.*, classrooms.teacher_id
       FROM posts
       LEFT JOIN classrooms ON posts.classroom_id = classrooms.classroom_id
       WHERE posts.post_id = ?`,
      [postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '게시글이 존재하지 않습니다.' });
    }

    const post = rows[0];
    if (post.author_id !== userId && post.teacher_id !== userId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    await db.query('DELETE FROM posts WHERE post_id = ?', [postId]);
    res.json({ message: '게시글 삭제 완료' });
  } catch (err) {
    console.error('🔥 게시글 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

/**
 * ✅ 공감하기
 */
router.post('/:id/like', authenticateToken, async (req, res) => {
  const post_id = req.params.id;
  const user_id = req.user.user_id;

  try {
    const [rows] = await db.query(
      'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?',
      [user_id, post_id]
    );
    if (rows.length > 0) {
      return res.status(400).json({ error: '이미 공감한 게시글입니다.' });
    }

    await db.query('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [user_id, post_id]);
    await db.query('UPDATE posts SET likes = likes + 1 WHERE post_id = ?', [post_id]);

    res.json({ message: '공감 완료' });
  } catch (err) {
    console.error('🔥 공감 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * ✅ 공감 취소
 */
router.delete('/:id/like', authenticateToken, async (req, res) => {
  const post_id = req.params.id;
  const user_id = req.user.user_id;

  try {
    const [rows] = await db.query(
      'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?',
      [user_id, post_id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: '공감하지 않은 게시글입니다.' });
    }

    await db.query('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [user_id, post_id]);
    await db.query('UPDATE posts SET likes = likes - 1 WHERE post_id = ?', [post_id]);

    res.json({ message: '공감 취소 완료' });
  } catch (err) {
    console.error('🔥 공감 취소 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

/**
 * ✅ 공감 여부 조회
 */
router.get('/:id/like-check', authenticateToken, async (req, res) => {
  const post_id = req.params.id;
  const user_id = req.user.user_id;

  const [rows] = await db.query(
    'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?',
    [user_id, post_id]
  );

  res.json({ liked: rows.length > 0 });
});

// ✅ 학교 전체 관리자용 공지사항 조회 추가
router.get('/admin', authenticateToken, async (req, res) => {
  const { user_id, is_admin, school_id: userSchoolId } = req.user;
  const { school_id } = req.query;

  try {
    // 🆕 쿼리 파라미터로 받은 school_id 우선 사용, 없으면 토큰의 school_id 사용
    const targetSchoolId = school_id || userSchoolId;

    if (!is_admin || !targetSchoolId) {
      return res.status(403).json({ error: '학교 관리자 권한이 없거나 학교 정보가 없습니다.' });
    }

    console.log('🔍 [posts/admin] 학교 ID:', targetSchoolId);

    const [postRows] = await db.query(
      `SELECT posts.*, users.name AS author_name
       FROM posts
       JOIN users ON posts.author_id = users.user_id
       JOIN classrooms ON posts.classroom_id = classrooms.classroom_id
       WHERE classrooms.school_id = ? AND posts.school_wide = TRUE
       ORDER BY posts.created_at DESC`,
      [targetSchoolId]
    );

    console.log('📝 [posts/admin] 조회된 공지사항 수:', postRows.length);

    res.json({ posts: postRows });
  } catch (err) {
    console.error('🔥 관리자 공지사항 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

router.get('/:id/comments', authenticateToken, async (req, res) => {
  const { id: postId } = req.params;
  const { user_id, role } = req.user;
  
  try {
    // 🔥 수정: child_name 컬럼 추가 조회
    const [comments] = await db.query(
      `SELECT comments.*, users.name AS author_name, users.role AS author_role, users.child_name
       FROM comments
       JOIN users ON comments.author_id = users.user_id
       WHERE comments.post_id = ?
       ORDER BY comments.created_at ASC`,
      [postId]
    );

    // 🔥 사용자 역할에 따른 댓글 필터링
    let filteredComments;
    
    if (role === 'teacher') {
      // 선생님은 모든 댓글을 볼 수 있음 (숨겨진 댓글도 포함)
      filteredComments = comments;
    } else {
      // 학부모는 숨겨지지 않은 댓글만 볼 수 있음
      filteredComments = comments.filter(comment => !comment.is_hidden);
    }

    res.json({ comments: filteredComments });
  } catch (err) {
    console.error('🔥 댓글 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

/**
 * ✅ 특정 게시글에 댓글 작성 - posts 라우터에 추가
 */
router.post('/:id/comments', authenticateToken, async (req, res) => {
  const { id: postId } = req.params;
  const { content } = req.body;
  const authorId = req.user.user_id;

  if (!content) {
    return res.status(400).json({ error: '댓글 내용을 입력하세요.' });
  }

  try {
    await db.query(
      'INSERT INTO comments (post_id, author_id, content, created_at) VALUES (?, ?, ?, NOW())',
      [postId, authorId, content]
    );

    res.json({ message: '댓글 작성 완료' });

    // 게시글 작성자 정보 및 제목 가져오기
    const [postRows] = await db.query(
      'SELECT author_id, title FROM posts WHERE post_id = ?',
      [postId]
    );

    const postAuthorId = postRows[0]?.author_id;
    const postTitle = postRows[0]?.title || '게시글';

    if (postAuthorId && postAuthorId !== authorId) {
      const { createNotification } = require('../utils/notify');
      await createNotification({
        userId: postAuthorId,
        type: 'comment',
        relatedId: postId,
        message: `"${postTitle}"에 새 댓글이 달렸습니다.`
      });
    }
  } catch (err) {
    console.error('🔥 댓글 작성 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});


module.exports = router;