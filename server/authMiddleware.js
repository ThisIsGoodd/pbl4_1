const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('🔍 [auth] Authorization 헤더:', authHeader);

  if (!authHeader) {
    console.log('❌ [auth] 토큰 없음');
    return res.status(401).json({ error: '토큰이 없습니다.' });
  }

  const token = authHeader.split(' ')[1];
  console.log('🔍 [auth] 토큰:', token);

  if (!token) {
    console.log('❌ [auth] 토큰 분리 실패');
    return res.status(401).json({ error: '토큰이 없습니다.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('❌ [auth] JWT 검증 실패:', err);
      return res.status(403).json({ error: '토큰이 유효하지 않습니다.' });
    }
    console.log('✅ [auth] 사용자 인증 완료:', user);
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
