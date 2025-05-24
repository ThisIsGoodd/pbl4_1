const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const { createNotification } = require('../utils/notify');

/**
 * ✅ 댓글 조회 (특정 게시글의 모든 댓글)
 */
router.get('/posts/:postId', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  
  try {
    const [comments] = await db.query(
      `SELECT comments.*, users.name AS author_name
       FROM comments
       JOIN users ON comments.author_id = users.user_id
       WHERE comments.post_id = ?
       ORDER BY comments.created_at ASC`,
      [postId]
    );

    res.json({ comments });
  } catch (err) {
    console.error('🔥 댓글 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

/**
 * ✅ 댓글 작성 (게시글 제목 포함 알림)
 */
router.post('/posts/:postId', authenticateToken, async (req, res) => {
  const { postId } = req.params;
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

/**
 * ✅ 댓글 수정
 */
router.patch('/:commentId', authenticateToken, async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user.user_id;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: '댓글 내용이 비어있습니다.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM comments WHERE comment_id = ?',
      [commentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '댓글이 존재하지 않습니다.' });
    }

    const comment = rows[0];
    if (comment.author_id !== userId) {
      return res.status(403).json({ error: '본인의 댓글만 수정할 수 있습니다.' });
    }

    await db.query(
      'UPDATE comments SET content = ? WHERE comment_id = ?',
      [content, commentId]
    );

    res.json({ message: '댓글 수정 완료' });
  } catch (err) {
    console.error('🔥 댓글 수정 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

/**
 * ✅ 댓글 삭제
 */
router.delete('/:commentId', authenticateToken, async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.user_id;

  try {
    const [rows] = await db.query(
      'SELECT * FROM comments WHERE comment_id = ?',
      [commentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '댓글이 존재하지 않습니다.' });
    }

    const comment = rows[0];
    if (comment.author_id !== userId) {
      return res.status(403).json({ error: '본인의 댓글만 삭제할 수 있습니다.' });
    }

    await db.query('DELETE FROM comments WHERE comment_id = ?', [commentId]);
    res.json({ message: '댓글 삭제 완료' });
  } catch (err) {
    console.error('🔥 댓글 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

module.exports = router;