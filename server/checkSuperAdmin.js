module.exports = function checkSuperAdmin(req, res, next) {
    // 개발자 전용: user_id === 1만 허용 (예시)
    if (!req.user || req.user.user_id !== 1) {
      return res.status(403).json({ error: '개발자 권한이 필요합니다.' });
    }
    next();
  };
  