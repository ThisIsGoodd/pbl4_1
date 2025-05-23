module.exports = function checkSuperAdmin(req, res, next) {
  console.log('🔍 [checkSuperAdmin] req.user:', req.user);

  if (!req.user || req.user.role !== 'superadmin') {
    console.log('❌ [checkSuperAdmin] 권한 없음');
    return res.status(403).json({ error: '개발자 권한이 필요합니다.' });
  }

  console.log('✅ [checkSuperAdmin] 권한 확인 완료');
  next();
};
