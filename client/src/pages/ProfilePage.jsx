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
  
  // ✅ 알림 설정 상태 추가
  const [notificationSettings, setNotificationSettings] = useState({
    post_alert: true,
    schedule_alert: true,
    chat_alert: true,
  });

  // ✅ DND 시간 설정 추가
  const [chatDndStart, setChatDndStart] = useState('');
  const [chatDndEnd, setChatDndEnd] = useState('');

  const token = getToken();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('🔍 [ProfilePage] 프로필 데이터:', res.data.user);
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // 🔥 수정: 방해금지 시간 저장 로직 개선
  const handleSave = async () => {
    try {
      console.log('💾 [ProfilePage] 저장 시작 - DND 시간:', { chatDndStart, chatDndEnd });
      
      const formData = new FormData();
      formData.append('name', name);
      formData.append('child_name', childName);
      
      // 🔥 중요: 방해금지 시간 필드 추가
      formData.append('chat_dnd_start', chatDndStart || '');
      formData.append('chat_dnd_end', chatDndEnd || '');
      
      if (image) {
        formData.append('profile_picture', image);
      }

      // FormData 내용 디버깅
      console.log('📋 [ProfilePage] FormData 내용:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      const res = await axios.patch('http://localhost:3001/api/users/profile', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
      });

      if (res.status === 200) {
        console.log('✅ [ProfilePage] 프로필 저장 성공');
        alert('프로필이 저장되었습니다.');
        setImage(null);
        
        // 프로필 정보 다시 불러와서 업데이트
        const updatedRes = await axios.get('http://localhost:3001/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (updatedRes.status === 200) {
          const updatedUser = updatedRes.data.user;
          setUser(updatedUser);
          setChatDndStart(updatedUser.chat_dnd_start || '');
          setChatDndEnd(updatedUser.chat_dnd_end || '');
          console.log('🔄 [ProfilePage] 프로필 정보 갱신 완료');
        }
      }
    } catch (err) {
      console.error('❌ [ProfilePage] 프로필 저장 실패:', err);
      if (err.response?.data?.error) {
        alert(`저장 실패: ${err.response.data.error}`);
      } else {
        alert('프로필 저장에 실패했습니다.');
      }
    }
  };

  // ✅ 알림 설정 저장
  const handleNotificationSave = async () => {
    try {
      await axios.patch('http://localhost:3001/api/notification-settings', notificationSettings, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('알림 설정이 저장되었습니다.');
    } catch (err) {
      console.error('❌ 알림 설정 저장 실패:', err);
      alert('알림 설정 저장에 실패했습니다.');
    }
  };

  // 🔥 추가: 학교 삭제 (관리자용)
  const handleDeleteSchool = async () => {
    if (!window.confirm('정말로 학교를 삭제하시겠습니까? 모든 학급과 데이터가 삭제됩니다.')) return;
    
    const confirmText = prompt('삭제를 확인하려면 "학교삭제"를 입력하세요:');
    if (confirmText !== '학교삭제') {
      alert('삭제가 취소되었습니다.');
      return;
    }

    try {
      const res = await axios.delete(`http://localhost:3001/api/superadmin/schools/${user.school_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 200) {
        alert('학교가 삭제되었습니다.');
        logout();
      }
    } catch (err) {
      console.error('학교 삭제 실패:', err);
      alert('학교 삭제에 실패했습니다.');
    }
  };

  // 🔥 추가: 회원 탈퇴
  const handleDeleteAccount = async () => {
    if (!window.confirm('정말로 회원 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.')) return;
    
    const confirmText = prompt('탈퇴를 확인하려면 "회원탈퇴"를 입력하세요:');
    if (confirmText !== '회원탈퇴') {
      alert('탈퇴가 취소되었습니다.');
      return;
    }

    try {
      const res = await axios.delete('http://localhost:3001/api/users/delete-account', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 200) {
        alert('회원 탈퇴가 완료되었습니다.');
        logout();
      }
    } catch (err) {
      console.error('회원 탈퇴 실패:', err);
      alert('회원 탈퇴에 실패했습니다.');
    }
  };

  if (!user) return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '50vh' 
    }}>
      <div>⏳ 불러오는 중...</div>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>프로필 설정</h2>

      {/* 기본 정보 */}
      <div style={{ 
        marginBottom: '2rem', 
        padding: '1.5rem', 
        border: '1px solid #ddd', 
        borderRadius: '12px',
        backgroundColor: '#f9f9f9'
      }}>
        <h3 style={{ marginBottom: '1.5rem', color: '#333' }}>📝 기본 정보</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>이름:</label>
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
        </div>

        {user.role === 'parent' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>자녀 이름:</label>
            <input
              type="text"
              placeholder="자녀 이름 입력"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>프로필 사진:</label>
          <input 
            type="file" 
            accept="image/*"
            onChange={handleImageChange}
            style={{ marginBottom: '1rem' }}
          />

          {preview && (
            <div style={{ textAlign: 'center' }}>
              <img
                src={preview}
                alt="프로필 미리보기"
                style={{ 
                  width: 120, 
                  height: 120, 
                  borderRadius: '50%', 
                  objectFit: 'cover',
                  border: '3px solid #ddd'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 🔥 수정: 채팅 방해금지 시간 설정 (선생님만) */}
      {user.role === 'teacher' && (
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1.5rem', 
          border: '1px solid #ddd', 
          borderRadius: '12px',
          backgroundColor: '#f0f8ff'
        }}>
          <h3 style={{ marginBottom: '1rem', color: '#333' }}>🔕 채팅 방해금지 시간</h3>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
            지정된 시간에는 채팅 알림을 받지 않습니다.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                시작 시간:
              </label>
              <input
                type="time"
                value={chatDndStart}
                onChange={(e) => {
                  console.log('🕐 DND 시작 시간 변경:', e.target.value);
                  setChatDndStart(e.target.value);
                }}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                종료 시간:
              </label>
              <input
                type="time"
                value={chatDndEnd}
                onChange={(e) => {
                  console.log('🕐 DND 종료 시간 변경:', e.target.value);
                  setChatDndEnd(e.target.value);
                }}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          {/* 🔥 추가: 현재 설정된 시간 표시 */}
          {(chatDndStart || chatDndEnd) && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              backgroundColor: '#e7f3ff', 
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}>
              <strong>현재 설정:</strong> {chatDndStart || '미설정'} ~ {chatDndEnd || '미설정'}
            </div>
          )}
        </div>
      )}

      {/* 알림 설정 */}
      <div style={{ 
        marginBottom: '2rem', 
        padding: '1.5rem', 
        border: '1px solid #ddd', 
        borderRadius: '12px',
        backgroundColor: '#f0fff0'
      }}>
        <h3 style={{ marginBottom: '1.5rem', color: '#333' }}>🔔 알림 설정</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={notificationSettings.post_alert}
              onChange={(e) => setNotificationSettings(prev => ({
                ...prev,
                post_alert: e.target.checked
              }))}
            />
            <span>📝 게시글 알림</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={notificationSettings.schedule_alert}
              onChange={(e) => setNotificationSettings(prev => ({
                ...prev,
                schedule_alert: e.target.checked
              }))}
            />
            <span>📅 일정 알림</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={notificationSettings.chat_alert}
              onChange={(e) => setNotificationSettings(prev => ({
                ...prev,
                chat_alert: e.target.checked
              }))}
            />
            <span>💬 채팅 알림</span>
          </label>
        </div>

        <button 
          onClick={handleNotificationSave}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          알림 설정 저장
        </button>
      </div>

      {/* 학급 정보 */}
      <div style={{ 
        marginBottom: '2rem', 
        padding: '1.5rem', 
        border: '1px solid #ddd', 
        borderRadius: '12px',
        backgroundColor: '#fffef0'
      }}>
        <h3 style={{ marginBottom: '1.5rem', color: '#333' }}>🏫 학급 정보</h3>
        
        {user.joined_classrooms && user.joined_classrooms.length > 0 ? (
          <div>
            <p style={{ marginBottom: '1rem' }}>
              <strong>가입된 학급:</strong> {user.joined_classrooms.length}개
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              {user.joined_classrooms.map((classroom, index) => (
                <li key={index} style={{ marginBottom: '0.5rem' }}>
                  📚 {classroom.school} - {classroom.grade}학년 {classroom.class_number}반
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#666' }}>
            <p style={{ marginBottom: '1rem' }}>
              아직 가입된 학급이 없습니다.
            </p>
            {user.role === 'parent' && (
              <button
                onClick={() => navigate('/join/invite')}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                📚 학급 가입하기
              </button>
            )}
          </div>
        )}
      </div>

      {/* 🔥 추가: 위험 영역 */}
      <div style={{ 
        marginBottom: '2rem', 
        padding: '1.5rem', 
        border: '2px solid #dc3545', 
        borderRadius: '12px',
        backgroundColor: '#fff5f5'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#dc3545' }}>⚠️ 위험 영역</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
          아래 작업들은 되돌릴 수 없습니다. 신중하게 결정해주세요.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* 학교 관리자: 학교 삭제 */}
          {user.is_admin && user.school_id && (
            <button
              onClick={handleDeleteSchool}
              style={{
                backgroundColor: '#6f42c1',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🏫 학교 삭제
            </button>
          )}
          
          {/* 🔥 수정: 모든 사용자 회원 탈퇴 - marginTop 제거 */}
          <button 
            onClick={handleDeleteAccount}
            style={{ 
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}
          >
            👤 회원 탈퇴
          </button>
        </div>
      </div>

      {/* 저장 버튼 */}
      <button 
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '1.2rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'background-color 0.3s'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
      >
        💾 저장하기
      </button>
    </div>
  );
}

export default ProfilePage;