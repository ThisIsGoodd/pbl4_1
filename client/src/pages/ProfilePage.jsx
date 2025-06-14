// client/src/pages/ProfilePage.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken } from '../utils/jwt';
import { AuthContext } from '../contexts/AuthContext';

function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [childName, setChildName] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 추가: 학교 생성자 여부 확인
  const [isSchoolCreator, setIsSchoolCreator] = useState(false);
  
  // 알림 설정 상태
  const [notificationSettings, setNotificationSettings] = useState({
    post_alert: true,
    schedule_alert: true,
    chat_alert: true,
  });

  // DND 시간 설정
  const [chatDndStart, setChatDndStart] = useState('');
  const [chatDndEnd, setChatDndEnd] = useState('');

  const token = getToken();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.user);
        setName(res.data.user.name);
        setChildName(res.data.user.child_name || '');
        setChatDndStart(res.data.user.chat_dnd_start || '');
        setChatDndEnd(res.data.user.chat_dnd_end || '');
        
        if (res.data.user.profile_picture) {
          setPreview(`http://localhost:3001${res.data.user.profile_picture}`);
        }
      } catch (err) {
        console.error('❌ 프로필 호출 실패:', err);
        alert('프로필 불러오기 실패');
      }
    };

    const fetchNotificationSettings = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/notification-settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.settings) {
          setNotificationSettings(res.data.settings);
        }
      } catch (err) {
        console.error('❌ 알림 설정 호출 실패:', err);
      }
    };

    fetchProfile();
    fetchNotificationSettings();
  }, [token]);

  // 추가: 학교 생성자 여부 확인
  useEffect(() => {
    const checkSchoolCreator = async () => {
      if (!user?.is_admin || !user?.school_id) return;
      
      try {
        const res = await axios.get(`http://localhost:3001/api/schools/${user.school_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // 학교 생성자인지 확인
        setIsSchoolCreator(res.data.created_by === user.user_id);
      } catch (err) {
        console.error('학교 정보 조회 실패:', err);
      }
    };

    checkSchoolCreator();
  }, [user, token]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB 제한
      alert('이미지는 5MB 이하로 업로드해주세요.');
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleNotificationToggle = (type) => {
    setNotificationSettings(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // ProfilePage.jsx - handleSave 함수 수정

  const handleSave = async () => {
    try {
      setLoading(true);
      console.log('📝 프로필 업데이트 시작');

      // 🔥 FormData 생성 및 필드명 수정
      const formData = new FormData();
      formData.append('name', name);
      
      if (user.role === 'parent') {
        formData.append('child_name', childName);
      }
      
      // 🔥 필드명 수정: image → profile_picture
      if (image) {
        formData.append('profile_picture', image);
        console.log('📷 프로필 사진 포함:', image.name);
      }
      
      formData.append('chat_dnd_start', chatDndStart);
      formData.append('chat_dnd_end', chatDndEnd);

      // FormData 내용 로깅
      console.log('📦 FormData 내용:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }

      // 🔥 HTTP 메서드 수정: PUT → PATCH
      const profileRes = await axios.patch('http://localhost:3001/api/users/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('✅ 프로필 업데이트 성공:', profileRes.data);

      // 알림 설정 업데이트 (선택사항)
      try {
        await axios.put('http://localhost:3001/api/notification-settings', notificationSettings, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('✅ 알림 설정 업데이트 성공');
      } catch (notifErr) {
        console.warn('⚠️ 알림 설정 업데이트 실패 (무시):', notifErr);
      }

      alert('프로필이 성공적으로 업데이트되었습니다!');
      
      // 🔥 페이지 새로고침하여 최신 정보 반영
      window.location.reload();

    } catch (err) {
      console.error('❌ 프로필 업데이트 실패:', err);
      
      // 상세 에러 정보 로깅
      if (err.response) {
        console.error('응답 상태:', err.response.status);
        console.error('응답 데이터:', err.response.data);
        alert(`프로필 업데이트에 실패했습니다: ${err.response.data.error || '알 수 없는 오류'}`);
      } else if (err.request) {
        console.error('요청 실패:', err.request);
        alert('서버에 연결할 수 없습니다.');
      } else {
        console.error('오류:', err.message);
        alert('프로필 업데이트 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('정말 로그아웃 하시겠습니까?')) {
      logout();
    }
  };

  // 회원 탈퇴 함수 추가
  const handleDeleteAccount = async () => {
    if (!window.confirm('정말로 회원 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.')) {
      return;
    }

    const confirmText = '회원탈퇴';
    const userInput = prompt(`회원 탈퇴를 진행하려면 "${confirmText}"를 정확히 입력하세요:`);
    
    if (userInput !== confirmText) {
      alert('입력이 일치하지 않습니다.');
      return;
    }

    try {
      const res = await axios.delete('http://localhost:3001/api/users/delete-account', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 200) {
        alert('회원 탈퇴가 완료되었습니다.');
        logout();
      }
    } catch (err) {
      console.error('❌ 회원 탈퇴 실패:', err);
      alert('회원 탈퇴에 실패했습니다.');
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      parent: '학부모',
      teacher: '교사',
      superadmin: '슈퍼관리자'
    };
    return roleNames[role] || role;
  };

  if (!user) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>프로필을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1>⚙️ 프로필 설정</h1>
          <p>개인정보와 알림 설정을 관리하세요</p>
          <div className="user-info">
            <span className="role">{getRoleDisplayName(user.role)}</span>
            {user.is_admin === true && <span className="admin">관리자</span>}
          </div>
        </div>

        {/* 빠른 이동 버튼들 */}
        <div className="quick-actions">
          {/* 교사가 아닌 경우에만 학급 목록 버튼 표시 */}
          {user.role !== 'teacher' && (
            <button 
              onClick={() => navigate('/classroom/list')}
              className="action-btn"
            >
              📚 학급 목록
            </button>
          )}
          
          {user.is_admin === true && (
            <button 
              onClick={() => navigate('/admindashboard')}
              className="action-btn"
            >
              🏫 관리자 대시보드
            </button>
          )}
          
          <button 
            onClick={() => navigate('/notifications')}
            className="action-btn"
          >
            🔔 알림
          </button>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="content">
          {/* 기본 정보 */}
          <div className="section">
            <h3>👤 기본 정보</h3>
            
            <div className="form-group">
              <label>이름 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                required
              />
            </div>

            {user.role === 'parent' && (
              <div className="form-group">
                <label>자녀 이름 *</label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="자녀 이름을 입력하세요"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>프로필 사진 (5MB 이하)</label>
              <div className="image-upload">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  id="profile-image"
                  style={{ display: 'none' }}
                />
                <label htmlFor="profile-image" className="image-label">
                  {preview ? (
                    <img src={preview} alt="프로필 미리보기" className="preview" />
                  ) : (
                    <div className="empty-image">
                      <span>📷</span>
                      <p>이미지 선택</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* 알림 설정 */}
          <div className="section">
            <h3>🔔 알림 설정</h3>
            
            <div className="setting-item">
              <div className="setting-info">
                <span>게시글 알림</span>
                <small>새로운 게시글이 올라올 때</small>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={notificationSettings.post_alert}
                  onChange={() => handleNotificationToggle('post_alert')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span>일정 알림</span>
                <small>새로운 일정이 등록될 때</small>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={notificationSettings.schedule_alert}
                  onChange={() => handleNotificationToggle('schedule_alert')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span>채팅 알림</span>
                <small>새로운 메시지가 올 때</small>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={notificationSettings.chat_alert}
                  onChange={() => handleNotificationToggle('chat_alert')}
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* DND 시간 설정 */}
            <div className="dnd-section">
              <h4>방해금지 시간</h4>
              <div className="time-inputs">
                <div className="time-group">
                  <label>시작 시간</label>
                  <input
                    type="time"
                    value={chatDndStart}
                    onChange={(e) => setChatDndStart(e.target.value)}
                  />
                </div>
                <div className="time-group">
                  <label>종료 시간</label>
                  <input
                    type="time"
                    value={chatDndEnd}
                    onChange={(e) => setChatDndEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 저장, 로그아웃, 회원 탈퇴 */}
          <div className="actions">
            <button 
              onClick={handleSave} 
              disabled={loading}
              className="save-btn"
            >
              {loading ? '저장 중...' : '💾 저장하기'}
            </button>
            
            <button 
              onClick={handleLogout}
              className="logout-btn"
            >
              🚪 로그아웃
            </button>

            {/* 회원 탈퇴 버튼 추가 */}
            <button 
              onClick={handleDeleteAccount}
              className="delete-account-btn"
            >
              🗑️ 회원 탈퇴
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
        }

        .header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 1rem;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.8rem;
          color: #333;
        }

        .header p {
          margin: 0 0 1rem 0;
          color: #666;
        }

        .user-info {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
        }

        .role, .admin {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .role {
          background: #e0e7ff;
          color: #3730a3;
        }

        .admin {
          background: #fef3c7;
          color: #92400e;
        }

        .quick-actions {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .action-btn {
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .action-btn:hover {
          background: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .section h3 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1.1rem;
        }

        .section h4 {
          margin: 1rem 0 0.5rem 0;
          color: #555;
          font-size: 1rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #555;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .form-group input:focus {
          outline: none;
          border-color: #4f46e5;
        }

        .image-upload {
          display: flex;
          justify-content: center;
        }

        .image-label {
          cursor: pointer;
          display: block;
        }

        .preview {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #4f46e5;
        }

        .empty-image {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 2px dashed #ccc;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #999;
        }

        .empty-image span {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-info span {
          display: block;
          font-weight: 500;
          color: #333;
        }

        .setting-info small {
          color: #666;
          font-size: 0.8rem;
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.4s;
          border-radius: 24px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #4f46e5;
        }

        input:checked + .slider:before {
          transform: translateX(26px);
        }

        .dnd-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #f0f0f0;
        }

        .time-inputs {
          display: flex;
          gap: 1rem;
        }

        .time-group {
          flex: 1;
        }

        .time-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #555;
          font-weight: 500;
        }

        .time-group input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
        }

        .actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .save-btn, .logout-btn, .delete-account-btn {
          flex: 1;
          min-width: 120px;
          padding: 1rem;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .save-btn {
          background: #4f46e5;
          color: white;
        }

        .save-btn:hover:not(:disabled) {
          background: #4338ca;
          transform: translateY(-2px);
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .logout-btn {
          background: #ef4444;
          color: white;
        }

        .logout-btn:hover {
          background: #dc2626;
          transform: translateY(-2px);
        }

        .delete-account-btn {
          background: #991b1b;
          color: white;
        }

        .delete-account-btn:hover {
          background: #7f1d1d;
          transform: translateY(-2px);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          color: white;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .container {
            padding: 0.5rem;
          }

          .header {
            padding: 1.5rem;
          }

          .header h1 {
            font-size: 1.5rem;
          }

          .section {
            padding: 1rem;
          }

          .time-inputs {
            flex-direction: column;
          }

          .actions {
            flex-direction: column;
          }

          .quick-actions {
            justify-content: center;
          }
        }

        /* 다크모드 대응 */
        @media (prefers-color-scheme: dark) {
          .header, .section {
            background: rgba(30, 30, 30, 0.95);
            color: #e5e7eb;
          }

          .header h1, .section h3 {
            color: #f9fafb;
          }

          .header p {
            color: #9ca3af;
          }

          .form-group label, .setting-info span {
            color: #d1d5db;
          }

          .setting-info small {
            color: #9ca3af;
          }

          .form-group input, .time-group input {
            background: #374151;
            border-color: #4b5563;
            color: #f9fafb;
          }

          .action-btn {
            background: rgba(55, 65, 81, 0.9);
            color: #e5e7eb;
          }

          .action-btn:hover {
            background: #4b5563;
          }
        }
      `}</style>
    </div>
  );
}

export default ProfilePage;