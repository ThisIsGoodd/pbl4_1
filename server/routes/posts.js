const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createNotification } = require('../utils/notify');

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
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

//✅ 게시글 작성
router.post('/', authenticateToken, upload.array('files', 10), async (req, res) => {
  const { classroom_id, school_wide, title, content } = req.body;
  const { user_id, role } = req.user;
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
    let school_id = null;
    if (school_wide === 'true' || school_wide === true) {
      const [[schoolRow]] = await db.query(
        'SELECT school_id FROM user_schools WHERE user_id = ? AND role = "teacher" LIMIT 1',
        [user_id]
      );
      if (!schoolRow) return res.status(400).json({ error: '학교 정보 없음' });
      school_id = schoolRow.school_id;
    }

    // 게시글 저장 (category는 기본값 '공지사항'으로 설정)
    const [result] = await db.query(
      `INSERT INTO posts 
        (author_id, title, content, category, created_at, views, classroom_id, school_id, school_wide, likes) 
        VALUES (?, ?, ?, ?, NOW(), 0, ?, ?, ?, 0)`,
      [user_id, title, content, '공지사항', classroom_id || null, school_id, school_wide === 'true']
    );

    const postId = result.insertId;
    console.log('✅ 게시글 저장 완료, ID:', postId);

    // 첨부파일 저장
    for (const file of files) {
      await db.query(
        `INSERT INTO attachments (post_id, original_name, file_path, uploaded_at)
         VALUES (?, ?, ?, NOW())`,
        [postId, file.originalname, `/uploads/${file.filename}`]
      );
    }
    console.log('✅ 첨부파일 저장 완료:', files.length, '개');

    // 알림 전송 (classroom_id가 있을 때만)
    if (classroom_id) {
      const [classUsers] = await db.query(
        'SELECT user_id FROM users WHERE classroom_id = ? AND user_id != ?',
        [classroom_id, user_id]
      );

      for (const u of classUsers) {
        await createNotification({
          userId: u.user_id,
          classroomId: classroom_id,
          type: 'post',
          relatedId: postId,
          message: '새 공지사항이 등록되었습니다.'
        });
      }
      console.log('✅ 알림 전송 완료:', classUsers.length, '명');
    }

    res.json({ message: '게시글 작성 완료', post_id: postId });
  } catch (err) {
    console.error('🔥 게시글 작성 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

/**
 * ✅ 게시글 목록 조회
 */
router.get('/', authenticateToken, async (req, res) => {
  const { user_id } = req.user;
  const { search, classroom_id } = req.query;

  if (!classroom_id) {
    return res.status(400).json({ error: 'classroom_id가 필요합니다.' });
  }

  try {
    const [[schoolRow]] = await db.query(
      'SELECT school_id FROM user_schools WHERE user_id = ? LIMIT 1',
      [user_id]
    );
    const school_id = schoolRow?.school_id || null;

    let query = `
      SELECT posts.*, users.name AS author_name
      FROM posts
      JOIN users ON posts.author_id = users.user_id
      WHERE (classroom_id = ? OR (school_id = ? AND school_wide = TRUE))
    `;
    const params = [classroom_id, school_id];

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

//✅ 게시글 상세 조회
router.get('/posts/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;

  try {
    // 게시글 + 작성자 정보 가져오기
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

    const post = rows[0];

    // 첨부파일 목록 가져오기
    const [attachments] = await db.query(
      `SELECT attachment_id, original_name, file_path
       FROM attachments
       WHERE post_id = ?`,
      [postId]
    );

    res.json({ post, attachments });
  } catch (err) {
    console.error('🔥 게시글 상세 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

/**
 * ✅ 조회수 증가 (10분 제한)
 */
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
router.put('/posts/:id', authenticateToken, async (req, res) => {
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
router.post('/posts/:id/like', authenticateToken, async (req, res) => {
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
router.delete('/posts/:id/like', authenticateToken, async (req, res) => {
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
router.get('/posts/:id/like-check', authenticateToken, async (req, res) => {
  const post_id = req.params.id;
  const user_id = req.user.user_id;

  const [rows] = await db.query(
    'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?',
    [user_id, post_id]
  );

  res.json({ liked: rows.length > 0 });
});

module.exports = router;
