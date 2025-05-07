// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ClassroomPage from './pages/ClassroomPage';
import PostPage from './pages/PostPage';
import SchedulePage from './pages/SchedulePage';
import PostDetailPage from './pages/PostDetailPage';
import PostWritePage from './pages/PostWitrePage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navigation />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/classroom" element={<ClassroomPage />} />
          <Route path="/posts" element={<PostPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/schedules" element={<SchedulePage />} />
          <Route path="/posts/write" element={<PostWritePage />} />
          <Route path="/settings" element={<ProfilePage />} /> 
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
