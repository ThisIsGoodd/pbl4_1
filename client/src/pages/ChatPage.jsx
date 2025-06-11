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

  // 각 방의 참가자 정보 저장
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
      } finally {
        setLoading(false);
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
          const participantsData = {};
          for (const room of data.rooms) {
            try {
              const participantsRes = await fetch(`http://localhost:3001/api/chat/rooms/${room.room_id}/participants`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              const participantsResult = await participantsRes.json();
              if (participantsRes.ok) {
                participantsData[room.room_id] = participantsResult.participants;
              }
            } catch (err) {
              console.error('참가자 정보 불러오기 실패:', err);
            }
          }
          setRoomParticipants(participantsData);
          
          if (data.rooms.length === 0) {
            setError('가입되지 않은 학급입니다. 학급에 제대로 가입되었는지 확인해주세요.');
          }
        } else {
          setError('채팅방 목록 불러오기 실패: ' + data.error);
        }
      } catch (err) {
        console.error('채팅방 목록 불러오기 실패:', err);
        setError('채팅방 목록 불러오기 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
    
    // 주기적으로 채팅방 목록 새로고침 (읽지 않은 메시지 수 업데이트)
    const interval = setInterval(fetchRooms, 10000); // 10초마다
    return () => clearInterval(interval);
  }, [classroomId, token]);

  // Socket.io 메시지 수신 + 에러 핸들링
  useEffect(() => {
    // 새 메시지 수신
    socket.on('receiveMessage', (msg) => {
      console.log('📨 새 메시지 수신:', msg);
      setMessages(prev => [...prev, msg]);
      
      // 다른 방의 메시지인 경우 읽지 않은 메시지 수 업데이트
      if (!selectedRoom || selectedRoom.room_id !== msg.room_id) {
        setRooms(prev => prev.map(room => 
          room.room_id === msg.room_id 
            ? { ...room, unread_count: (room.unread_count || 0) + 1 }
            : room
        ));
      }
    });

    // 메시지 전송 에러 처리
    socket.on('messageError', (error) => {
      console.error('❌ 메시지 전송 에러:', error);
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

  // 채팅방 클릭 핸들러 (읽음 처리)
  const handleRoomClick = async (room) => {
    console.log('🏠 채팅방 선택:', room);
    
    setSelectedRoom(room);
    
    // 모바일에서는 사이드바 숨기기
    if (isMobile) {
      setShowSidebar(false);
    }
    
    // Socket.io 방 참가
    socket.emit('joinRoom', room.room_id);
    
    // 읽지 않은 메시지 수 초기화 (로컬 상태)
    setRooms(prev => prev.map(r => 
      r.room_id === room.room_id 
        ? { ...r, unread_count: 0 }
        : r
    ));

    try {
      // 기존 메시지 불러오기
      const res = await fetch(`http://localhost:3001/api/chat/rooms/${room.room_id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok && data.messages) {
        console.log('📝 기존 메시지 로드:', data.messages.length, '개');
        setMessages(data.messages);
      } else {
        console.error('❌ 메시지 로드 실패:', data);
        setMessages([]);
      }
    } catch (err) {
      console.error('❌ 메시지 불러오기 실패:', err);
      setMessages([]);
    }
  };

  // 메시지 전송 핸들러
  const handleSend = () => {
    if (!newMessage.trim() || !selectedRoom) return;

    console.log('📤 메시지 전송:', {
      roomId: selectedRoom.room_id,
      userId,
      content: newMessage
    });

    // Socket.io로 메시지 전송
    socket.emit('sendMessage', {
      roomId: selectedRoom.room_id,
      userId,
      content: newMessage
    });

    setNewMessage('');
  };

  // Enter 키 처리
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 대면 상담 요청 핸들러
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

      // 폼 초기화
      setConsultationForm({
        title: '',
        date: '',
        time: ''
      });

      alert('상담 요청이 전송되었습니다.');
    }
  };

  // 채팅방 이름 생성 함수
  const getRoomDisplayName = (room) => {
    if (room.room_type === 'group') {
      // 단체방: 학년반 표시
      if (classroomInfo) {
        return `${classroomInfo.grade}학년 ${classroomInfo.class_number}반`;
      }
      return '학급 단체방';
    } else {
      // 1:1 채팅: 상대방 정보 표시
      const participants = roomParticipants[room.room_id] || [];
      const otherParticipant = participants.find(p => p.user_id !== userId);
      
      if (otherParticipant) {
        if (otherParticipant.role === 'teacher') {
          return `선생님 (${otherParticipant.name})`;
        } else if (otherParticipant.role === 'parent') {
          // 학부모의 경우 이름과 자녀 이름 표시
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

  // 채팅방 헤더 부제목 생성 함수
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

  // 메시지 발신자 이름 표시 개선
  const getSenderDisplayName = (message) => {
    if (message.sender_id === userId) {
      return '나';
    }
    
    if (message.sender_role === 'teacher') {
      return `선생님 (${message.sender_name})`;
    } else if (message.sender_role === 'parent') {
      if (message.sender_child_name) {
        return `${message.sender_name} (${message.sender_child_name} 부모님)`;
      } else {
        return `${message.sender_name} (학부모)`;
      }
    }
    
    return message.sender_name;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">채팅방을 불러오는 중...</div>

        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            gap: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .loading-text {
            color: white;
            font-size: 1.1rem;
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <h3 className="error-title">❌ 오류 발생</h3>
          <p className="error-message">{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
        </div>

        <style jsx>{`
          .error-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem;
          }

          .error-content {
            background: white;
            border-radius: 20px;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 100%;
          }

          .error-title {
            font-size: 1.5rem;
            color: #dc3545;
            margin: 0 0 1rem 0;
          }

          .error-message {
            color: #64748b;
            margin: 0 0 1.5rem 0;
            line-height: 1.5;
          }

          .retry-button {
            padding: 0.75rem 2rem;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .retry-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* 헤더 */}
        <div className="chat-header">
          <div className="header-content">
            <h2 className="header-title">
              💬 {classroomInfo ? `${classroomInfo.grade}학년 ${classroomInfo.class_number}반 채팅` : '채팅'}
            </h2>
            {isMobile && (
              <button 
                className="sidebar-toggle"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                {showSidebar ? '✕' : '☰'}
              </button>
            )}
          </div>
        </div>

        <div className="chat-layout">
          {/* 사이드바 - 채팅방 목록 */}
          <div className={`sidebar ${showSidebar ? 'show' : 'hide'}`}>
            <div className="sidebar-header">
              <h3 className="sidebar-title">채팅방 목록</h3>
            </div>
            
            <div className="rooms-list">
              {rooms.length === 0 ? (
                <div className="empty-rooms">
                  <div className="empty-icon">💬</div>
                  <p className="empty-text">채팅방이 없습니다</p>
                </div>
              ) : (
                rooms.map(room => (
                  <div
                    key={room.room_id}
                    className={`room-item ${selectedRoom?.room_id === room.room_id ? 'active' : ''}`}
                    onClick={() => handleRoomClick(room)}
                  >
                    <div className="room-icon">
                      {room.room_type === 'group' ? '👥' : '💬'}
                    </div>
                    <div className="room-info">
                      <div className="room-name">{getRoomDisplayName(room)}</div>
                      <div className="room-subtitle">{getRoomSubtitle(room)}</div>
                    </div>
                    {room.unread_count > 0 && (
                      <div className="unread-badge">{room.unread_count}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 메인 채팅 영역 */}
          <div className="chat-main">
            {selectedRoom ? (
              <>
                {/* 채팅방 헤더 */}
                <div className="chat-room-header">
                  <div className="room-header-info">
                    <div className="room-header-icon">
                      {selectedRoom.room_type === 'group' ? '👥' : '💬'}
                    </div>
                    <div className="room-header-text">
                      <h3 className="room-header-name">{getRoomDisplayName(selectedRoom)}</h3>
                      <p className="room-header-subtitle">{getRoomSubtitle(selectedRoom)}</p>
                    </div>
                  </div>
                  
                  {/* 상담 요청 버튼 (학부모만, 1:1 채팅에서만) */}
                  {userRole === 'parent' && selectedRoom.room_type === 'private' && (
                    <button className="consultation-button" onClick={() => {
                      const form = document.getElementById('consultation-form');
                      form.style.display = form.style.display === 'block' ? 'none' : 'block';
                    }}>
                      📅 상담 요청
                    </button>
                  )}
                </div>

                {/* 상담 요청 폼 */}
                {userRole === 'parent' && selectedRoom.room_type === 'private' && (
                  <div id="consultation-form" className="consultation-form">
                    <h4 className="form-title">📅 대면 상담 요청</h4>
                    <div className="form-group">
                      <label className="form-label">상담 내용</label>
                      <input
                        type="text"
                        value={consultationForm.title}
                        onChange={(e) => setConsultationForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="상담 받고 싶은 내용을 간단히 적어주세요"
                        className="form-input"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">희망 날짜</label>
                        <input
                          type="date"
                          value={consultationForm.date}
                          onChange={(e) => setConsultationForm(prev => ({ ...prev, date: e.target.value }))}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">희망 시간</label>
                        <input
                          type="time"
                          value={consultationForm.time}
                          onChange={(e) => setConsultationForm(prev => ({ ...prev, time: e.target.value }))}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <button 
                      className="form-submit"
                      onClick={handleConsultationRequest}
                    >
                      상담 요청 전송
                    </button>
                  </div>
                )}

                {/* 메시지 영역 */}
                <div className="messages-container">
                  {messages.length === 0 ? (
                    <div className="empty-messages">
                      <div className="empty-icon">💬</div>
                      <p className="empty-text">아직 메시지가 없습니다</p>
                      <p className="empty-subtext">첫 번째 메시지를 보내보세요!</p>
                    </div>
                  ) : (
                    <div className="messages-list">
                      {messages.map((message, index) => (
                        <div key={index} className="message-wrapper">
                          <div className={`message-bubble ${message.sender_id === userId ? 'my-message' : 'other-message'}`}>
                            {message.sender_id !== userId && (
                              <div className="sender-name">{getSenderDisplayName(message)}</div>
                            )}
                            <div className="message-content">{message.content}</div>
                            <div className="message-time">
                              {new Date(message.sent_at).toLocaleTimeString([], {
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

                {/* 메시지 입력 영역 */}
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
                <h3 className="no-selection-title">채팅방을 선택하세요</h3>
                <p className="no-selection-text">왼쪽에서 채팅방을 선택하여 대화를 시작하세요</p>
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
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .chat-header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          padding: 1.5rem 2rem;
          color: white;
          flex-shrink: 0;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-title {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .sidebar-toggle {
          display: none;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 1.5rem;
          padding: 0.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .sidebar-toggle:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .chat-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .sidebar {
          width: 320px;
          background: var(--bg-secondary, #f8fafc);
          border-right: 1px solid var(--border-color, #e2e8f0);
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .sidebar.hide {
          width: 0;
          opacity: 0;
          overflow: hidden;
        }

        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-primary, #ffffff);
        }

        .sidebar-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0;
        }

        .rooms-list {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .empty-rooms {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-secondary, #64748b);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 1.1rem;
          margin: 0;
        }

        .room-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 0.5rem;
          background: var(--bg-primary, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .room-item:hover {
          background: var(--bg-hover, #f1f5f9);
          transform: translateX(4px);
        }

        .room-item.active {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .room-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .room-info {
          flex: 1;
          min-width: 0;
        }

        .room-name {
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .room-subtitle {
          font-size: 0.8rem;
          opacity: 0.7;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .unread-badge {
          background: #ef4444;
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.5rem;
          border-radius: 10px;
          min-width: 20px;
          text-align: center;
          flex-shrink: 0;
        }

        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-room-header {
          background: var(--bg-primary, #ffffff);
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .room-header-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .room-header-icon {
          font-size: 2rem;
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .room-header-text {
          min-width: 0;
        }

        .room-header-name {
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0 0 0.25rem 0;
        }

        .room-header-subtitle {
          font-size: 0.9rem;
          color: var(--text-secondary, #64748b);
          margin: 0;
        }

        .consultation-button {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .consultation-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }

        .consultation-form {
          display: none;
          background: var(--bg-secondary, #f8fafc);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          padding: 1.5rem;
          margin: 1rem 2rem;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .form-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0 0 1rem 0;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-label {
          display: block;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary, #1e293b);
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 8px;
          font-size: 0.95rem;
          background: var(--bg-primary, #ffffff);
          color: var(--text-primary, #1e293b);
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-submit {
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .form-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          background: var(--bg-primary, #ffffff);
        }

        .empty-messages {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-secondary, #64748b);
          text-align: center;
          padding: 2rem;
        }

        .empty-messages .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-messages .empty-text {
          font-size: 1.2rem;
          font-weight: 500;
          margin: 0 0 0.5rem 0;
        }

        .empty-subtext {
          font-size: 0.9rem;
          margin: 0;
          opacity: 0.8;
        }

        .messages-list {
          padding: 1rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .message-wrapper {
          display: flex;
          width: 100%;
        }

        .message-bubble {
          max-width: 70%;
          border-radius: 20px;
          padding: 0.75rem 1rem;
          word-wrap: break-word;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          animation: messageSlideIn 0.3s ease-out;
        }

        @keyframes messageSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .my-message {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          margin-left: auto;
          border-bottom-right-radius: 8px;
        }

        .other-message {
          background: var(--bg-secondary, #f8fafc);
          color: var(--text-primary, #1e293b);
          margin-right: auto;
          border: 1px solid var(--border-color, #e2e8f0);
          border-bottom-left-radius: 8px;
        }

        .sender-name {
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          opacity: 0.8;
        }

        .message-content {
          font-size: 0.95rem;
          line-height: 1.4;
          margin-bottom: 0.25rem;
          white-space: pre-wrap;
        }

        .message-time {
          font-size: 0.7rem;
          opacity: 0.7;
          text-align: right;
        }

        .no-selection {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: var(--text-secondary, #64748b);
          text-align: center;
          padding: 2rem;
        }

        .no-selection-icon {
          font-size: 5rem;
          margin-bottom: 1.5rem;
          opacity: 0.3;
        }

        .no-selection-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .no-selection-text {
          font-size: 1rem;
          margin: 0;
          opacity: 0.8;
        }

        .input-container {
          display: flex;
          padding: 1.5rem 2rem;
          border-top: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-primary, #ffffff);
          gap: 1rem;
          align-items: flex-end;
          flex-shrink: 0;
        }

        .message-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 20px;
          font-size: 0.95rem;
          background: var(--bg-primary, #ffffff);
          color: var(--text-primary, #1e293b);
          outline: none;
          transition: all 0.2s ease;
          resize: none;
          max-height: 120px;
          min-height: 44px;
          font-family: inherit;
        }

        .message-input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .send-button {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
        }

        .send-button:disabled {
          background: var(--text-secondary, #64748b);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .chat-page {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --bg-hover: #475569;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .chat-page {
            padding: 0;
          }

          .chat-container {
            height: 100vh;
            border-radius: 0;
          }

          .chat-header {
            padding: 1rem 1.5rem;
          }

          .sidebar-toggle {
            display: block;
          }

          .sidebar {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            z-index: 10;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
          }

          .sidebar.hide {
            transform: translateX(-100%);
            width: 320px;
          }

          .sidebar.show {
            transform: translateX(0);
          }

          .chat-room-header {
            padding: 1rem 1.5rem;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .room-header-info {
            min-width: 0;
            flex: 1;
          }

          .consultation-button {
            width: 100%;
            order: 3;
            flex-basis: 100%;
          }

          .consultation-form {
            margin: 1rem 1.5rem;
            padding: 1rem;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .messages-list {
            padding: 1rem 1.5rem;
          }

          .input-container {
            padding: 1rem 1.5rem;
          }

          .message-bubble {
            max-width: 85%;
          }

          .no-selection {
            padding: 1.5rem;
          }

          .no-selection-icon {
            font-size: 4rem;
          }
        }

        @media (max-width: 480px) {
          .chat-header {
            padding: 0.75rem 1rem;
          }

          .header-title {
            font-size: 1.3rem;
          }

          .sidebar {
            width: 280px;
          }

          .sidebar.hide {
            width: 280px;
          }

          .sidebar-header {
            padding: 1rem;
          }

          .rooms-list {
            padding: 0.75rem;
          }

          .room-item {
            padding: 0.75rem;
          }

          .chat-room-header {
            padding: 0.75rem 1rem;
          }

          .room-header-icon {
            width: 40px;
            height: 40px;
            font-size: 1.5rem;
          }

          .room-header-name {
            font-size: 1.1rem;
          }

          .consultation-form {
            margin: 0.75rem 1rem;
            padding: 1rem;
          }

          .messages-list {
            padding: 0.75rem 1rem;
          }

          .input-container {
            padding: 0.75rem 1rem;
            gap: 0.75rem;
          }

          .send-button {
            width: 40px;
            height: 40px;
            font-size: 1rem;
          }

          .message-bubble {
            max-width: 90%;
            padding: 0.6rem 0.8rem;
          }
        }

        /* 접근성 */
        .room-item:focus,
        .consultation-button:focus,
        .form-submit:focus,
        .send-button:focus {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }

        /* 스크롤바 스타일 */
        .rooms-list::-webkit-scrollbar,
        .messages-container::-webkit-scrollbar {
          width: 6px;
        }

        .rooms-list::-webkit-scrollbar-track,
        .messages-container::-webkit-scrollbar-track {
          background: var(--bg-secondary, #f8fafc);
        }

        .rooms-list::-webkit-scrollbar-thumb,
        .messages-container::-webkit-scrollbar-thumb {
          background: var(--border-color, #e2e8f0);
          border-radius: 3px;
        }

        .rooms-list::-webkit-scrollbar-thumb:hover,
        .messages-container::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary, #64748b);
        }

        /* 애니메이션 성능 최적화 */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ChatPage;