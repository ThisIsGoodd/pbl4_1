// client/src/pages/NotificationsPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';

function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  
  // 🆕 현재 URL에서 classroom_id 추출
  const [searchParams] = useSearchParams();
  const currentClassroomId = searchParams.get('classroom_id');

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

  // 알림 클릭 핸들러
  const handleClick = (notification) => {
    // 클릭 시 자동으로 읽음 처리
    if (!notification.is_read) {
      handleMarkAsRead(notification.notification_id);
    }

    // 타입별 페이지 이동
    if (notification.related_url) {
      const baseUrl = notification.related_url;
      const url = currentClassroomId ? `${baseUrl}?classroom_id=${currentClassroomId}` : baseUrl;
      navigate(url);
    }
  };

  // 전체 읽음 처리
  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
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
        const errorData = await res.json();
        console.error('삭제 실패:', errorData);
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
        const errorData = await res.json();
        console.error('읽은 알림 삭제 실패:', errorData);
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
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        fontSize: '16px',
        color: '#666'
      }}>
        알림을 불러오는 중...
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '2px solid #eee'
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: 'bold',
          color: '#333'
        }}>
          알림 목록
          {unreadCount > 0 && (
            <span style={{ 
              backgroundColor: '#ff4444', 
              color: 'white', 
              padding: '3px 8px', 
              borderRadius: '12px', 
              fontSize: '12px',
              marginLeft: '8px'
            }}>
              {unreadCount}
            </span>
          )}
        </h2>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              전체 읽음
            </button>
          )}
          
          {notifications.length > 0 && (
            <>
              <button
                onClick={handleDeleteRead}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                읽은 알림 삭제
              </button>
              
              <button
                onClick={handleDeleteAll}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                전체 삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* 알림 목록 */}
      {notifications.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#999'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
          <p style={{ fontSize: '16px', margin: 0 }}>새로운 알림이 없습니다.</p>
        </div>
      ) : (
        <div>
          {notifications.map((n) => (
            <div
              key={n.notification_id}
              onClick={() => handleClick(n)}
              style={{
                padding: '16px',
                marginBottom: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: n.is_read ? '#fff' : '#f0f8ff',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                transition: 'box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  {/* 타입별 아이콘 */}
                  <span style={{ fontSize: '16px' }}>
                    {n.type === 'post' && '📢'}
                    {n.type === 'comment' && '💬'}
                    {n.type === 'schedule' && '📅'}
                    {n.type === 'chat' && '💭'}
                    {n.type === 'inquiry' && '❓'}
                  </span>
                  
                  <div style={{ 
                    flex: 1,
                    fontSize: '14px',
                    color: '#333',
                    fontWeight: n.is_read ? 'normal' : 'bold'
                  }}>
                    {n.message}
                    {!n.is_read && (
                      <span style={{ 
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#ff4444',
                        borderRadius: '50%',
                        marginLeft: '8px'
                      }}></span>
                    )}
                  </div>
                </div>
                <small style={{ color: '#999', fontSize: '12px' }}>
                  {new Date(n.created_at).toLocaleString()}
                </small>
              </div>
              
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {!n.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(n.notification_id);
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #4CAF50',
                      color: '#4CAF50',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
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
                    color: '#f44336',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                  title="삭제"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 토스트 메시지 */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.type === 'success' ? '#4CAF50' : toast.type === 'error' ? '#f44336' : '#2196F3',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontSize: '14px'
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default NotificationPage;