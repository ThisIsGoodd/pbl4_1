/**
 * JWT 토큰을 파싱하여 payload 반환
 * @param {string} token - JWT 토큰
 * @returns {object|null} - 파싱된 payload 또는 null
 */
export const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

/**
 * 로컬스토리지에서 토큰 가져오기
 * @returns {string|null} - 토큰 또는 null
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * 토큰에서 사용자 정보 추출
 * @returns {object|null} - 사용자 정보 또는 null
 */
export const getCurrentUser = () => {
  const token = getToken();
  if (!token) return null;
  return parseJwt(token);
};

/**
 * 사용자 ID 가져오기
 * @returns {number|null} - 사용자 ID 또는 null
 */
export const getCurrentUserId = () => {
  const user = getCurrentUser();
  return user?.user_id || null;
};

/**
 * 사용자 역할 가져오기
 * @returns {string|null} - 사용자 역할 또는 null
 */
export const getCurrentUserRole = () => {
  const user = getCurrentUser();
  return user?.role || null;
};

/**
 * 사용자가 관리자인지 확인
 * @returns {boolean} - 관리자 여부
 */
export const isAdmin = () => {
  const user = getCurrentUser();
  return user?.is_admin === true || user?.is_admin === 1;
};

/**
 * 사용자의 학교 ID 가져오기
 * @returns {number|null} - 학교 ID 또는 null
 */
export const getUserSchoolId = () => {
  const user = getCurrentUser();
  return user?.school_id || null;
};