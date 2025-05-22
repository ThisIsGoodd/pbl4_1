// App.jsx
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import PostPage from './pages/PostPage';
import SchedulePage from './pages/SchedulePage';
import PostDetailPage from './pages/PostDetailPage';
import PostWritePage from './pages/PostWritePage';
import ProfilePage from './pages/ProfilePage';
import RoleSelectPage from './pages/RoleSelectPage';
import JoinClassPage from './pages/JoinClassPage';
import TeacherAuthPage from './pages/TeacherAuthPage';
import MainPage from './pages/MainPage';
import NotificationsPage from './pages/NotificationsPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import ChatPage from './pages/ChatPage';
import SuperAdminSchoolRequestPage from './pages/SuperAdminSchoolRequestPage';
import JoinInvitePage from './pages/JoinInvitePage';
import JoinInfoPage from './pages/JoinInfoPage';
import JoinCompletePage from './pages/JoinCompletePage';
import ClassroomCreatePage from './pages/ClassroomCreatePage';
import ClassroomDashboardPage from './pages/ClassroomDashboardPage';

import { useContext, useEffect } from 'react';

function AppRoutes() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const exemptPaths = ['/', '/signup', '/select-role'];
    const isProtectedPath = !exemptPaths.includes(location.pathname);

    if (user && !user.role && isProtectedPath) {
      navigate('/select-role');
    }
  }, [user, location.pathname, navigate]);

  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/select-role" element={<RoleSelectPage />} />
        <Route path="/join-class" element={<JoinClassPage />} />
        <Route path="/posts" element={<PostPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />
        <Route path="/schedules" element={<SchedulePage />} />
        <Route path="/posts/write" element={<PostWritePage />} />
        <Route path="/settings" element={<ProfilePage />} />
        <Route path="/teacher-auth" element={<TeacherAuthPage />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/notification-settings" element={<NotificationSettingsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/superadmin/school-requests" element={<SuperAdminSchoolRequestPage />} />
        <Route path="/role-select" element={<RoleSelectPage />} />
        <Route path="/join/invite" element={<JoinInvitePage />} />
        <Route path="/join/info" element={<JoinInfoPage />} />
        <Route path="/join/complete" element={<JoinCompletePage />} />
        <Route path="/classroom/create" element={<ClassroomCreatePage />} />
        <Route path="/classroom" element={<ClassroomDashboardPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;