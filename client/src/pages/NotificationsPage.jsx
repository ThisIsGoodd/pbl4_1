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
      <div className="notifications-page">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>알림을 불러오는 중...</p>
          </div>
        </div>
        <style jsx>{`
          .notifications-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
          }
          .loading-container {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 3rem 2rem;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            color: #1e293b;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f1f5f9;
            border-top: 3px solid #4f46e5;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notifications-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1>
            🔔 알림 목록
            {unreadCount > 0 && (
              <span className="unread-badge">
                {unreadCount}
              </span>
            )}
          </h1>
          <p>새로운 소식을 확인하세요</p>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="content">
          {/* 액션 버튼들 */}
          <div className="action-buttons">
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="action-btn primary">
                전체 읽음
              </button>
            )}
            
            {notifications.length > 0 && (
              <>
                <button onClick={handleDeleteRead} className="action-btn warning">
                  읽은 알림 삭제
                </button>
                
                <button onClick={handleDeleteAll} className="action-btn danger">
                  전체 삭제
                </button>
              </>
            )}
          </div>

          {/* 알림 목록 */}
          {notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <h3>새로운 알림이 없습니다</h3>
              <p>새로운 소식이 있으면 여기에 표시됩니다.</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((n) => (
                <div
                  key={n.notification_id}
                  onClick={() => handleClick(n)}
                  className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                >
                  <div className="notification-content">
                    <div className="notification-header">
                      <span className="notification-icon">
                        {n.type === 'post' && '📢'}
                        {n.type === 'comment' && '💬'}
                        {n.type === 'schedule' && '📅'}
                        {n.type === 'chat' && '💭'}
                        {n.type === 'inquiry' && '❓'}
                      </span>
                      
                      <div className="notification-message">
                        {n.message}
                        {!n.is_read && <span className="unread-dot"></span>}
                      </div>
                    </div>
                    
                    <div className="notification-time">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="notification-actions">
                    {!n.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(n.notification_id);
                        }}
                        className="read-btn"
                        title="읽음 처리"
                      >
                        읽음
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => handleDelete(n.notification_id, e)}
                      className="delete-btn"
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 토스트 메시지 */}
        {toast.show && (
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        )}
      </div>

      <style jsx>{`
        .notifications-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 1000px;
          margin: 0 auto;
        }

        /* 헤더 */
        .header {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .header h1 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .header p {
          margin: 0;
          color: #64748b;
          font-size: 1.1rem;
        }

        .unread-badge {
          background: #ef4444;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        /* 메인 콘텐츠 */
        .content {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        /* 액션 버튼들 */
        .action-buttons {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }

        .action-btn.primary {
          background: #4f46e5;
          color: white;
        }

        .action-btn.primary:hover {
          background: #3730a3;
        }

        .action-btn.warning {
          background: #f59e0b;
          color: white;
        }

        .action-btn.warning:hover {
          background: #d97706;
        }

        .action-btn.danger {
          background: #ef4444;
          color: white;
        }

        .action-btn.danger:hover {
          background: #dc2626;
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #64748b;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.25rem;
        }

        .empty-state p {
          margin: 0;
          font-size: 1rem;
        }

        /* 알림 목록 */
        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .notification-item {
          padding: 1.25rem;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          transition: all 0.2s ease;
        }

        .notification-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }

        .notification-item.unread {
          background: #f0f9ff;
          border-color: #0ea5e9;
        }

        .notification-content {
          flex: 1;
        }

        .notification-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .notification-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .notification-message {
          flex: 1;
          color: #1e293b;
          font-size: 0.95rem;
          line-height: 1.5;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .notification-item.unread .notification-message {
          font-weight: 600;
        }

        .unread-dot {
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .notification-time {
          color: #64748b;
          font-size: 0.8rem;
          margin-left: 2rem;
        }

        .notification-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-shrink: 0;
        }

        .read-btn {
          background: transparent;
          border: 1px solid #22c55e;
          color: #22c55e;
          cursor: pointer;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          transition: all 0.2s ease;
        }

        .read-btn:hover {
          background: #22c55e;
          color: white;
        }

        .delete-btn {
          background: transparent;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 1.25rem;
          transition: all 0.2s ease;
        }

        .delete-btn:hover {
          background: #fef2f2;
        }

        /* 토스트 메시지 */
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .toast-success {
          background: #22c55e;
        }

        .toast-error {
          background: #ef4444;
        }

        .toast-info {
          background: #3b82f6;
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .notifications-page {
            padding: 0.5rem;
          }

          .header {
            padding: 1.5rem;
          }

          .header h1 {
            font-size: 1.5rem;
            flex-direction: column;
            gap: 0.5rem;
          }

          .content {
            padding: 1.5rem;
          }

          .action-buttons {
            justify-content: center;
          }

          .action-btn {
            padding: 0.6rem 1.2rem;
            font-size: 0.85rem;
          }

          .notification-item {
            padding: 1rem;
            flex-direction: column;
            gap: 1rem;
          }

          .notification-actions {
            align-self: flex-end;
          }

          .notification-time {
            margin-left: 0;
          }

          .toast {
            left: 1rem;
            right: 1rem;
            width: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default NotificationPage;