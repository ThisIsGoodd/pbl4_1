// 📄 routes/posts.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const multer = require('multer');
const path = require('path');
const { createNotification } = require('../utils/notify');


// ✅ 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// 게시글 작성
router.post('/', upload.single('file'), authenticateToken, async (req, res) => {
  const { classroom_id, grade, school_wide, title, content, category } = req.body;
  const { user_id, role } = req.user; // 🔍 role 정보 사용
  const file = req.file;
  const attachment_url = file ? `/uploads/${file.filename}` : null;

  // 🔒 학부모 글쓰기 제한
  if (role === 'parent') {
    return res.status(403).json({ error: '학부모는 게시글을 작성할 수 없습니다.' });
  }

  if (!title || !content || !category) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    await db.query(
      `INSERT INTO posts 
      (author_id, title, category, content, created_at, views, classroom_id, grade, school_wide, attachment_url, likes) 
      VALUES (?, ?, ?, ?, NOW(), 0, ?, ?, ?, ?, 0)`,
      [
        user_id, title, category, content,
        classroom_id || null,
        grade || null,
        school_wide === 'true' || school_wide === true,
        attachment_url
      ]
    );

    const [lastPost] = await db.query('SELECT LAST_INSERT_ID() AS post_id');
    const newPostId = lastPost[0].post_id;

    const [classUsers] = await db.query(
      'SELECT user_id FROM users WHERE classroom_id = ? AND user_id != ?',
      [classroom_id, user_id]
    );

    for (const u of classUsers) {
      await createNotification({
        userId: u.user_id,
        type: 'post',
        relatedId: newPostId,
        message: '새 공지사항이 등록되었습니다.'
      });
    }

    res.json({ message: '게시글 작성 완료' });
  } catch (err) {
    console.error('🔥 게시글 작성 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// 게시글 목록 조회
router.get('/', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  try {
    const [created] = await db.query(
      'SELECT classroom_id FROM classrooms WHERE teacher_id = ?',
      [user_id]
    );
    const createdClassroomIds = created.map(c => c.classroom_id);

    const [userRows] = await db.query(
      'SELECT classroom_id FROM users WHERE user_id = ?',
      [user_id]
    );
    const joinedClassroomId = userRows[0]?.classroom_id;

    if (!joinedClassroomId && createdClassroomIds.length === 0) {
      return res.status(400).json({ error: '학급에 가입되어 있지 않습니다.' });
    }

    const allVisibleClassroomIds = [...createdClassroomIds];
    if (joinedClassroomId) allVisibleClassroomIds.push(joinedClassroomId);

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

// 게시글 상세 조회
router.get('/posts/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;

  try {
    const [rows] = await db.query(
      `SELECT posts.*, users.name AS author_name
       FROM posts
       JOIN users ON posts.author_id = users.user_id
       WHERE posts.post_id = ?`,
      [postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    res.json({ post: rows[0] });
  } catch (err) {
    console.error('🔥 게시글 상세 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// 게시글 조회수 증가
router.post('/posts/:id/view', authenticateToken, async (req, res) => {
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
      const diffMs = now - lastViewed;

      if (diffMs < 10 * 60 * 1000) {
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

// 게시글 수정
router.put('/posts/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const { title, content, category } = req.body;
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
      return res.status(403).json({ error: '게시글을 수정할 권한이 없습니다.' });
    }

    await db.query(
      `UPDATE posts SET title = ?, content = ?, category = ? WHERE post_id = ?`,
      [title, content, category, postId]
    );

    res.json({ message: '게시글 수정 완료' });
  } catch (err) {
    console.error('🔥 게시글 수정 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// 게시글 삭제
router.delete('/posts/:id', authenticateToken, async (req, res) => {
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
      return res.status(403).json({ error: '게시글을 삭제할 권한이 없습니다.' });
    }

    await db.query('DELETE FROM posts WHERE post_id = ?', [postId]);
    res.json({ message: '게시글 삭제 완료' });
  } catch (err) {
    console.error('🔥 게시글 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// 게시글 좋아요
router.post('/posts/:id/like', authenticateToken, async (req, res) => {
  const post_id = req.params.id;
  const user_id = req.user.user_id;

  try {
    const [rows] = await db.query(
      'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?',
      [user_id, post_id]
    );
    if (rows.length > 0) {
      return res.status(400).json({ error: '이미 좋아요한 게시글입니다.' });
    }

    await db.query('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [user_id, post_id]);
    await db.query('UPDATE posts SET likes = likes + 1 WHERE post_id = ?', [post_id]);

    res.json({ message: '좋아요 완료' });
  } catch (err) {
    console.error('🔥 좋아요 처리 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// 공감 취소 (공감했던 사용자가 다시 누르면 취소)
router.delete('/posts/:id/like', authenticateToken, async (req, res) => {
  const post_id = req.params.id;
  const user_id = req.user.user_id;

  try {
    // 공감 여부 확인
    const [rows] = await db.query(
      'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?',
      [user_id, post_id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: '공감하지 않은 게시글입니다.' });
    }

    // 삭제 및 카운트 감소
    await db.query('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [user_id, post_id]);
    await db.query('UPDATE posts SET likes = likes - 1 WHERE post_id = ?', [post_id]);

    res.json({ message: '공감 취소 완료' });
  } catch (err) {
    console.error('🔥 공감 취소 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// GET /posts/:id/like-check
router.get('/posts/:id/like-check', authenticateToken, async (req, res) => {
  const post_id = req.params.id;
  const user_id = req.user.user_id;

  const [rows] = await db.query(
    'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?',
    [user_id, post_id]
  );

  res.json({ liked: rows.length > 0 });
});

router.get('/', authenticateToken, async (req, res) => {
  const { user_id } = req.user;
  const search = req.query.search;

  try {
    const [created] = await db.query(
      'SELECT classroom_id FROM classrooms WHERE teacher_id = ?',
      [user_id]
    );
    const createdClassroomIds = created.map(c => c.classroom_id);

    const [userRows] = await db.query(
      'SELECT classroom_id FROM users WHERE user_id = ?',
      [user_id]
    );
    const joinedClassroomId = userRows[0]?.classroom_id;

    if (!joinedClassroomId && createdClassroomIds.length === 0) {
      return res.status(400).json({ error: '학급에 가입되어 있지 않습니다.' });
    }

    const allVisibleClassroomIds = [...createdClassroomIds];
    if (joinedClassroomId) allVisibleClassroomIds.push(joinedClassroomId);

    // 🔍 검색어 조건
    let query = `
      SELECT * FROM posts 
      WHERE (classroom_id IN (?) OR school_wide = TRUE)
    `;
    const params = [allVisibleClassroomIds];

    if (search) {
      query += ` AND (title LIKE ? OR content LIKE ?)`;
      const likeKeyword = `%${search}%`;
      params.push(likeKeyword, likeKeyword);
    }

    query += ` ORDER BY created_at DESC`;

    const [postRows] = await db.query(query, params);

    res.json({ posts: postRows });
  } catch (err) {
    console.error('🔥 게시글 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

module.exports = router;
