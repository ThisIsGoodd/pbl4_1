import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken } from '../utils/jwt';
import { AuthContext } from '../contexts/AuthContext'; // 🔥 추가

function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext); // 🔥 추가: 로그아웃 함수
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

  const handleNotificationToggle = (key) => {
    setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      // 프로필 정보 저장
      const formData = new FormData();
      formData.append('name', name);
      formData.append('child_name', childName);
      
      // 🔥 수정: 선생님만 DND 시간 설정 가능
      if (user.role === 'teacher') {
        formData.append('chat_dnd_start', chatDndStart);
        formData.append('chat_dnd_end', chatDndEnd);
      }
      
      if (image) formData.append('profile_picture', image);

      await axios.patch('http://localhost:3001/api/users/profile', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      // 알림 설정 저장
      await axios.patch('http://localhost:3001/api/notification-settings', notificationSettings, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      alert('프로필 및 알림 설정이 저장되었습니다.');
      window.location.reload();
    } catch (err) {
      console.error('❌ 저장 실패:', err.response?.data || err.message);
      alert('저장 실패');
    }
  };

  // 🔥 추가: 학급 탈퇴 (학부모용)
  const handleLeaveClassroom = async (classroomId) => {
    if (!window.confirm('정말로 이 학급에서 탈퇴하시겠습니까?')) return;

    try {
      const res = await axios.delete(`http://localhost:3001/api/users/leave-classroom/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 200) {
        alert('학급 탈퇴가 완료되었습니다.');
        window.location.reload();
      }
    } catch (err) {
      console.error('학급 탈퇴 실패:', err);
      alert('학급 탈퇴에 실패했습니다.');
    }
  };

  // 🔥 추가: 학급 삭제 (선생님용)
  const handleDeleteClassroom = async (classroomId) => {
    if (!window.confirm('정말로 학급을 삭제하시겠습니까? 모든 데이터가 삭제됩니다.')) return;

    try {
      const res = await axios.delete(`http://localhost:3001/api/classrooms/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 200) {
        alert('학급이 삭제되었습니다.');
        navigate('/classroom/create');
      }
    } catch (err) {
      console.error('학급 삭제 실패:', err);
      alert('학급 삭제에 실패했습니다.');
    }
  };

  // 🔥 추가: 학교 삭제 (학교 관리자용)
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
        logout(); // 로그아웃 처리
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
            지정된 시간에는 채팅 알림을 받지 않습니다. (선생님만 설정 가능)
          </p>
          
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>시작 시간:</label>
              <input 
                type="time"
                value={chatDndStart}
                onChange={(e) => setChatDndStart(e.target.value)}
                style={{ 
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '6px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>종료 시간:</label>
              <input 
                type="time"
                value={chatDndEnd}
                onChange={(e) => setChatDndEnd(e.target.value)}
                style={{ 
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '6px'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 알림 설정 */}
      <div style={{ 
        marginBottom: '2rem', 
        padding: '1.5rem', 
        border: '1px solid #ddd', 
        borderRadius: '12px',
        backgroundColor: '#fff8dc'
      }}>
        <h3 style={{ marginBottom: '1.5rem', color: '#333' }}>🔔 알림 설정</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '6px',
            backgroundColor: notificationSettings.post_alert ? '#e8f5e8' : '#f5f5f5'
          }}>
            <input
              type="checkbox"
              checked={notificationSettings.post_alert}
              onChange={() => handleNotificationToggle('post_alert')}
              style={{ marginRight: '1rem', transform: 'scale(1.2)' }}
            />
            📢 공지사항 알림
          </label>

          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '6px',
            backgroundColor: notificationSettings.schedule_alert ? '#e8f5e8' : '#f5f5f5'
          }}>
            <input
              type="checkbox"
              checked={notificationSettings.schedule_alert}
              onChange={() => handleNotificationToggle('schedule_alert')}
              style={{ marginRight: '1rem', transform: 'scale(1.2)' }}
            />
            📅 일정 알림
          </label>

          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '6px',
            backgroundColor: notificationSettings.chat_alert ? '#e8f5e8' : '#f5f5f5'
          }}>
            <input
              type="checkbox"
              checked={notificationSettings.chat_alert}
              onChange={() => handleNotificationToggle('chat_alert')}
              style={{ marginRight: '1rem', transform: 'scale(1.2)' }}
            />
            💬 채팅 알림
          </label>
        </div>
      </div>

      {/* 소속 정보 */}
      <div style={{ 
        marginBottom: '2rem', 
        padding: '1.5rem', 
        border: '1px solid #ddd', 
        borderRadius: '12px',
        backgroundColor: '#f0fff0'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: 0, color: '#333' }}>🏫 소속 정보</h3>
          {/* 🔥 수정: 학급 변경 버튼 (학부모만) */}
          {user.role === 'parent' && (
            <button
              onClick={() => navigate('/join/invite')}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
            >
              🔄 학급 변경
            </button>
          )}
        </div>
        
        {user.joined_classrooms && user.joined_classrooms.length > 0 ? (
          <div>
            {user.joined_classrooms.map((classroom, index) => (
              <div key={index} style={{ 
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  <strong>학교:</strong> {classroom.school}
                </p>
                <p style={{ margin: '0 0 1rem 0' }}>
                  <strong>학급:</strong> {classroom.grade}학년 {classroom.class_number}반
                </p>
                
                {/* 🔥 추가: 학급별 액션 버튼 */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {user.role === 'parent' && (
                    <button
                      onClick={() => handleLeaveClassroom(classroom.classroom_id)}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      학급 탈퇴
                    </button>
                  )}
                  
                  {user.role === 'teacher' && (
                    <button
                      onClick={() => handleDeleteClassroom(classroom.classroom_id)}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      학급 삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              color: '#666',
              fontStyle: 'italic',
              marginBottom: '1rem'
            }}>
              학급에 가입되어 있지 않습니다.
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
          {user.is_admin && user.school_id ? (
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
          ) : null}
          
          {/* 모든 사용자: 회원 탈퇴 */}
          <button 
            onClick={handleDeleteAccount}
            style={{ 
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            회원 탈퇴
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