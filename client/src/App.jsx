import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // 추가
import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ClassroomPage from './pages/ClassroomPage';
import PostPage from './pages/PostPage';
import SchedulePage from './pages/SchedulePage';

function App() {
  return (
    <Router>
      <AuthProvider> {/* 전역 로그인 상태 관리 */}
        <Navigation />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/classroom" element={<ClassroomPage />} />
          <Route path="/posts" element={<PostPage />} />
          <Route path="/schedules" element={<SchedulePage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
