import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

function ChatPage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [classroomInfo, setClassroomInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showSidebar, setShowSidebar] = useState(true);
  const classroomId = searchParams.get('classroom_id');

  const [roomParticipants, setRoomParticipants] = useState({});

  const token = localStorage.getItem('token');
  const userId = JSON.parse(atob(token.split('.')[1])).user_id;
  const userRole = JSON.parse(atob(token.split('.')[1])).role;
  const messagesEndRef = useRef(null);

  // 대면 상담 요청 상태
  const [consultationForm, setConsultationForm] = useState({
    title: '',
    date: '',
    time: ''
  });

  // 반응형 처리
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > 768) {
        setShowSidebar(true);
      } else if (selectedRoom) {
        setShowSidebar(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedRoom]);

  const isMobile = windowWidth <= 768;

  // 학급 정보 불러오기
  useEffect(() => {
    const fetchClassroomInfo = async () => {
      if (!classroomId) {
        setError('학급 ID가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setClassroomInfo(data);
        } else {
          setError('학급 정보 불러오기 실패: ' + data.error);
        }
      } catch (err) {
        console.error('학급 정보 불러오기 실패:', err);
        setError('학급 정보 불러오기 중 오류가 발생했습니다.');
      }
    };

    fetchClassroomInfo();
  }, [classroomId, token]);

  // 채팅방 목록 불러오기
  useEffect(() => {
    const fetchRooms = async () => {
      if (!classroomId) return;

      try {
        const res = await fetch(`http://localhost:3001/api/chat/rooms?classroom_id=${classroomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok && data.rooms) {
          setRooms(data.rooms);
          
          // 각 방의 참가자 정보 가져오기
          for (const room of data.rooms) {
            if (room.room_type === 'private') {
              const participantsRes = await fetch(`http://localhost:3001/api/chat/rooms/${room.room_id}/participants`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              const participantsData = await participantsRes.json();
              if (participantsRes.ok) {
                setRoomParticipants(prev => ({
                  ...prev,
                  [room.room_id]: participantsData.participants
                }));
              }
            }
          }
        } else {
          setError('채팅방 목록 불러오기 실패: ' + data.error);
        }
      } catch (err) {
        console.error('채팅방 목록 불러오기 실패:', err);
        setError('채팅방 불러오기 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [classroomId, token]);

  // Socket.io 이벤트 리스너
  useEffect(() => {
    socket.on('receiveMessage', (data) => {
      if (selectedRoom && data.roomId === selectedRoom.room_id) {
        setMessages(prev => [...prev, data]);
      } else {
        // 다른 방의 메시지인 경우 읽지 않은 메시지 수 증가
        setRooms(prev => prev.map(room => 
          room.room_id === data.roomId 
            ? { ...room, unread_count: (room.unread_count || 0) + 1 }
            : room
        ));
      }
    });

    socket.on('messageError', (error) => {
      console.error('메시지 전송 에러:', error);
      alert(`메시지 전송 실패: ${error.error}`);
    });

    return () => {
      socket.off('receiveMessage');
      socket.off('messageError');
    };
  }, [selectedRoom]);

  // 메시지 목록 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 채팅방 클릭 핸들러
  const handleRoomClick = async (room) => {
    setSelectedRoom(room);
    
    if (isMobile) {
      setShowSidebar(false);
    }
    
    socket.emit('joinRoom', room.room_id);
    
    setRooms(prev => prev.map(r => 
      r.room_id === room.room_id 
        ? { ...r, unread_count: 0 }
        : r
    ));

    try {
      const res = await fetch(`http://localhost:3001/api/chat/rooms/${room.room_id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok && data.messages) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('메시지 불러오기 실패:', err);
      setMessages([]);
    }
  };

  // 메시지 전송
  const handleSend = () => {
    if (!newMessage.trim() || !selectedRoom) return;

    socket.emit('sendMessage', {
      roomId: selectedRoom.room_id,
      userId,
      content: newMessage
    });

    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 대면 상담 요청
  const handleConsultationRequest = () => {
    if (!selectedRoom || selectedRoom.room_type !== 'private') {
      alert('1:1 채팅방에서만 대면 상담을 요청할 수 있습니다.');
      return;
    }

    if (!consultationForm.title.trim() || !consultationForm.date || !consultationForm.time) {
      alert('상담 내용, 날짜, 시간을 모두 입력해주세요.');
      return;
    }

    if (window.confirm('선생님께 대면 상담을 요청하시겠습니까?')) {
      const consultationMessage = `📅 대면 상담 요청

📝 상담 내용: ${consultationForm.title}
📅 희망 날짜: ${consultationForm.date}
🕐 희망 시간: ${consultationForm.time}

시간이 되실 때 상담 일정을 조율해주세요.`;
      
      socket.emit('sendMessage', {
        roomId: selectedRoom.room_id,
        userId,
        content: consultationMessage
      });

      setConsultationForm({ title: '', date: '', time: '' });
      alert('상담 요청이 전송되었습니다.');
    }
  };

  // 채팅방 이름 생성
  const getRoomDisplayName = (room) => {
    if (room.room_type === 'group') {
      if (classroomInfo) {
        return `${classroomInfo.grade}학년 ${classroomInfo.class_number}반`;
      }
      return '학급 단체방';
    } else {
      const participants = roomParticipants[room.room_id] || [];
      const otherParticipant = participants.find(p => p.user_id !== userId);
      
      if (otherParticipant) {
        if (otherParticipant.role === 'teacher') {
          return `선생님 (${otherParticipant.name})`;
        } else if (otherParticipant.role === 'parent') {
          if (otherParticipant.child_name) {
            return `${otherParticipant.name} (${otherParticipant.child_name} 부모님)`;
          } else {
            return `${otherParticipant.name} (학부모)`;
          }
        }
      }
      return '1:1 채팅';
    }
  };

  const getRoomSubtitle = (room) => {
    if (room.room_type === 'group') {
      return '모든 학급 구성원과 대화';
    } else {
      const participants = roomParticipants[room.room_id] || [];
      const otherParticipant = participants.find(p => p.user_id !== userId);
      
      if (otherParticipant) {
        if (otherParticipant.role === 'teacher') {
          return '선생님과의 개별 상담';
        } else if (otherParticipant.role === 'parent') {
          return '학부모와의 개별 대화';
        }
      }
      return '1:1 개별 대화';
    }
  };

  const getSenderDisplayName = (message) => {
    if (message.sender_id === userId) {
      return '나';
    }
    
    if (message.sender_role === 'teacher') {
      return `선생님 (${message.sender_name})`;
    } else if (message.sender_role === 'parent') {
      if (message.child_name) {
        return `${message.sender_name} (${message.child_name} 부모님)`;
      } else {
        return `${message.sender_name} (학부모)`;
      }
    }
    
    return message.sender_name || '알 수 없음';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-text">채팅방을 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <div className="error-text">{error}</div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* 모바일 헤더 */}
        {isMobile && (
          <div className="mobile-header">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="sidebar-toggle"
            >
              ☰
            </button>
            <h1>💬 채팅</h1>
          </div>
        )}

        <div className="chat-content">
          {/* 사이드바 */}
          <div className={`sidebar ${showSidebar || !isMobile ? 'show' : 'hide'}`}>
            <div className="sidebar-header">
              <h2>💬 채팅방 목록</h2>
              {classroomInfo && (
                <p className="classroom-info">
                  {classroomInfo.grade}학년 {classroomInfo.class_number}반
                </p>
              )}
            </div>

            <div className="rooms-list">
              {rooms.map((room) => (
                <div
                  key={room.room_id}
                  onClick={() => handleRoomClick(room)}
                  className={`room-item ${selectedRoom?.room_id === room.room_id ? 'active' : ''}`}
                >
                  <div className="room-info">
                    <div className="room-name">{getRoomDisplayName(room)}</div>
                    <div className="room-subtitle">{getRoomSubtitle(room)}</div>
                  </div>
                  {room.unread_count > 0 && (
                    <div className="unread-badge">{room.unread_count}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 채팅 영역 */}
          <div className="chat-area">
            {selectedRoom ? (
              <>
                {/* 채팅방 헤더 */}
                <div className="chat-header">
                  <div className="chat-header-info">
                    <h3>{getRoomDisplayName(selectedRoom)}</h3>
                    <p>{getRoomSubtitle(selectedRoom)}</p>
                  </div>
                </div>

                {/* 상담 요청 폼 (1:1 채팅방에서만) */}
                {selectedRoom.room_type === 'private' && userRole === 'parent' && (
                  <div className="consultation-form">
                    <h4>📅 대면 상담 요청</h4>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="상담 내용"
                        value={consultationForm.title}
                        onChange={(e) => setConsultationForm({...consultationForm, title: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="form-row">
                      <input
                        type="date"
                        value={consultationForm.date}
                        onChange={(e) => setConsultationForm({...consultationForm, date: e.target.value})}
                        className="form-input"
                      />
                      <input
                        type="time"
                        value={consultationForm.time}
                        onChange={(e) => setConsultationForm({...consultationForm, time: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <button onClick={handleConsultationRequest} className="consultation-btn">
                      상담 요청 보내기
                    </button>
                  </div>
                )}

                {/* 메시지 영역 */}
                <div className="messages-container">
                  {messages.length === 0 ? (
                    <div className="empty-messages">
                      <div className="empty-icon">💬</div>
                      <p>아직 메시지가 없습니다</p>
                      <p>첫 번째 메시지를 보내보세요!</p>
                    </div>
                  ) : (
                    <div className="messages-list">
                      {messages.map((message, index) => (
                        <div key={index} className="message-wrapper">
                          <div className={`message ${message.sender_id === userId ? 'my-message' : 'other-message'}`}>
                            {message.sender_id !== userId && (
                              <div className="sender-name">{getSenderDisplayName(message)}</div>
                            )}
                            <div className="message-content">{message.content}</div>
                            <div className="message-time">
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* 메시지 입력 */}
                <div className="input-container">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="메시지를 입력하세요..."
                    className="message-input"
                    rows="1"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="send-button"
                  >
                    📤
                  </button>
                </div>
              </>
            ) : (
              <div className="no-selection">
                <div className="no-selection-icon">💬</div>
                <h3>채팅방을 선택하세요</h3>
                <p>왼쪽에서 채팅방을 선택하여 대화를 시작하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .chat-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .chat-container {
          max-width: 1400px;
          margin: 0 auto;
          height: calc(100vh - 2rem);
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .loading, .error {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 1.2rem;
        }

        /* 모바일 헤더 */
        .mobile-header {
          display: none;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .sidebar-toggle {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .mobile-header h1 {
          margin: 0;
          color: #1e293b;
          font-size: 1.2rem;
        }

        /* 채팅 콘텐츠 */
        .chat-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* 사이드바 */
        .sidebar {
          width: 300px;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
        }

        .sidebar.hide {
          width: 0;
          overflow: hidden;
        }

        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .sidebar-header h2 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.2rem;
        }

        .classroom-info {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
        }

        .rooms-list {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .room-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          margin-bottom: 0.5rem;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid #e2e8f0;
        }

        .room-item:hover {
          background: #f1f5f9;
        }

        .room-item.active {
          background: #4f46e5;
          color: white;
        }

        .room-info {
          flex: 1;
        }

        .room-name {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .room-subtitle {
          font-size: 0.85rem;
          opacity: 0.8;
        }

        .unread-badge {
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }

        /* 채팅 영역 */
        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-header {
          padding: 1.5rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .chat-header h3 {
          margin: 0 0 0.25rem 0;
          color: #1e293b;
          font-size: 1.1rem;
        }

        .chat-header p {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
        }

        /* 상담 요청 폼 */
        .consultation-form {
          padding: 1rem 1.5rem;
          background: #fff7ed;
          border-bottom: 1px solid #fed7aa;
        }

        .consultation-form h4 {
          margin: 0 0 1rem 0;
          color: #ea580c;
          font-size: 1rem;
        }

        .form-group {
          margin-bottom: 0.75rem;
        }

        .form-row {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .form-input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .form-input:focus {
          outline: none;
          border-color: #4f46e5;
        }

        .consultation-btn {
          padding: 0.5rem 1rem;
          background: #ea580c;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .consultation-btn:hover {
          background: #dc2626;
        }

        /* 메시지 영역 */
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.5rem;
        }

        .empty-messages {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #64748b;
          text-align: center;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .message-wrapper {
          display: flex;
        }

        .message {
          max-width: 70%;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          word-wrap: break-word;
        }

        .my-message {
          background: #4f46e5;
          color: white;
          margin-left: auto;
          border-bottom-right-radius: 4px;
        }

        .other-message {
          background: #f1f5f9;
          color: #1e293b;
          border-bottom-left-radius: 4px;
        }

        .sender-name {
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          opacity: 0.8;
        }

        .message-content {
          margin-bottom: 0.25rem;
          line-height: 1.4;
          white-space: pre-wrap;
        }

        .message-time {
          font-size: 0.7rem;
          opacity: 0.7;
          text-align: right;
        }

        /* 입력 영역 */
        .input-container {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .message-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          resize: none;
          font-family: inherit;
          font-size: 0.9rem;
        }

        .message-input:focus {
          outline: none;
          border-color: #4f46e5;
        }

        .send-button {
          padding: 0.75rem 1rem;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.2rem;
        }

        .send-button:hover:not(:disabled) {
          background: #3730a3;
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* 선택되지 않은 상태 */
        .no-selection {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #64748b;
          text-align: center;
        }

        .no-selection-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .no-selection h3 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
        }

        .no-selection p {
          margin: 0;
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .mobile-header {
            display: flex;
          }

          .sidebar {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            z-index: 10;
            width: 280px;
          }

          .sidebar.hide {
            transform: translateX(-100%);
            width: 280px;
          }

          .message {
            max-width: 85%;
          }

          .form-row {
            flex-direction: column;
            gap: 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .chat-page {
            padding: 0.5rem;
          }

          .chat-container {
            height: calc(100vh - 1rem);
          }

          .sidebar {
            width: 100%;
          }

          .sidebar.hide {
            transform: translateX(-100%);
            width: 100%;
          }

          .message {
            max-width: 95%;
          }

          .messages-container {
            padding: 1rem;
          }

          .input-container {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default ChatPage;