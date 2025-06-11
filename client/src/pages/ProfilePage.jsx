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
  
  // 🔥 추가: 학교 생성자 여부 확인
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

  // 🔥 추가: 학교 생성자 여부 확인
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
    
    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    if (user.role === 'parent' && !childName.trim()) {
      alert('자녀 이름을 입력해주세요.');
      return;
    }

    // DND 시간 검증
    if (user.role === 'teacher' && chatDndStart && chatDndEnd) {
      if (chatDndStart >= chatDndEnd) {
        alert('방해금지 종료 시간은 시작 시간보다 늦어야 합니다.');
        return;
      }
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      if (user.role === 'parent') {
        formData.append('child_name', childName);
      }
      if (user.role === 'teacher') {
        formData.append('chat_dnd_start', chatDndStart);
        formData.append('chat_dnd_end', chatDndEnd);
      }
      if (image) {
        formData.append('profile_picture', image);
      }

      const response = await axios.put('http://localhost:3001/api/users/profile', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      // 알림 설정 저장
      await axios.put('http://localhost:3001/api/notification-settings', notificationSettings, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert('프로필이 성공적으로 업데이트되었습니다!');
      
      // 사용자 정보 새로고침
      const updatedUser = await axios.get('http://localhost:3001/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(updatedUser.data.user);

    } catch (err) {
      console.error('❌ 프로필 업데이트 실패:', err);
      alert(err.response?.data?.error || '프로필 업데이트에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('정말로 회원탈퇴를 하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      await axios.delete('http://localhost:3001/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert('회원탈퇴가 완료되었습니다.');
      logout();
      navigate('/');
    } catch (err) {
      console.error('❌ 회원탈퇴 실패:', err);
      alert(err.response?.data?.error || '회원탈퇴에 실패했습니다.');
    }
  };

  const handleDeleteSchool = async () => {
    if (!window.confirm('정말로 학교를 삭제하시겠습니까? 모든 데이터가 삭제됩니다.')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3001/api/schools/${user.school_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert('학교가 성공적으로 삭제되었습니다.');
      logout();
      navigate('/');
    } catch (err) {
      console.error('❌ 학교 삭제 실패:', err);
      alert(err.response?.data?.error || '학교 삭제에 실패했습니다.');
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'teacher': return '선생님';
      case 'parent': return '학부모';
      case 'student': return '학생';
      default: return role;
    }
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>프로필을 불러오는 중...</p>
        </div>

        <style jsx>{`
          .profile-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 2rem;
            color: white;
            text-align: center;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="header-content">
            <div className="title-section">
              <h1 className="page-title">
                ⚙️ 프로필 설정
              </h1>
              <p className="page-subtitle">
                개인정보와 알림 설정을 관리하세요
              </p>
            </div>
            <div className="user-badge">
              <span className="role-badge">{getRoleDisplayName(user.role)}</span>
              {user.is_admin === true && <span className="admin-badge">관리자</span>}
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="content-grid">
          {/* 왼쪽 컬럼 - 기본 정보 */}
          <div className="left-column">
            {/* 기본 정보 섹션 */}
            <div className="section">
              <h3 className="section-title">
                <span className="section-icon">👤</span>
                기본 정보
              </h3>
              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">이름</span>
                  <span className="label-required">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  placeholder="이름을 입력하세요"
                  required
                />
              </div>

              {user.role === 'parent' && (
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-text">자녀 이름</span>
                    <span className="label-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    className="form-input"
                    placeholder="자녀 이름을 입력하세요"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">프로필 사진</span>
                  <span className="label-optional">(5MB 이하)</span>
                </label>
                <div className="image-upload-area">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    className="file-input"
                    id="profile-image"
                  />
                  <label htmlFor="profile-image" className="image-upload-label">
                    {preview ? (
                      <div className="image-preview">
                        <img src={preview} alt="프로필 미리보기" className="preview-image" />
                        <div className="image-overlay">
                          <span className="change-text">📷 변경</span>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-image">
                        <span className="upload-icon">📷</span>
                        <span className="upload-text">사진 업로드</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* 학부모 전용 - 학급 관리 */}
            {user.role === 'parent' && (
              <div className="section">
                <h3 className="section-title">
                  <span className="section-icon">🏫</span>
                  학급 관리
                </h3>
                <button
                  onClick={() => navigate('/join/invite')}
                  className="classroom-manage-button"
                >
                  <div className="button-content">
                    <div className="button-icon">📚</div>
                    <div className="button-text">
                      <div className="button-title">내 학급 관리</div>
                      <div className="button-desc">가입한 학급 보기 및 추가 가입</div>
                    </div>
                    <div className="button-arrow">›</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 오른쪽 컬럼 - 설정 */}
          <div className="right-column">
            {/* 알림 설정 */}
            <div className="section">
              <h3 className="section-title">
                <span className="section-icon">🔔</span>
                알림 설정
              </h3>
              <div className="notification-settings">
                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-name">공지사항 알림</span>
                    <span className="setting-desc">새로운 공지사항이 등록되면 알림</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notificationSettings.post_alert}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        post_alert: e.target.checked
                      }))}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-name">일정 알림</span>
                    <span className="setting-desc">새로운 일정이 등록되면 알림</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notificationSettings.schedule_alert}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        schedule_alert: e.target.checked
                      }))}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-name">채팅 알림</span>
                    <span className="setting-desc">새로운 채팅 메시지가 오면 알림</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notificationSettings.chat_alert}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        chat_alert: e.target.checked
                      }))}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* 선생님 전용 - 방해금지 시간 */}
            {user.role === 'teacher' && (
              <div className="section">
                <h3 className="section-title">
                  <span className="section-icon">🔕</span>
                  채팅 방해금지 시간
                </h3>
                <p className="section-description">
                  지정된 시간에는 채팅 알림을 받지 않습니다.
                </p>
                <div className="time-settings">
                  <div className="time-group">
                    <label className="form-label">시작 시간</label>
                    <input
                      type="time"
                      value={chatDndStart}
                      onChange={(e) => setChatDndStart(e.target.value)}
                      className="time-input"
                    />
                  </div>
                  <div className="time-separator">~</div>
                  <div className="time-group">
                    <label className="form-label">종료 시간</label>
                    <input
                      type="time"
                      value={chatDndEnd}
                      onChange={(e) => setChatDndEnd(e.target.value)}
                      className="time-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 위험 영역 */}
            <div className="danger-section">
              <h3 className="danger-title">
                <span className="danger-icon">⚠️</span>
                위험 영역
              </h3>
              <p className="danger-description">
                아래 작업들은 되돌릴 수 없습니다. 신중하게 결정해주세요.
              </p>
              
              <div className="danger-actions">
                {/* 학교 생성자만 학교 삭제 버튼 표시 */}
                {user.is_admin === true && user.school_id && isSchoolCreator && (
                  <button
                    onClick={handleDeleteSchool}
                    className="danger-button school-delete"
                  >
                    <span className="button-icon">🏫</span>
                    학교 삭제 (생성자만)
                  </button>
                )}
                
                {/* 모든 사용자: 회원 탈퇴 */}
                <button 
                  onClick={handleDeleteAccount}
                  className="danger-button account-delete"
                >
                  <span className="button-icon">👋</span>
                  회원 탈퇴
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="save-section">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="save-button"
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                저장 중...
              </>
            ) : (
              <>
                <span className="button-icon">💾</span>
                저장하기
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        /* CSS 변수 정의 */
        .profile-page {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-glass: rgba(255, 255, 255, 0.95);
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --border-color: #e2e8f0;
          --accent-color: #4f46e5;
          --accent-hover: #4338ca;
          --success-color: #10b981;
          --warning-color: #f59e0b;
          --error-color: #ef4444;
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 20px;
        }

        .profile-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        /* 헤더 */
        .header {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-xl);
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-xl);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .title-section {
          flex: 1;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 0.5rem 0;
        }

        .page-subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
          margin: 0;
          font-weight: 500;
        }

        .user-badge {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .role-badge {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.875rem;
        }

        .admin-badge {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.875rem;
        }

        /* 컨텐츠 그리드 */
        .content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .left-column,
        .right-column {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* 섹션 스타일 */
        .section {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-lg);
          padding: 2rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(255, 255, 255, 0.3);
          animation: slideUp 0.6s ease-out;
        }

        .section-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 1.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .section-icon {
          font-size: 1.4rem;
        }

        .section-description {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        /* 폼 요소 */
        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .label-text {
          font-size: 0.95rem;
        }

        .label-required {
          color: var(--error-color);
          font-weight: 700;
        }

        .label-optional {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 400;
        }

        .form-input {
          width: 100%;
          padding: 0.875rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 1rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        /* 이미지 업로드 */
        .image-upload-area {
          position: relative;
        }

        .file-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .image-upload-label {
          display: block;
          cursor: pointer;
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .image-upload-label:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .image-preview {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto;
        }

        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          border: 3px solid var(--border-color);
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .image-upload-label:hover .image-overlay {
          opacity: 1;
        }

        .change-text {
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .empty-image {
          width: 120px;
          height: 120px;
          margin: 0 auto;
          border: 2px dashed var(--border-color);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: var(--bg-secondary);
          transition: all 0.2s ease;
        }

        .image-upload-label:hover .empty-image {
          border-color: var(--accent-color);
          background: linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%);
        }

        .upload-icon {
          font-size: 2rem;
          color: var(--text-muted);
        }

        .upload-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* 학급 관리 버튼 */
        .classroom-manage-button {
          width: 100%;
          padding: 0;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .classroom-manage-button:hover {
          border-color: var(--accent-color);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .button-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          text-align: left;
        }

        .button-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .button-text {
          flex: 1;
        }

        .button-title {
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .button-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .button-arrow {
          font-size: 1.2rem;
          color: var(--text-muted);
        }

        /* 알림 설정 */
        .notification-settings {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .setting-info {
          flex: 1;
        }

        .setting-name {
          display: block;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .setting-desc {
          display: block;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        /* 토글 스위치 */
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }

        .toggle-switch input {
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
          background-color: var(--border-color);
          transition: 0.2s;
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
          transition: 0.2s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        }

        input:checked + .slider:before {
          transform: translateX(26px);
        }

        /* 시간 설정 */
        .time-settings {
          display: flex;
          align-items: end;
          gap: 1rem;
        }

        .time-group {
          flex: 1;
        }

        .time-separator {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .time-input {
          width: 100%;
          padding: 0.875rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 1rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .time-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        /* 위험 영역 */
        .danger-section {
          background: rgba(239, 68, 68, 0.05);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-lg);
          padding: 2rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(239, 68, 68, 0.2);
          animation: slideUp 0.6s ease-out;
          animation-delay: 0.3s;
        }

        .danger-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--error-color);
          margin: 0 0 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .danger-icon {
          font-size: 1.4rem;
        }

        .danger-description {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .danger-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .danger-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          justify-content: center;
        }

        .school-delete {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
        }

        .school-delete:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .account-delete {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .account-delete:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        /* 저장 섹션 */
        .save-section {
          display: flex;
          justify-content: center;
          animation: slideUp 0.6s ease-out;
          animation-delay: 0.4s;
        }

        .save-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 3rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-md);
          min-width: 200px;
          justify-content: center;
        }

        .save-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .loading-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .profile-page {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --bg-glass: rgba(30, 41, 59, 0.95);
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --text-muted: #94a3b8;
            --border-color: #475569;
          }

          .danger-section {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
          }

          .empty-image {
            background: var(--bg-secondary);
          }

          .classroom-manage-button:hover .empty-image {
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 1024px) {
          .container {
            max-width: 100%;
            padding: 0 0.5rem;
          }

          .header {
            padding: 1.5rem;
          }

          .page-title {
            font-size: 1.75rem;
          }

          .content-grid {
            gap: 1.5rem;
          }

          .section {
            padding: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .profile-page {
            padding: 0.5rem;
          }

          .header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 1.5rem;
            text-align: center;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .page-subtitle {
            font-size: 1rem;
          }

          .user-badge {
            justify-content: center;
          }

          .content-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .time-settings {
            flex-direction: column;
            align-items: stretch;
          }

          .time-separator {
            text-align: center;
            margin: 0.5rem 0;
          }

          .danger-actions {
            align-items: stretch;
          }

          .save-button {
            width: 100%;
            padding: 1rem 2rem;
          }
        }

        @media (max-width: 480px) {
          .header {
            padding: 1rem;
          }

          .page-title {
            font-size: 1.25rem;
          }

          .page-subtitle {
            font-size: 0.9rem;
          }

          .section {
            padding: 1rem;
          }

          .section-title {
            font-size: 1.1rem;
          }

          .form-input,
          .time-input {
            padding: 0.75rem;
          }

          .button-content {
            padding: 1.25rem;
          }

          .image-preview,
          .empty-image {
            width: 100px;
            height: 100px;
          }

          .setting-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .toggle-switch {
            align-self: flex-end;
          }

          .save-button {
            padding: 0.875rem 1.5rem;
            font-size: 1rem;
          }
        }

        /* 접근성 개선 */
        .form-input:focus,
        .time-input:focus,
        .save-button:focus,
        .danger-button:focus,
        .classroom-manage-button:focus,
        .image-upload-label:focus {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
        }

        .toggle-switch:focus-within {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
          border-radius: 24px;
        }

        /* 애니메이션 */
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .section:nth-child(2) {
          animation-delay: 0.1s;
        }

        .section:nth-child(3) {
          animation-delay: 0.2s;
        }

        /* 인쇄 스타일 */
        @media print {
          .profile-page {
            background: white;
            padding: 0;
          }

          .header,
          .section,
          .danger-section {
            background: white;
            box-shadow: none;
            border: 1px solid #ccc;
          }

          .save-section,
          .danger-section {
            display: none;
          }

          .content-grid {
            display: block;
          }

          .right-column {
            margin-top: 2rem;
          }
        }
      `}</style>
    </div>
  );
}

export default ProfilePage;