require('./config');

const express = require('express');
const cors = require('cors');
const passport = require('passport');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const db = require('./db');
const authenticateToken = require('./authMiddleware');
require('./config/passport');

// uploads 폴더 존재 확인 및 생성
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ uploads 폴더 생성됨:', uploadsDir);
} else {
  console.log('✅ uploads 폴더 존재함:', uploadsDir);
}

const app = express();
const server = http.createServer(app); // 서버 인스턴스를 socket.io와 공유
const io = socketIo(server, {
  cors: {
    origin: '*',
  }
});

const PORT = process.env.PORT || 3001;

// ✅ 공통 미들웨어
app.use(passport.initialize());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // 🔥 모든 uploads 파일에 다운로드 헤더 추가
    const filename = path.basename(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }
}));

// ✅ 라우터 불러오기
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const classroomRoutes = require('./routes/classrooms');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const scheduleRoutes = require('./routes/schedules');
const schoolRoutes = require('./routes/schools');
const notificationRoutes = require('./routes/notifications');
const notificationSettingsRoutes = require('./routes/notificationSettings');
const chatRoutes = require('./routes/chat');
const superAdminRoutes = require('./routes/superAdmin');
const inquiryRoutes = require('./routes/inquiries');
const { createNotification, setSocketIO } = require('./utils/notify');

// ✅ Socket.io 인스턴스를 notify 유틸에 전달
setSocketIO(io);

// ✅ 라우터 등록 - 알림 라우터 등록 확인
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/notifications', notificationRoutes); // 🔥 이 줄이 있는지 확인
app.use('/api/notification-settings', notificationSettingsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/superadmin', superAdminRoutes);

// ✅ 디버깅용: 라우터 등록 확인
console.log('🔍 라우터 등록 완료');
console.log('  - /api/notifications 라우터 등록됨');
console.log('  - /api/auth 라우터 등록됨');
console.log('  - /api/users 라우터 등록됨');
console.log('  - 기타 라우터들 등록됨');

// ✅ 루트 확인용 API
app.get('/', (req, res) => {
  res.send('✅ 백엔드 서버가 잘 동작합니다!');
});

// ✅ 디버깅용: 알림 라우트 테스트 엔드포인트
app.get('/api/test-notifications', (req, res) => {
  res.json({ message: '알림 라우터가 정상적으로 등록되었습니다.' });
});

// ✅ socket.io 이벤트 처리 (메시지 저장 기능 + 알림 room 참가 추가)
io.on('connection', (socket) => {
  console.log('✅ 사용자 연결됨:', socket.id);

  // 🆕 알림 room 참가
  socket.on('joinNotificationRoom', (userId) => {
    const roomName = `user_${userId}`;
    socket.join(roomName);
    console.log(`🔔 사용자 ${userId}가 알림 room ${roomName}에 참가`);
  });

  // 채팅 방 참가
  socket.on('joinRoom', (roomId) => {
    socket.join(`room_${roomId}`);
    console.log(`👉 ${socket.id}가 room_${roomId}에 참가`);
  });

  // 메시지 전송 (DB 저장 추가)
  socket.on('sendMessage', async ({ roomId, userId, content }) => {
    try {
      console.log('💬 메시지 전송:', { roomId, userId, content });

      // 1. DB에 메시지 저장 (sent_at 컬럼 사용)
      const [result] = await db.query(
        'INSERT INTO chat_messages (room_id, sender_id, content, sent_at) VALUES (?, ?, ?, NOW())',
        [roomId, userId, content]
      );
      
      console.log('✅ 메시지 DB 저장 완료:', result.insertId);

      // 2. 전송자 이름 조회
      const [userRows] = await db.query(
        'SELECT name FROM users WHERE user_id = ?',
        [userId]
      );
      const senderName = userRows[0]?.name || '익명';

      // 3. 실시간 메시지 전송 (DB 저장된 정보 포함)
      const message = {
        message_id: result.insertId,
        sender_id: userId,
        sender_name: senderName,
        content,
        sent_at: new Date()
      };

      io.to(`room_${roomId}`).emit('receiveMessage', message);
      console.log('📡 실시간 메시지 전송 완료');

      // 4. 간단한 알림 생성 (기존 로직 유지)
      const [participants] = await db.query(
        `SELECT user_id FROM chat_participants WHERE room_id = ? AND user_id != ?`,
        [roomId, userId]
      );

      for (const participant of participants) {
        await createNotification({
          userId: participant.user_id,
          type: 'chat',
          relatedId: roomId,
          message: '새로운 채팅 메시지가 도착했습니다.'
        });
      }

      console.log('🔔 알림 전송 완료:', participants.length, '명');

    } catch (err) {
      console.error('❌ 채팅 메시지 처리 오류:', err);
      
      // 에러 발생 시 클라이언트에 알림
      socket.emit('messageError', {
        error: '메시지 전송에 실패했습니다.'
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ 사용자 연결 종료:', socket.id);
  });
});

// ✅ 서버 시작
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});