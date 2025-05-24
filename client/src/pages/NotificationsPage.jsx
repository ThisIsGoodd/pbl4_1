import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // Socket.io 연결 설정
  useEffect(() => {
    const socket = io('http://localhost:3001');
    
    // 사용자 정보 추출 (JWT에서)
    const getUserIdFromToken = () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.user_id;
      } catch {
        return null;
      }
    };

    const userId = getUserIdFromToken();
    if (userId) {
      // 사용자별 알림 room 참가
      socket.emit('joinNotificationRoom', userId);
      
      // 새 알림 수신 시 알림 목록 새로고침
      socket.on('newNotification', (notification) => {
        console.log('📢 새 알림 수신:', notification);
        fetchNotifications(); // 알림 목록 다시 불러오기
        
        // 브라우저 알림 표시 (권한이 있는 경우)
        if (Notification.permission === 'granted') {
          new Notification('새 알림', {
            body: notification.message,
            icon: '/assets/logo.png'
          });
        }
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 알림 목록 불러오기
  const fetchNotifications = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('알림 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // 개별 읽음 처리
  const handleMarkAsRead = async (notificationId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.notification_id === notificationId
              ? { ...n, is_read: true }
              : n
          )
        );
        showToast('알림을 읽음 처리했습니다.', 'success');
      } else {
        showToast('읽음 처리에 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('읽음 처리 실패:', err);
      showToast('서버 오류가 발생했습니다.', 'error');
    }
  };

  const handleClick = async (notification) => {
    // 읽음 처리
    try {
      await fetch(`http://localhost:3001/api/notifications/${notification.notification_id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('읽음 처리 실패:', err);
    }

    // 관련된 페이지로 이동 (classroom_id 포함)
    const getClassroomIdFromUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('classroom_id');
    };

    const classroomId = getClassroomIdFromUrl();
    
    if (notification.type === 'comment' || notification.type === 'post') {
      const path = classroomId 
        ? `/posts/${notification.related_id}?classroom_id=${classroomId}`
        : `/posts/${notification.related_id}`;
      navigate(path);
    } else if (notification.type === 'schedule') {
      const path = classroomId 
        ? `/schedules?classroom_id=${classroomId}`
        : '/schedules';
      navigate(path);
    } else if (notification.type === 'chat') {
      const path = classroomId 
        ? `/chat?classroom_id=${classroomId}`
        : '/chat';
      navigate(path);
    }

    // 로컬 상태에서도 읽음 표시
    setNotifications(prev =>
      prev.map(n =>
        n.notification_id === notification.notification_id
          ? { ...n, is_read: true }
          : n
      )
    );
  };

  // 전체 읽음 처리
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read);
    if (unreadNotifications.length === 0) return;

    try {
      const res = await fetch('http://localhost:3001/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
        // 성공 피드백
        showToast('모든 알림을 읽음 처리했습니다.', 'success');
      } else {
        showToast('전체 읽음 처리에 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('전체 읽음 처리 실패:', err);
      showToast('서버 오류가 발생했습니다.', 'error');
    }
  };

  // 개별 알림 삭제
  const handleDelete = async (notificationId, event) => {
    event.stopPropagation(); // 클릭 이벤트 버블링 방지
    
    if (!window.confirm('이 알림을 삭제하시겠습니까?')) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setNotifications(prev => 
          prev.filter(n => n.notification_id !== notificationId)
        );
        showToast('알림이 삭제되었습니다.', 'success');
      } else {
        showToast('알림 삭제에 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('알림 삭제 실패:', err);
      showToast('서버 오류가 발생했습니다.', 'error');
    }
  };

  // 전체 알림 삭제
  const handleDeleteAll = async () => {
    if (notifications.length === 0) return;
    
    if (!window.confirm('모든 알림을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    
    try {
      const res = await fetch('http://localhost:3001/api/notifications/delete-all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setNotifications([]);
        showToast('모든 알림이 삭제되었습니다.', 'success');
      } else {
        showToast('전체 삭제에 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('전체 삭제 실패:', err);
      showToast('서버 오류가 발생했습니다.', 'error');
    }
  };

  // 읽은 알림만 삭제
  const handleDeleteRead = async () => {
    const readNotifications = notifications.filter(n => n.is_read);
    if (readNotifications.length === 0) {
      showToast('삭제할 읽은 알림이 없습니다.', 'info');
      return;
    }
    
    if (!window.confirm(`읽은 알림 ${readNotifications.length}개를 삭제하시겠습니까?`)) return;
    
    try {
      const res = await fetch('http://localhost:3001/api/notifications/delete-read', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setNotifications(prev => prev.filter(n => !n.is_read));
        showToast('읽은 알림이 삭제되었습니다.', 'success');
      } else {
        showToast('읽은 알림 삭제에 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('읽은 알림 삭제 실패:', err);
      showToast('서버 오류가 발생했습니다.', 'error');
    }
  };

  // 토스트 메시지 상태
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // 토스트 메시지 표시
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid #f1f5f9', 
          borderTop: '3px solid #3b82f6', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }}></div>
        <p>알림을 불러오는 중...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ padding: '2rem' }}>
      {/* 헤더 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
          알림 목록 {unreadCount > 0 && (
            <span style={{ 
              backgroundColor: '#ef4444', 
              color: 'white', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '0.8rem',
              marginLeft: '0.5rem'
            }}>
              {unreadCount}
            </span>
          )}
        </h2>
        
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            전체 읽음
          </button>
        )}
      </div>

      {/* 알림 목록 */}
      {notifications.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
          <p>새로운 알림이 없습니다.</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {notifications.map((n) => (
            <li
              key={n.notification_id}
              onClick={() => handleClick(n)}
              style={{
                padding: '1.2rem',
                marginBottom: '0.8rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: n.is_read ? '#f9fafb' : '#eff6ff',
                cursor: 'pointer',
                fontWeight: n.is_read ? 'normal' : '600',
                transition: 'all 0.2s',
                position: 'relative',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ 
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}>
                  {/* 타입별 아이콘 */}
                  <span style={{ fontSize: '1.2rem', marginTop: '0.1rem' }}>
                    {n.type === 'post' && '📢'}
                    {n.type === 'comment' && '💬'}
                    {n.type === 'schedule' && '📅'}
                    {n.type === 'chat' && '💭'}
                    {n.type === 'inquiry' && '❓'}
                  </span>
                  
                  <div style={{ flex: 1 }}>
                    {n.message}
                    {!n.is_read && (
                      <span style={{ 
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#ef4444',
                        borderRadius: '50%',
                        marginLeft: '0.5rem'
                      }}></span>
                    )}
                  </div>
                </div>
                <small style={{ color: '#6b7280' }}>
                  {new Date(n.created_at).toLocaleString()}
                </small>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {!n.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(n.notification_id);
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #3b82f6',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem'
                    }}
                    title="읽음 처리"
                  >
                    읽음
                  </button>
                )}
                
                <button
                  onClick={(e) => handleDelete(n.notification_id, e)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '4px',
                    fontSize: '1.2rem'
                  }}
                  title="삭제"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 토스트 메시지 */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          animation: 'slideInRight 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default NotificationPage;