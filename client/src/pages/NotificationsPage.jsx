// client/src/pages/NotificationsPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';

function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  
  // 현재 URL에서 classroom_id 추출
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

  // 토스트 메시지 표시
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  // 알림 클릭 처리
  const handleClick = (notification) => {
    // 타입에 따른 네비게이션
    if (notification.related_post_id) {
      const classroomParam = currentClassroomId ? `?classroom_id=${currentClassroomId}` : '';
      navigate(`/posts/${notification.related_post_id}${classroomParam}`);
    } else if (notification.type === 'schedule') {
      const classroomParam = currentClassroomId ? `?classroom_id=${currentClassroomId}` : '';
      navigate(`/schedule${classroomParam}`);
    } else if (notification.type === 'chat') {
      const classroomParam = currentClassroomId ? `?classroom_id=${currentClassroomId}` : '';
      navigate(`/chat${classroomParam}`);
    }

    // 읽지 않은 알림이면 읽음 처리
    if (!notification.is_read) {
      handleMarkAsRead(notification.notification_id);
    }
  };

  // 전체 읽음 처리
  const handleMarkAllAsRead = async () => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    if (unreadCount === 0) {
      showToast('읽지 않은 알림이 없습니다.', 'info');
      return;
    }

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

  // 알림 타입별 아이콘 가져오기
  const getNotificationIcon = (type) => {
    const icons = {
      post: '📢',
      comment: '💬',
      schedule: '📅',
      chat: '💭',
      inquiry: '❓',
      system: '⚙️'
    };
    return icons[type] || '📢';
  };

  // 알림 타입별 배경색 가져오기
  const getNotificationBg = (type, isRead) => {
    if (isRead) {
      return 'var(--bg-secondary, #f8fafc)';
    }
    
    const backgrounds = {
      post: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      comment: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
      schedule: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
      chat: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
      inquiry: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      system: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)'
    };
    return backgrounds[type] || backgrounds.post;
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">알림을 불러오는 중...</div>
        </div>
        
        <style jsx>{`
          .notifications-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }

          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
          }

          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .loading-text {
            font-size: 1.1rem;
            font-weight: 500;
            color: white;
            text-align: center;
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
  const readCount = notifications.filter(n => n.is_read).length;

  return (
    <div className="notifications-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="header-content">
            <h1 className="main-title">🔔 알림 센터</h1>
            <p className="welcome-text">새로운 알림과 활동을 확인하세요</p>
          </div>
        </div>

        <div className="main-content">
          {/* 통계 및 액션 섹션 */}
          <div className="stats-section">
            <div className="stats-cards">
              <div className="stat-card total">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-number">{notifications.length}</div>
                  <div className="stat-label">전체 알림</div>
                </div>
              </div>
              
              <div className="stat-card unread">
                <div className="stat-icon">🔴</div>
                <div className="stat-content">
                  <div className="stat-number">{unreadCount}</div>
                  <div className="stat-label">읽지 않음</div>
                </div>
              </div>
              
              <div className="stat-card read">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-number">{readCount}</div>
                  <div className="stat-label">읽음</div>
                </div>
              </div>
            </div>

            <div className="action-buttons">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllAsRead} className="action-btn read-all">
                  <span className="btn-icon">👁️</span>
                  모두 읽음
                </button>
              )}
              
              {readCount > 0 && (
                <button onClick={handleDeleteRead} className="action-btn delete-read">
                  <span className="btn-icon">🗑️</span>
                  읽은 알림 삭제
                </button>
              )}
              
              {notifications.length > 0 && (
                <button onClick={handleDeleteAll} className="action-btn delete-all">
                  <span className="btn-icon">🗑️</span>
                  전체 삭제
                </button>
              )}
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="notifications-section">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔔</div>
                <h3 className="empty-title">새로운 알림이 없습니다</h3>
                <p className="empty-description">
                  새로운 공지사항이나 활동이 있을 때 여기에 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <div
                    key={notification.notification_id}
                    onClick={() => handleClick(notification)}
                    className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                    style={{ 
                      background: getNotificationBg(notification.type, notification.is_read)
                    }}
                  >
                    <div className="notification-content">
                      <div className="notification-header">
                        <div className="notification-icon">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="notification-message">
                          {notification.message}
                          {!notification.is_read && (
                            <span className="unread-dot"></span>
                          )}
                        </div>
                      </div>
                      
                      <div className="notification-meta">
                        <span className="notification-time">
                          {new Date(notification.created_at).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    </div>

                    <div className="notification-actions">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.notification_id);
                          }}
                          className="read-btn"
                          title="읽음 처리"
                        >
                          👁️
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => handleDelete(notification.notification_id, e)}
                        className="delete-btn"
                        title="삭제"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 토스트 메시지 */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'info' && 'ℹ️'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .notifications-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .header {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          text-align: center;
        }

        .main-title {
          font-size: clamp(2rem, 5vw, 2.8rem);
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 1rem 0;
          letter-spacing: -0.02em;
        }

        .welcome-text {
          font-size: clamp(1rem, 2.5vw, 1.2rem);
          color: var(--text-secondary, #64748b);
          margin: 0;
          font-weight: 300;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* 통계 섹션 */
        .stats-section {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .stats-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .stat-card.total {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border: 2px solid #3b82f6;
        }

        .stat-card.unread {
          background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
          border: 2px solid #ef4444;
        }

        .stat-card.read {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          border: 2px solid #10b981;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .stat-icon {
          font-size: 2rem;
        }

        .stat-number {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.9rem;
          color: var(--text-secondary, #64748b);
          font-weight: 500;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .action-btn.read-all {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }

        .action-btn.delete-read {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .action-btn.delete-all {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .btn-icon {
          font-size: 1rem;
        }

        /* 알림 목록 섹션 */
        .notifications-section {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          opacity: 0.7;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 1rem 0;
          color: var(--text-primary, #1e293b);
        }

        .empty-description {
          font-size: 1rem;
          color: var(--text-secondary, #64748b);
          margin: 0;
          max-width: 400px;
          line-height: 1.6;
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .notification-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-radius: 16px;
          border: 1px solid var(--border-color, #e2e8f0);
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .notification-item:hover {
          transform: translateX(4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .notification-item.unread {
          border-left: 4px solid #ef4444;
          font-weight: 600;
        }

        .notification-item.read {
          opacity: 0.8;
          font-weight: normal;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .notification-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .notification-message {
          flex: 1;
          font-size: 1rem;
          color: var(--text-primary, #1e293b);
          line-height: 1.5;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .unread-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .notification-meta {
          margin-left: 2.5rem;
        }

        .notification-time {
          font-size: 0.85rem;
          color: var(--text-secondary, #64748b);
        }

        .notification-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-shrink: 0;
        }

        .read-btn,
        .delete-btn {
          background: none;
          border: none;
          padding: 0.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .read-btn:hover {
          background: rgba(59, 130, 246, 0.1);
        }

        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        /* 토스트 메시지 */
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          border-radius: 12px;
          padding: 1rem 1.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          animation: slideInRight 0.3s ease-out;
        }

        .toast-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .toast-error {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .toast-info {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .toast-icon {
          font-size: 1.2rem;
        }

        .toast-message {
          font-weight: 500;
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .notifications-page {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .notifications-page {
            padding: 0.5rem;
          }

          .header {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .stats-section,
          .notifications-section {
            padding: 1.5rem;
          }

          .stats-cards {
            grid-template-columns: 1fr;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
          }

          .stat-card {
            padding: 1.25rem;
          }

          .action-buttons {
            flex-direction: column;
            gap: 0.75rem;
          }

          .action-btn {
            width: 100%;
            justify-content: center;
          }

          .notification-item {
            padding: 1.25rem;
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .notification-actions {
            justify-content: center;
            margin-top: 0.5rem;
          }

          .notification-header {
            gap: 0.75rem;
          }

          .notification-meta {
            margin-left: 2rem;
          }

          .toast {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
          }
        }

        @media (max-width: 480px) {
          .notifications-page {
            padding: 0.25rem;
          }

          .header {
            padding: 1.25rem;
          }

          .stats-section,
          .notifications-section {
            padding: 1.25rem;
          }

          .stat-card {
            padding: 1rem;
            gap: 0.75rem;
          }

          .stat-icon {
            font-size: 1.5rem;
          }

          .stat-number {
            font-size: 1.5rem;
          }

          .notification-item {
            padding: 1rem;
          }

          .notification-header {
            gap: 0.5rem;
          }

          .notification-icon {
            font-size: 1.25rem;
          }

          .notification-message {
            font-size: 0.9rem;
          }

          .notification-meta {
            margin-left: 1.75rem;
          }

          .notification-time {
            font-size: 0.8rem;
          }

          .empty-state {
            padding: 3rem 1.5rem;
          }

          .empty-icon {
            font-size: 3rem;
          }

          .empty-title {
            font-size: 1.25rem;
          }
        }

        /* 접근성 */
        .action-btn:focus,
        .read-btn:focus,
        .delete-btn:focus,
        .notification-item:focus {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }

        /* 애니메이션 성능 최적화 */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default NotificationPage;