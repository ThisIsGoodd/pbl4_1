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

  const token = localStorage.getItem('token');
  const userId = JSON.parse(atob(token.split('.')[1])).user_id;
  const messagesEndRef = useRef(null);

  // ✅ 학급 정보 불러오기
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

  // ✅ 채팅방 목록 불러오기
  useEffect(() => {
    const fetchRooms = async () => {
      if (!classroomId) return;

      try {
        console.log('🔍 채팅방 목록 요청:', classroomId);
        
        const res = await fetch(`http://localhost:3001/api/chat/rooms?classroom_id=${classroomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('📡 채팅방 응답 상태:', res.status);
        
        const data = await res.json();
        console.log('📦 채팅방 데이터:', data);
        
        if (res.ok) {
          setRooms(data.rooms || []);
          if (data.rooms && data.rooms.length === 0) {
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
  }, [classroomId, token]);

  // ✅ Socket.io 메시지 수신 + 에러 핸들링
  useEffect(() => {
    // 새 메시지 수신
    socket.on('receiveMessage', (msg) => {
      console.log('📨 새 메시지 수신:', msg);
      setMessages(prev => [...prev, msg]);
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
  }, []);

  // ✅ 메시지 목록 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ 채팅방 클릭 핸들러 (markRoomAsRead 추가)
  const handleRoomClick = async (room) => {
    console.log('🏠 채팅방 선택:', room);
    
    setSelectedRoom(room);
    
    // Socket.io 방 참가
    socket.emit('joinRoom', room.room_id);
    
    // 🆕 읽음 처리 (중요!)
    socket.emit('markRoomAsRead', { 
      roomId: room.room_id, 
      userId: userId 
    });
    
    console.log('📖 읽음 처리 요청:', { roomId: room.room_id, userId });

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

  // ✅ 메시지 전송 핸들러
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

  // ✅ Enter 키 처리
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>⏳ 채팅방을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <h3>❌ 오류 발생</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          새로고침
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: '1rem' }}>
        {classroomInfo
          ? `${classroomInfo.grade}학년 ${classroomInfo.class_number}반 채팅`
          : '채팅'}
      </h2>

      <div style={{ display: 'flex', height: '70vh' }}>
        {/* 좌측: 채팅방 목록 */}
        <div style={{ width: '25%', borderRight: '1px solid #ccc', padding: '1rem' }}>
          <h3>채팅방 목록</h3>
          {rooms.length === 0 ? (
            <p style={{ color: '#999' }}>채팅방이 없습니다.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {rooms.map(r => (
                <li
                  key={r.room_id}
                  style={{
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    backgroundColor: selectedRoom?.room_id === r.room_id ? '#e6f3ff' : 'transparent',
                    borderRadius: '4px',
                    border: selectedRoom?.room_id === r.room_id ? '2px solid #007bff' : '1px solid #ddd'
                  }}
                  onClick={() => handleRoomClick(r)}
                >
                  <div style={{ fontWeight: selectedRoom?.room_id === r.room_id ? 'bold' : 'normal' }}>
                    {r.room_type === 'group' ? '👥 학급 단체방' : '💬 1:1 채팅'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>
                    방 번호: {r.room_id}
                    {r.unread_count > 0 && (
                      <span style={{
                        marginLeft: '0.5rem',
                        backgroundColor: 'red',
                        color: 'white',
                        borderRadius: '50%',
                        padding: '2px 6px',
                        fontSize: '0.7rem'
                      }}>
                        {r.unread_count}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 우측: 메시지 영역 */}
        <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', borderBottom: '1px solid #ddd', padding: '1rem' }}>
            {selectedRoom ? (
              <>
                <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <strong>
                    {selectedRoom.room_type === 'group' ? '👥 학급 단체방' : '💬 1:1 채팅'}
                  </strong>
                </div>
                {messages.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#999' }}>메시지가 없습니다. 첫 메시지를 보내보세요!</p>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} style={{ 
                      margin: '1rem 0',
                      padding: '0.5rem',
                      backgroundColor: m.sender_id === userId ? '#007bff' : '#f8f9fa',
                      color: m.sender_id === userId ? 'white' : 'black',
                      borderRadius: '8px',
                      alignSelf: m.sender_id === userId ? 'flex-end' : 'flex-start',
                      maxWidth: '70%'
                    }}>
                      <div style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                        <strong>{m.sender_name || (m.sender_id === userId ? '나' : '상대방')}</strong>{' '}
                        <small>{new Date(m.sent_at || m.created_at).toLocaleTimeString()}</small>
                      </div>
                      <p style={{ margin: 0 }}>{m.content}</p>
                    </div>
                  ))
                )}
              </>
            ) : (
              <p style={{ textAlign: 'center', color: '#999' }}>채팅방을 선택해주세요.</p>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력창 */}
          {selectedRoom && (
            <div style={{ display: 'flex', marginTop: '1rem', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="메시지 입력..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{ 
                  flex: 1, 
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
              <button 
                onClick={handleSend}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                전송
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;