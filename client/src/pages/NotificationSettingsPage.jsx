// 📄 src/pages/NotificationSettingsPage.jsx

import { useEffect, useState } from 'react';

function NotificationSettingsPage() {
  const [settings, setSettings] = useState({
    post_alert: true,
    schedule_alert: true,
    chat_alert: true,
  });
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('http://localhost:3001/api/notification-settings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.settings) setSettings(data.settings);
      });
  }, []);

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/notification-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) alert('저장 완료!');
      else alert('저장 실패');
    } catch (err) {
      console.error('저장 오류:', err);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>알림 설정</h2>
      <label>
        <input
          type="checkbox"
          checked={settings.post_alert}
          onChange={() => handleToggle('post_alert')}
        />
        공지사항 알림
      </label>
      <br />
      <label>
        <input
          type="checkbox"
          checked={settings.schedule_alert}
          onChange={() => handleToggle('schedule_alert')}
        />
        일정 알림
      </label>
      <br />
      <label>
        <input
          type="checkbox"
          checked={settings.chat_alert}
          onChange={() => handleToggle('chat_alert')}
        />
        채팅 알림
      </label>
      <br /><br />
      <button onClick={handleSave}>저장</button>
    </div>
  );
}

export default NotificationSettingsPage;
