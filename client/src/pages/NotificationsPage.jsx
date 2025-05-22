import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:3001/api/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.notifications) setNotifications(data.notifications);
      });
  }, []);

  const handleClick = async (notification) => {
    // 읽음 처리
    await fetch(`http://localhost:3001/api/notifications/${notification.notification_id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    // 관련된 페이지로 이동 (선택적으로)
    if (notification.type === 'comment' || notification.type === 'post') {
      navigate(`/posts/${notification.related_id}`);
    } else if (notification.type === 'schedule') {
      navigate('/schedules');
    } else if (notification.type === 'chat') {
      navigate('/chat');
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

  return (
    <div style={{ padding: '2rem' }}>
      <h2>알림 목록</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {notifications.map((n) => (
          <li
            key={n.notification_id}
            onClick={() => handleClick(n)}
            style={{
              padding: '1rem',
              marginBottom: '1rem',
              border: '1px solid #ccc',
              backgroundColor: n.is_read ? '#f3f3f3' : '#e0f7ff',
              cursor: 'pointer',
              fontWeight: n.is_read ? 'normal' : 'bold'
            }}
          >
            <div>{n.message}</div>
            <small>{new Date(n.created_at).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default NotificationPage;
