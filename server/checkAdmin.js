module.exports = function checkAdmin(req, res, next) {
    if (!req.user || req.user.is_admin !== 1) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    next();
  };