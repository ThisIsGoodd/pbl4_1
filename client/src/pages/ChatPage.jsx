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
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroom_id');

  const token = localStorage.getItem('token');
  const userId = JSON.parse(atob(token.split('.')[1])).user_id;
  const messagesEndRef = useRef(null);

  // ✅ 학급 정보 불러오기
  useEffect(() => {
    const fetchClassroomInfo = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setClassroomInfo(data);
        }
      } catch (err) {
        console.error('학급 정보 불러오기 실패:', err);
      }
    };

    if (classroomId) {
      fetchClassroomInfo();
    }
  }, [classroomId, token]);

  // ✅ 채팅방 목록 불러오기
  useEffect(() => {
    if (!classroomId) return;

    fetch(`http://localhost:3001/api/chat/rooms?classroom_id=${classroomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.rooms) setRooms(data.rooms);
      });
  }, [classroomId]);

  // ✅ 메시지 수신 + 스크롤
  useEffect(() => {
    socket.on('receiveMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('receiveMessage');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleRoomClick = async (room) => {
    setSelectedRoom(room);
    socket.emit('joinRoom', room.room_id);

    const res = await fetch(`http://localhost:3001/api/chat/rooms/${room.room_id}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.messages) setMessages(data.messages);
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedRoom) return;

    socket.emit('sendMessage', {
      roomId: selectedRoom.room_id,
      userId,
      content: newMessage
    });

    setNewMessage('');
  };

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
          <ul>
            {rooms.map(r => (
              <li
                key={r.room_id}
                style={{
                  marginBottom: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: selectedRoom?.room_id === r.room_id ? 'bold' : 'normal'
                }}
                onClick={() => handleRoomClick(r)}
              >
                [{r.room_type === 'group' ? '학급 단체방' : '1:1 채팅'}] #{r.room_id}
              </li>
            ))}
          </ul>
        </div>

        {/* 우측: 메시지 영역 */}
        <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', borderBottom: '1px solid #ddd' }}>
            {selectedRoom ? (
              messages.map((m, i) => (
                <div key={i} style={{ margin: '1rem 0' }}>
                  <strong>{m.sender_name || (m.sender_id === userId ? '나' : '상대방')}</strong>{' '}
                  <small>{new Date(m.sent_at).toLocaleString()}</small>
                  <p>{m.content}</p>
                </div>
              ))
            ) : (
              <p>채팅방을 선택해주세요.</p>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력창 */}
          <div style={{ display: 'flex', marginTop: '1rem' }}>
            <input
              type="text"
              placeholder="메시지 입력..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              style={{ flex: 1, padding: '0.5rem' }}
            />
            <button onClick={handleSend} style={{ marginLeft: '0.5rem' }}>전송</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
