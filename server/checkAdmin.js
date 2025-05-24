// server/checkAdmin.js
module.exports = function checkAdmin(req, res, next) {
  console.log('🔍 [checkAdmin] 사용자 정보:', req.user);
  
  if (!req.user) {
    return res.status(403).json({ error: '인증이 필요합니다.' });
  }

  // teacher 역할이면서 is_admin이 true인 경우만 통과
  if (req.user.role !== 'teacher' || !req.user.is_admin) {
    console.log('❌ [checkAdmin] 권한 부족:', {
      role: req.user.role,
      is_admin: req.user.is_admin
    });
    return res.status(403).json({ error: '전체 관리자 권한이 필요합니다.' });
  }

  console.log('✅ [checkAdmin] 권한 확인 완료');
  next();
};