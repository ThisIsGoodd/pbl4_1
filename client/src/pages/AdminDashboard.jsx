import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrentUser } from '../utils/jwt';

// 교사 목록 컴포넌트
function TeacherList({ teachers, setTeachers }) {
  const handleDeleteTeacher = async (teacherId, teacherName) => {
    if (!confirm(`정말로 ${teacherName} 교사를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/admin/teachers/${teacherId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('교사 삭제 실패');

      // 목록에서 해당 교사 제거
      setTeachers(prev => prev.filter(teacher => teacher.user_id !== teacherId));
      alert('교사가 삭제되었습니다.');
    } catch (error) {
      console.error('교사 삭제 오류:', error);
      alert('교사 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="teacher-list">
      <h3>👨‍🏫 등록된 교사 목록 ({teachers.length}명)</h3>
      
      {teachers.length === 0 ? (
        <div className="empty-state">
          <p>등록된 교사가 없습니다</p>
        </div>
      ) : (
        <div className="teachers-grid">
          {teachers.map((teacher) => (
            <div key={teacher.user_id} className="teacher-card">
              <div className="teacher-info">
                <h4>{teacher.name}</h4>
                <p>{teacher.email}</p>
                <small>가입일: {new Date(teacher.created_at).toLocaleDateString()}</small>
              </div>
              <div className="teacher-actions">
                <button
                  onClick={() => handleDeleteTeacher(teacher.user_id, teacher.name)}
                  className="delete-btn"
                >
                  🗑️ 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .teacher-list {
          padding: 1rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        h3 {
          margin: 0 0 1rem 0;
          color: #1e293b;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #64748b;
        }

        .teachers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .teacher-card {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .teacher-card:hover {
          border-color: #4f46e5;
        }

        .teacher-info h4 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
        }

        .teacher-info p {
          margin: 0 0 0.5rem 0;
          color: #64748b;
        }

        .teacher-info small {
          color: #94a3b8;
        }

        .teacher-actions {
          display: flex;
          gap: 0.5rem;
        }

        .delete-btn {
          padding: 0.5rem 1rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .delete-btn:hover {
          background: #dc2626;
        }

        @media (max-width: 768px) {
          .teachers-grid {
            grid-template-columns: 1fr;
          }

          .teacher-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .teacher-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}

// 학급 목록 컴포넌트
function ClassroomList({ classrooms }) {
  return (
    <div className="classroom-list">
      <h3>🏫 학급 목록 ({classrooms.length}개)</h3>
      
      {classrooms.length === 0 ? (
        <div className="empty-state">
          <p>등록된 학급이 없습니다</p>
        </div>
      ) : (
        <div className="classrooms-grid">
          {classrooms.map((classroom) => (
            <div key={classroom.classroom_id} className="classroom-card">
              <div className="classroom-badge">
                {classroom.grade}학년 {classroom.class_number}반
              </div>
              <div className="classroom-info">
                <p>담임: {classroom.teacher_name || '미배정'}</p>
                <p>학부모: {classroom.student_count || 0}명</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .classroom-list {
          padding: 1rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        h3 {
          margin: 0 0 1rem 0;
          color: #1e293b;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #64748b;
        }

        .classrooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .classroom-card {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .classroom-card:hover {
          border-color: #4f46e5;
        }

        .classroom-badge {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          margin-bottom: 1rem;
          text-align: center;
        }

        .classroom-info p {
          margin: 0 0 0.5rem 0;
          color: #64748b;
        }

        .classroom-info small {
          color: #94a3b8;
        }

        @media (max-width: 768px) {
          .classrooms-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// 인증 코드 컴포넌트 (관리자용)
function AuthCodeList({ inviteCode, setInviteCode }) {
  const [newTeacherCode, setNewTeacherCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatingAdmin, setGeneratingAdmin] = useState(false);

  const generateTeacherCode = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/admin/generate-teacher-code', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('코드 생성 실패');
      
      const data = await response.json();
      setNewTeacherCode(data.code);
    } catch (error) {
      console.error('교사 코드 생성 오류:', error);
      alert('코드 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const generateAdminCode = async () => {
    setGeneratingAdmin(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/admin/invite-code', {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('코드 생성 실패');
      
      const data = await response.json();
      setInviteCode(data.new_code);
      alert('새로운 관리자 인증 코드가 생성되었습니다!');
    } catch (error) {
      console.error('관리자 코드 생성 오류:', error);
      alert('코드 생성에 실패했습니다.');
    } finally {
      setGeneratingAdmin(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('클립보드에 복사되었습니다!');
    }).catch(() => {
      alert('복사에 실패했습니다.');
    });
  };

  return (
    <div className="auth-code-list">
      {/* 교사 인증 코드 생성 */}
      <div className="code-section">
        <h3>🔑 교사 인증 코드 생성</h3>
        <button
          onClick={generateTeacherCode}
          disabled={generating}
          className="generate-btn"
        >
          {generating ? '생성 중...' : '새 교사 코드 생성'}
        </button>

        {newTeacherCode && (
          <div className="code-display">
            <div className="code-value">
              <span className="code-text">{newTeacherCode}</span>
              <button
                onClick={() => copyToClipboard(newTeacherCode)}
                className="copy-btn"
              >
                📋 복사
              </button>
            </div>
            <p>💡 이 코드를 새로운 교사에게 공유하세요</p>
          </div>
        )}
      </div>

      {/* 관리자 인증 코드 */}
      <div className="code-section">
        <h3>🏛️ 학교 관리자 인증 코드</h3>
        
        {inviteCode ? (
          <div className="code-display">
            <div className="code-value">
              <span className="code-text">{inviteCode}</span>
              <button
                onClick={() => copyToClipboard(inviteCode)}
                className="copy-btn"
              >
                📋 복사
              </button>
            </div>
            <button
              onClick={generateAdminCode}
              disabled={generatingAdmin}
              className="regenerate-btn"
            >
              {generatingAdmin ? '생성 중...' : '🔄 코드 재생성'}
            </button>
            <p>💡 이 코드를 새로운 관리자에게 공유하세요</p>
          </div>
        ) : (
          <div className="no-code">
            <p>관리자 인증 코드가 없습니다</p>
            <button
              onClick={generateAdminCode}
              disabled={generatingAdmin}
              className="generate-btn"
            >
              {generatingAdmin ? '생성 중...' : '관리자 코드 생성'}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .auth-code-list {
          padding: 1rem;
        }

        .code-section {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .code-display, .no-code {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        h3 {
          margin: 0 0 1rem 0;
          color: #1e293b;
        }

        .code-value {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-bottom: 1rem;
        }

        .code-text {
          font-family: monospace;
          font-size: 1.5rem;
          font-weight: bold;
          color: #4f46e5;
          background: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: 2px solid #4f46e5;
          flex: 1;
          text-align: center;
        }

        .copy-btn, .regenerate-btn, .generate-btn {
          padding: 0.75rem 1.5rem;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .copy-btn:hover, .regenerate-btn:hover, .generate-btn:hover {
          background: #3730a3;
        }

        .regenerate-btn {
          background: #f59e0b;
          margin-bottom: 1rem;
        }

        .regenerate-btn:hover {
          background: #d97706;
        }

        .generate-btn {
          background: #10b981;
        }

        .generate-btn:hover {
          background: #059669;
        }

        .no-code {
          text-align: center;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .code-value {
            flex-direction: column;
            align-items: stretch;
          }

          .code-text {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}

// 메인 AdminDashboard 컴포넌트
function AdminDashboard() {
  const [selected, setSelected] = useState('teachers');
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['teachers', 'classrooms', 'codes'].includes(tab)) {
      setSelected(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const schoolId = searchParams.get('school_id');

      // 교사 목록 조회
      const teachersResponse = await fetch(`http://localhost:3001/api/admin/teachers?school_id=${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (teachersResponse.ok) {
        const teachersData = await teachersResponse.json();
        setTeachers(teachersData.teachers || []);
      }

      // 학급 목록 조회
      const classroomsResponse = await fetch(`http://localhost:3001/api/admin/classrooms?school_id=${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (classroomsResponse.ok) {
        const classroomsData = await classroomsResponse.json();
        setClassrooms(classroomsData.classrooms || []);
      }

      // 인증 코드 조회
      const codeResponse = await fetch('http://localhost:3001/api/admin/invite-code', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (codeResponse.ok) {
        const codeData = await codeResponse.json();
        setInviteCode(codeData.invite_code || '');
      }
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabClick = (tab) => {
    setSelected(tab);
    const schoolId = searchParams.get('school_id');
    navigate(`/admindashboard?tab=${tab}&school_id=${schoolId}`);
  };

  if (loading) {
    return (
      <div className="loading">
        <div>데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1>🎯 관리자 대시보드</h1>
          <p>학교의 교사와 학급을 효율적으로 관리하세요</p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="tabs">
          <button
            onClick={() => handleTabClick('teachers')}
            className={`tab ${selected === 'teachers' ? 'active' : ''}`}
          >
            👨‍🏫 교사 관리 ({teachers.length})
          </button>
          <button
            onClick={() => handleTabClick('classrooms')}
            className={`tab ${selected === 'classrooms' ? 'active' : ''}`}
          >
            🏫 학급 관리 ({classrooms.length})
          </button>
          <button
            onClick={() => handleTabClick('codes')}
            className={`tab ${selected === 'codes' ? 'active' : ''}`}
          >
            🔑 인증 코드
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="content">
          {selected === 'teachers' && <TeacherList teachers={teachers} setTeachers={setTeachers} />}
          {selected === 'classrooms' && <ClassroomList classrooms={classrooms} />}
          {selected === 'codes' && <AuthCodeList inviteCode={inviteCode} setInviteCode={setInviteCode} />}
        </div>
      </div>

      <style jsx>{`
        .admin-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .header h1 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 2rem;
        }

        .header p {
          margin: 0;
          color: #64748b;
          font-size: 1.1rem;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.5rem;
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .tab {
          flex: 1;
          padding: 1rem;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .tab:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .tab.active {
          background: rgba(255, 255, 255, 0.9);
          color: #1e293b;
        }

        .content {
          min-height: 400px;
        }

        .loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 1.2rem;
        }

        @media (max-width: 768px) {
          .tabs {
            flex-direction: column;
          }

          .header h1 {
            font-size: 1.5rem;
          }

          .header p {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;