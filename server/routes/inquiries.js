const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');
const checkSuperAdmin = require('../checkSuperAdmin');
const { createNotification } = require('../utils/notify');

// ✅ 문의사항 작성
router.post('/', authenticateToken, async (req, res) => {
  const { title, content, category = 'general' } = req.body;
  const { user_id } = req.user;

  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO inquiries (user_id, title, content, category, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [user_id, title, content, category]
    );

    const inquiryId = result.insertId;

    // SuperAdmin에게 알림 전송
    const [superAdmins] = await db.query(
      'SELECT user_id FROM users WHERE role = "superadmin"'
    );

    for (const admin of superAdmins) {
      await createNotification({
        userId: admin.user_id,
        type: 'inquiry',
        relatedId: inquiryId,
        message: `새 문의사항이 등록되었습니다: "${title}"`
      });
    }

    res.json({ 
      message: '문의사항이 등록되었습니다.',
      inquiry_id: inquiryId 
    });
  } catch (err) {
    console.error('🔥 문의사항 작성 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 내 문의사항 목록 조회
router.get('/my', authenticateToken, async (req, res) => {
  const { user_id } = req.user;

  try {
    const [inquiries] = await db.query(
      `SELECT inquiry_id, title, content, category, status, created_at, 
              admin_response, responded_at
       FROM inquiries 
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [user_id]
    );

    res.json({ inquiries });
  } catch (err) {
    console.error('🔥 문의사항 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ 문의사항 상세 조회
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { user_id, role } = req.user;

  try {
    const [inquiries] = await db.query(
      `SELECT i.*, u.name as user_name, u.email as user_email,
              admin_u.name as admin_name
       FROM inquiries i
       JOIN users u ON i.user_id = u.user_id
       LEFT JOIN users admin_u ON i.admin_user_id = admin_u.user_id
       WHERE i.inquiry_id = ?`,
      [id]
    );

    if (inquiries.length === 0) {
      return res.status(404).json({ error: '문의사항을 찾을 수 없습니다.' });
    }

    const inquiry = inquiries[0];

    // 권한 체크: 작성자이거나 SuperAdmin만 조회 가능
    if (inquiry.user_id !== user_id && role !== 'superadmin') {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    res.json({ inquiry });
  } catch (err) {
    console.error('🔥 문의사항 상세 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ SuperAdmin 전용: 모든 문의사항 조회
router.get('/', authenticateToken, checkSuperAdmin, async (req, res) => {
  const { status, category, page = 1, limit = 20 } = req.query;

  try {
    let query = `
      SELECT i.inquiry_id, i.title, i.content, i.category, i.status, 
             i.created_at, i.updated_at, i.admin_response,
             u.name as user_name, u.email as user_email,
             admin_u.name as admin_name
      FROM inquiries i
      JOIN users u ON i.user_id = u.user_id
      LEFT JOIN users admin_u ON i.admin_user_id = admin_u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND i.status = ?`;
      params.push(status);
    }

    if (category) {
      query += ` AND i.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY i.created_at DESC`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [inquiries] = await db.query(query, params);

    // 전체 개수 조회
    let countQuery = `SELECT COUNT(*) as total FROM inquiries WHERE 1=1`;
    const countParams = [];

    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }

    if (category) {
      countQuery += ` AND category = ?`;
      countParams.push(category);
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({ 
      inquiries, 
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('🔥 문의사항 목록 조회 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ SuperAdmin 전용: 문의사항 답변
router.patch('/:id/respond', authenticateToken, checkSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { response, status = 'resolved' } = req.body;
  const { user_id: admin_user_id } = req.user;

  if (!response) {
    return res.status(400).json({ error: '답변 내용이 필요합니다.' });
  }

  try {
    // 문의사항 존재 확인
    const [inquiries] = await db.query(
      'SELECT user_id, title FROM inquiries WHERE inquiry_id = ?',
      [id]
    );

    if (inquiries.length === 0) {
      return res.status(404).json({ error: '문의사항을 찾을 수 없습니다.' });
    }

    const { user_id: inquirer_id, title } = inquiries[0];

    // 답변 저장
    await db.query(
      `UPDATE inquiries 
       SET admin_response = ?, status = ?, admin_user_id = ?, 
           responded_at = NOW(), updated_at = NOW()
       WHERE inquiry_id = ?`,
      [response, status, admin_user_id, id]
    );

    // 문의자에게 알림 전송
    await createNotification({
      userId: inquirer_id,
      type: 'inquiry',
      relatedId: id,
      message: `문의사항에 답변이 등록되었습니다: "${title}"`
    });

    res.json({ message: '답변이 등록되었습니다.' });
  } catch (err) {
    console.error('🔥 문의사항 답변 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

// ✅ SuperAdmin 전용: 문의사항 상태 변경
router.patch('/:id/status', authenticateToken, checkSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  }

  try {
    await db.query(
      'UPDATE inquiries SET status = ?, updated_at = NOW() WHERE inquiry_id = ?',
      [status, id]
    );

    res.json({ message: '상태가 변경되었습니다.' });
  } catch (err) {
    console.error('🔥 문의사항 상태 변경 오류:', err);
    res.status(500).json({ error: '서버 오류', details: err.message });
  }
});

module.exports = router;