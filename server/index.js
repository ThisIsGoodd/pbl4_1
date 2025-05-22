require('./config');

const express = require('express');
const cors = require('cors');
const passport = require('passport');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const db = require('./db');
const authenticateToken = require('./authMiddleware');
require('./config/passport');

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
const { createNotification } = require('./utils/notify');

// ✅ 라우터 등록 (경로 명확하게 분리)
app.use('/api/auth', authRoutes);                      // 로그인/인증 관련
app.use('/api/users', userRoutes);                    // 사용자 관련
app.use('/api/admin', adminRoutes);                   // 학교 관리자 기능
app.use('/api/classrooms', classroomRoutes);          // 학급 관련
app.use('/api/posts', postRoutes);                    // 게시판
app.use('/api/comments', commentRoutes);              // 댓글
app.use('/api/schedules', scheduleRoutes);            // 일정
app.use('/api/schools', schoolRoutes);                // 학교/초대코드
app.use('/api/notifications', notificationRoutes);    // 알림 목록
app.use('/api/notification-settings', notificationSettingsRoutes); // 알림 설정
app.use('/api/chat', chatRoutes);                     // 채팅
app.use('/api/superadmin', superAdminRoutes);         // 개발자 전용

// ✅ 루트 확인용 API
app.get('/', (req, res) => {
  res.send('✅ 백엔드 서버가 잘 동작합니다!');
});

// ✅ socket.io 이벤트 처리
io.on('connection', (socket) => {
  console.log('✅ 사용자 연결됨:', socket.id);

  // 방 참가
  socket.on('joinRoom', (roomId) => {
    socket.join(`room_${roomId}`);
    console.log(`👉 ${socket.id}가 room_${roomId}에 참가`);
  });

  // 메시지 전송
  socket.on('sendMessage', async ({ roomId, userId, content }) => {
    try {
      // 1. DB 저장
      await db.query(
        'INSERT INTO chat_messages (room_id, sender_id, content) VALUES (?, ?, ?)',
        [roomId, userId, content]
      );
  
      const message = {
        sender_id: userId,
        content,
        sent_at: new Date()
      };
  
      // 2. 수신자 목록 조회 (본인 제외)
      const [participants] = await db.query(
        `SELECT user_id FROM chat_participants WHERE room_id = ? AND user_id != ?`,
        [roomId, userId]
      );
  
      // 3. 각 수신자에게 알림 생성
      for (const participant of participants) {
        await createNotification({
          userId: participant.user_id,
          type: 'chat',
          relatedId: roomId,
          message: '새로운 채팅 메시지가 도착했습니다.'
        });
      }
  
      // 4. 소켓으로 메시지 전송
      io.to(`room_${roomId}`).emit('receiveMessage', message);
    } catch (err) {
      console.error('❌ 채팅/알림 처리 오류:', err);
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
