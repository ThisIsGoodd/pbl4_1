const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ error: '토큰이 없습니다.' });
  }

  const token = authHeader.split(' ')[1]; // "Bearer 토큰값" 형식에서 토큰만 분리

  if (!token) {
    return res.status(401).json({ error: '토큰이 없습니다.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT 검증 실패:', err);
      return res.status(403).json({ error: '토큰이 유효하지 않습니다.' });
    }
    req.user = user; // 디코딩된 사용자 정보를 저장
    next();
  });
};

module.exports = authenticateToken;
