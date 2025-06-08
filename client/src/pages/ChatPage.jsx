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
  const classroomId = searchParams.get('classroom_id');

  // 🔥 추가: 각 방의 참가자 정보 저장
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

  // 🔥 수정: 채팅방 목록 불러오기 + 참가자 정보 조회
  useEffect(() => {
    const fetchRooms = async () => {
      if (!classroomId) return;

      try {
        console.log('🔍 채팅방 목록 요청:', classroomId);
        
        const res = await fetch(`http://localhost:3001/api/chat/rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('📡 채팅방 응답 상태:', res.status);
        
        const data = await res.json();
        console.log('📦 채팅방 데이터:', data);
        
        if (res.ok) {
          // 해당 학급과 관련된 채팅방만 필터링
          const filteredRooms = (data.rooms || []).filter(room => 
            room.classroom_id == classroomId || room.room_type === 'private'
          );
          setRooms(filteredRooms);

          // 🔥 각 채팅방의 참가자 정보 조회
          const participantsData = {};
          for (const room of filteredRooms) {
            try {
              const participantsRes = await fetch(`http://localhost:3001/api/chat/rooms/${room.room_id}/participants`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (participantsRes.ok) {
                const participantsResult = await participantsRes.json();
                participantsData[room.room_id] = participantsResult.participants;
              }
            } catch (err) {
              console.error('참가자 정보 조회 실패:', room.room_id, err);
            }
          }
          setRoomParticipants(participantsData);
          
          if (filteredRooms.length === 0) {
            setError('채팅방이 없습니다. 학급에 제대로 가입되었는지 확인해주세요.');
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

  // 🔥 수정된 채팅방 이름 생성 함수
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

  // 🔥 추가: 채팅방 헤더 부제목 생성 함수
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

  // 🔥 추가: 메시지 발신자 이름 표시 개선
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
      <div style={styles.loadingContainer}>
        <p>⏳ 채팅방을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h3>❌ 오류 발생</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          새로고침
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>
        {classroomInfo
          ? `${classroomInfo.grade}학년 ${classroomInfo.class_number}반 채팅`
          : '채팅'}
      </h2>

      <div style={styles.chatContainer}>
        {/* 왼쪽: 채팅방 목록 */}
        <div style={styles.sidebar}>
          <div style={styles.roomListHeader}>
            <h3>채팅방 목록</h3>
          </div>
          
          {rooms.length === 0 ? (
            <p style={styles.noRooms}>채팅방이 없습니다.</p>
          ) : (
            <div style={styles.roomList}>
              {rooms.map(room => (
                <div
                  key={room.room_id}
                  style={{
                    ...styles.roomItem,
                    ...(selectedRoom?.room_id === room.room_id ? styles.roomItemActive : {})
                  }}
                  onClick={() => handleRoomClick(room)}
                >
                  <div style={styles.roomIcon}>
                    {room.room_type === 'group' ? '👥' : '💬'}
                  </div>
                  <div style={styles.roomInfo}>
                    <div style={styles.roomName}>
                      {getRoomDisplayName(room)}
                    </div>
                    {room.unread_count > 0 && (
                      <div style={styles.unreadText}>
                        읽지 않은 메시지 {room.unread_count}개
                      </div>
                    )}
                  </div>
                  {room.unread_count > 0 && (
                    <div style={styles.unreadBadge}>
                      {room.unread_count}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 대면 상담 요청 폼 (학부모만) */}
          {userRole === 'parent' && (
            <div style={styles.consultationSection}>
              <h4 style={styles.consultationTitle}>📅 대면 상담 요청</h4>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>상담 내용</label>
                <input
                  type="text"
                  value={consultationForm.title}
                  onChange={(e) => setConsultationForm(prev => ({...prev, title: e.target.value}))}
                  placeholder="상담하고 싶은 내용을 간단히 입력해주세요"
                  style={styles.formInput}
                  maxLength={50}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>희망 날짜</label>
                  <input
                    type="date"
                    value={consultationForm.date}
                    onChange={(e) => setConsultationForm(prev => ({...prev, date: e.target.value}))}
                    style={styles.formInput}
                    min={new Date().toISOString().split('T')[0]} // 오늘 이후만 선택 가능
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>희망 시간</label>
                  <input
                    type="time"
                    value={consultationForm.time}
                    onChange={(e) => setConsultationForm(prev => ({...prev, time: e.target.value}))}
                    style={styles.formInput}
                  />
                </div>
              </div>
              
              <button 
                style={{
                  ...styles.consultationButton,
                  opacity: (!consultationForm.title.trim() || !consultationForm.date || !consultationForm.time || !selectedRoom || selectedRoom.room_type !== 'private') ? 0.5 : 1,
                  cursor: (!consultationForm.title.trim() || !consultationForm.date || !consultationForm.time || !selectedRoom || selectedRoom.room_type !== 'private') ? 'not-allowed' : 'pointer'
                }}
                onClick={handleConsultationRequest}
                disabled={!consultationForm.title.trim() || !consultationForm.date || !consultationForm.time || !selectedRoom || selectedRoom.room_type !== 'private'}
              >
                📅 상담 요청하기
              </button>
              
              <p style={styles.consultationNote}>
                {!selectedRoom ? '1:1 채팅방을 선택하세요' : 
                 selectedRoom.room_type !== 'private' ? '1:1 채팅방에서만 상담 요청 가능' :
                 '선생님께 대면 상담을 요청할 수 있습니다'}
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 메시지 영역 */}
        <div style={styles.chatArea}>
          {selectedRoom ? (
            <>
              {/* 채팅방 헤더 */}
              <div style={styles.chatHeader}>
                <div style={styles.chatHeaderIcon}>
                  {selectedRoom.room_type === 'group' ? '👥' : '💬'}
                </div>
                <div style={styles.chatHeaderInfo}>
                  <h4 style={styles.chatHeaderTitle}>
                    {getRoomDisplayName(selectedRoom)}
                  </h4>
                  <span style={styles.chatHeaderSubtitle}>
                    {getRoomSubtitle(selectedRoom)}
                  </span>
                </div>
              </div>

              {/* 메시지 목록 */}
              <div style={styles.messageContainer}>
                {messages.length === 0 ? (
                  <div style={styles.noMessages}>
                    <p>메시지가 없습니다. 첫 메시지를 보내보세요!</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isMyMessage = message.sender_id === userId;
                    return (
                      <div
                        key={index}
                        style={{
                          ...styles.messageWrapper,
                          justifyContent: isMyMessage ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div
                          style={{
                            ...styles.messageBubble,
                            ...(isMyMessage ? styles.myMessage : styles.otherMessage)
                          }}
                        >
                          {!isMyMessage && (
                            <div style={styles.senderName}>
                              {getSenderDisplayName(message)}
                            </div>
                          )}
                          <div style={styles.messageContent}>
                            {message.content}
                          </div>
                          <div style={styles.messageTime}>
                            {new Date(message.sent_at || message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 메시지 입력창 */}
              <div style={styles.inputContainer}>
                <input
                  type="text"
                  placeholder="메시지를 입력하세요..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={styles.messageInput}
                />
                <button 
                  onClick={handleSend}
                  style={styles.sendButton}
                  disabled={!newMessage.trim()}
                >
                  <span>➤</span>
                </button>
              </div>
            </>
          ) : (
            <div style={styles.noSelection}>
              <div style={styles.noSelectionIcon}>💬</div>
              <h3>채팅방을 선택해주세요</h3>
              <p>왼쪽에서 채팅방을 선택하면 대화를 시작할 수 있습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa'
  },

  header: {
    padding: '1rem 2rem',
    backgroundColor: 'white',
    borderBottom: '1px solid #e9ecef',
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#333'
  },

  chatContainer: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },

  sidebar: {
    width: '350px',
    backgroundColor: 'white',
    borderRight: '1px solid #e9ecef',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },

  roomListHeader: {
    padding: '1rem',
    borderBottom: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa'
  },

  roomList: {
    flex: 1,
    overflowY: 'auto'
  },

  roomItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem',
    borderBottom: '1px solid #f1f3f4',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#f8f9fa'
    }
  },

  roomItemActive: {
    backgroundColor: '#e3f2fd'
  },

  roomIcon: {
    fontSize: '1.5rem',
    marginRight: '1rem',
    width: '40px',
    textAlign: 'center'
  },

  roomInfo: {
    flex: 1,
    minWidth: 0
  },

  roomName: {
    fontWeight: '600',
    fontSize: '0.95rem',
    marginBottom: '0.25rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },

  unreadText: {
    fontSize: '0.8rem',
    color: '#666'
  },

  unreadBadge: {
    backgroundColor: '#dc3545',
    color: 'white',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },

  noRooms: {
    padding: '2rem',
    textAlign: 'center',
    color: '#6c757d',
    fontStyle: 'italic'
  },

  consultationSection: {
    padding: '1rem',
    borderTop: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa'
  },

  consultationTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#333'
  },

  formGroup: {
    marginBottom: '0.75rem'
  },

  formRow: {
    display: 'flex',
    gap: '0.5rem'
  },

  formLabel: {
    display: 'block',
    marginBottom: '0.25rem',
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#555'
  },

  formInput: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '0.85rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    '&:focus': {
      borderColor: '#007bff'
    }
  },

  consultationButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginBottom: '0.5rem'
  },

  consultationNote: {
    fontSize: '0.75rem',
    color: '#6c757d',
    textAlign: 'center',
    margin: 0,
    lineHeight: '1.3'
  },

  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'white'
  },

  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem',
    borderBottom: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa'
  },

  chatHeaderIcon: {
    fontSize: '1.5rem',
    marginRight: '1rem'
  },

  chatHeaderInfo: {
    flex: 1
  },

  chatHeaderTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#333'
  },

  chatHeaderSubtitle: {
    fontSize: '0.85rem',
    color: '#6c757d'
  },

  messageContainer: {
    flex: 1,
    padding: '1rem',
    overflowY: 'auto',
    backgroundColor: '#fafafa'
  },

  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f8f9fa'
  },

  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f8f9fa',
    color: '#dc3545'
  },

  noMessages: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    color: '#6c757d',
    fontStyle: 'italic'
  },

  messageWrapper: {
    display: 'flex',
    marginBottom: '0.75rem'
  },

  messageBubble: {
    maxWidth: '70%',
    borderRadius: '18px',
    padding: '0.75rem 1rem',
    wordWrap: 'break-word'
  },

  myMessage: {
    backgroundColor: '#007bff',
    color: 'white',
    marginLeft: 'auto'
  },

  otherMessage: {
    backgroundColor: '#e9ecef',
    color: '#495057',
    marginRight: 'auto'
  },

  senderName: {
    fontSize: '0.75rem',
    fontWeight: '500',
    marginBottom: '0.25rem',
    opacity: 0.8
  },

  messageContent: {
    fontSize: '0.95rem',
    lineHeight: '1.4',
    marginBottom: '0.25rem',
    whiteSpace: 'pre-wrap'
  },

  messageTime: {
    fontSize: '0.7rem',
    opacity: 0.7,
    textAlign: 'right'
  },

  noSelection: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    color: '#6c757d',
    textAlign: 'center'
  },

  noSelectionIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    opacity: 0.5
  },

  inputContainer: {
    display: 'flex',
    padding: '1rem',
    borderTop: '1px solid #e9ecef',
    backgroundColor: 'white',
    gap: '0.5rem'
  },

  messageInput: {
    flex: 1,
    padding: '0.75rem 1rem',
    border: '1px solid #ced4da',
    borderRadius: '24px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    '&:focus': {
      borderColor: '#007bff'
    }
  },

  sendButton: {
    width: '48px',
    height: '48px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    transition: 'background-color 0.2s',
    '&:disabled': {
      backgroundColor: '#6c757d',
      cursor: 'not-allowed'
    }
  }
};

export default ChatPage;