// App.jsx
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import RequireAuth from './components/RequireAuth';
import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import PostPage from './pages/PostPage';
import SchedulePage from './pages/SchedulePage';
import PostDetailPage from './pages/PostDetailPage';
import PostWritePage from './pages/PostWritePage';
import ProfilePage from './pages/ProfilePage';
import RoleSelectPage from './pages/RoleSelectPage';
import TeacherAuthPage from './pages/TeacherAuthPage';
import MainPage from './pages/MainPage';
import NotificationsPage from './pages/NotificationsPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import ChatPage from './pages/ChatPage';
import SuperAdminSchoolRequestPage from './pages/SuperAdminSchoolRequestPage';
import JoinInvitePage from './pages/JoinInvitePage';
import JoinInfoPage from './pages/JoinInfoPage';
import ClassroomCreatePage from './pages/ClassroomCreatePage';
import ClassroomDashboardPage from './pages/ClassroomDashboardPage';
import SchoolPendingPage from './pages/SchoolPendingPage';
import RequestSchoolPage from './pages/RequestSchoolPage';
import SuperAdminSchoolPage from './pages/SuperAdminSchoolPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminMainPage from './pages/AdminMainPage';
import InquiryFormPage from './pages/InquiryFormPage';
import SuperAdminInquiriesPage from './pages/SuperAdminInquiriesPage';
import ClassroomListPage from './pages/ClassroomListPage';

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

  // 로그인 페이지에서는 네비게이션 바를 숨김
  const hideNavigation = location.pathname === '/';

  return (
    <>
      {!hideNavigation && <Navigation />}
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route path="/select-role" element={
          <RequireAuth><RoleSelectPage /></RequireAuth>
        } />
        <Route path="/posts" element={
          <RequireAuth><PostPage /></RequireAuth>
        } />
        <Route path="/posts/:id" element={
          <RequireAuth><PostDetailPage /></RequireAuth>
        } />
        <Route path="/schedules" element={
          <RequireAuth><SchedulePage /></RequireAuth>
        } />
        <Route path="/posts/write" element={
          <RequireAuth><PostWritePage /></RequireAuth>
        } />
        <Route path="/settings" element={
          <RequireAuth><ProfilePage /></RequireAuth>
        } />
        <Route path="/teacher/auth" element={
          <RequireAuth><TeacherAuthPage /></RequireAuth>
        } />
        <Route path="/main" element={
          <RequireAuth><MainPage /></RequireAuth>
        } />
        <Route path="/notifications" element={
          <RequireAuth><NotificationsPage /></RequireAuth>
        } />
        <Route path="/notification-settings" element={
          <RequireAuth><NotificationSettingsPage /></RequireAuth>
        } />
        <Route path="/chat" element={
          <RequireAuth><ChatPage /></RequireAuth>
        } />
        <Route path="/join/invite" element={<JoinInvitePage />} />
        <Route path="/join/info" element={<JoinInfoPage />} />
        <Route path="/classroom/create" element={
          <RequireAuth><ClassroomCreatePage /></RequireAuth>
        } />
        <Route path="/classroom/dashboard" element={
          <RequireAuth><ClassroomDashboardPage /></RequireAuth>
        } />
        <Route path="/school-pending" element={
          <RequireAuth><SchoolPendingPage /></RequireAuth>
        } />
        <Route path="/request-school" element={
          <RequireAuth><RequestSchoolPage /></RequireAuth>
        } />
        <Route path="/superadmin/schools" element={
          <RequireAuth><SuperAdminSchoolPage /></RequireAuth>
        } />
        <Route path="/superadmin/school-requests" element={
          <RequireAuth><SuperAdminSchoolRequestPage /></RequireAuth>
        } />
        <Route path="/superadmin/inquiries" element={
          <RequireAuth><SuperAdminInquiriesPage /></RequireAuth>
        } />
        <Route path="/admindashboard" element={
          <RequireAuth><AdminDashboard /></RequireAuth>
        } />
        <Route path="/admin/main" element={
          <RequireAuth><AdminMainPage /></RequireAuth>
        } />
        <Route path="/inquiry/form" element={
          <RequireAuth><InquiryFormPage /></RequireAuth>
        } />
        <Route path="/classrooms" element={
          <RequireAuth><ClassroomListPage /></RequireAuth>
        } />
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