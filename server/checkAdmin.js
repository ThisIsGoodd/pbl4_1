module.exports = function checkAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'teacher' || !req.user.is_admin) {
    return res.status(403).json({ error: '전체 관리자 권한이 필요합니다.' });
  }
  next();
};
