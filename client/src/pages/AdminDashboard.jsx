import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function AdminDashboard() {
  const [selected, setSelected] = useState('teachers');
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [inviteCode, setInviteCode] = useState('');

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const schoolId = searchParams.get('school_id');

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tab = urlParams.get('tab');
    if (tab && ['teachers', 'classrooms', 'codes'].includes(tab)) {
      setSelected(tab);
    }

    const token = localStorage.getItem('token');
    if (!token || !schoolId) return;

    // 교사 목록 가져오기
    fetch(`http://localhost:3001/api/admin/teachers?school_id=${schoolId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setTeachers(data.teachers || []))
      .catch(err => console.error('교사 목록 불러오기 실패:', err));

    // 학급 목록 가져오기
    fetch(`http://localhost:3001/api/admin/classrooms?school_id=${schoolId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setClassrooms(data.classrooms || []))
      .catch(err => console.error('학급 목록 불러오기 실패:', err));

    // 초대 코드 가져오기
    fetch(`http://localhost:3001/api/admin/invite-code?school_id=${schoolId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setInviteCode(data.invite_code || ''))
      .catch(err => console.error('초대 코드 불러오기 실패:', err));
  }, [location.search, schoolId]);

  const handleTabClick = (tab) => {
    setSelected(tab);
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
  };

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="header">
          <h2 className="title">관리자 대시보드</h2>
          <p className="subtitle">교사, 학급, 인증 코드를 관리하세요</p>
        </div>

        <div className="tab-container">
          <div className="tab-buttons">
            <button
              onClick={() => handleTabClick('teachers')}
              className={`tab-button ${selected === 'teachers' ? 'active' : ''}`}
            >
              <span className="tab-icon">👥</span>
              교사 목록
            </button>
            <button
              onClick={() => handleTabClick('classrooms')}
              className={`tab-button ${selected === 'classrooms' ? 'active' : ''}`}
            >
              <span className="tab-icon">🏫</span>
              학급 목록
            </button>
            <button
              onClick={() => handleTabClick('codes')}
              className={`tab-button ${selected === 'codes' ? 'active' : ''}`}
            >
              <span className="tab-icon">🔑</span>
              인증 코드
            </button>
          </div>
        </div>

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
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          padding: 2rem;
          text-align: center;
          color: white;
        }

        .title {
          font-size: clamp(1.8rem, 4vw, 2.5rem);
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
          margin: 0;
          font-weight: 300;
        }

        .tab-container {
          background: var(--bg-secondary, #f8fafc);
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          padding: 0 2rem;
        }

        .tab-buttons {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding: 1rem 0;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .tab-buttons::-webkit-scrollbar {
          display: none;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: var(--text-secondary, #64748b);
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          min-width: fit-content;
        }

        .tab-button:hover {
          background: var(--bg-hover, #e2e8f0);
          color: var(--text-primary, #1e293b);
          transform: translateY(-1px);
        }

        .tab-button.active {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .tab-icon {
          font-size: 1.1rem;
        }

        .content {
          padding: 2rem;
          min-height: 400px;
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .admin-dashboard {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --bg-hover: #475569;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .admin-dashboard {
            padding: 0.5rem;
          }

          .container {
            border-radius: 16px;
          }

          .header {
            padding: 1.5rem 1rem;
          }

          .tab-container {
            padding: 0 1rem;
          }

          .content {
            padding: 1.5rem;
          }

          .tab-button {
            padding: 0.65rem 1.2rem;
            font-size: 0.9rem;
          }
        }

        @media (max-width: 480px) {
          .header {
            padding: 1.2rem 1rem;
          }

          .content {
            padding: 1rem;
          }

          .tab-button {
            padding: 0.6rem 1rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}

function TeacherList({ teachers: initialTeachers, setTeachers }) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [teachers, setLocalTeachers] = useState(initialTeachers);
  const itemsPerPage = 10;
  const token = localStorage.getItem('token');

  useEffect(() => {
    setLocalTeachers(initialTeachers);
  }, [initialTeachers]);

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = async (userId) => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`http://localhost:3001/api/admin/teachers/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const updatedTeachers = teachers.filter(t => t.user_id !== userId);
        setLocalTeachers(updatedTeachers);
        setTeachers(updatedTeachers);
        alert('삭제되었습니다.');
      } else {
        alert('삭제 실패');
      }
    } catch (err) {
      console.error('삭제 오류:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="teacher-list">
      <div className="list-header">
        <h3 className="list-title">👥 교사 목록</h3>
        <div className="search-container">
          <input
            type="text"
            placeholder="이름 또는 이메일 검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>
      </div>

      {paginated.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <p className="empty-text">등록된 교사가 없습니다</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>프로필</th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>학급</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(teacher => (
                  <tr key={teacher.user_id}>
                    <td>
                      <div className="profile-image">
                        {teacher.profile_picture ? (
                          <img 
                            src={`http://localhost:3001${teacher.profile_picture}`} 
                            alt={teacher.name}
                          />
                        ) : (
                          <div className="default-avatar">
                            {teacher.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="name-cell">{teacher.name}</td>
                    <td className="email-cell">{teacher.email}</td>
                    <td className="classroom-cell">
                      {teacher.classroom_info ? 
                        `${teacher.classroom_info.grade}학년 ${teacher.classroom_info.class_number}반` : 
                        '학급 없음'
                      }
                    </td>
                    <td>
                      <button 
                        onClick={() => handleDelete(teacher.user_id)}
                        className="delete-button"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`page-button ${currentPage === i + 1 ? 'active' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .teacher-list {
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .list-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0;
        }

        .search-container {
          position: relative;
        }

        .search-input {
          padding: 0.75rem 1rem;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-size: 0.95rem;
          background: var(--bg-primary, #ffffff);
          color: var(--text-primary, #1e293b);
          transition: all 0.2s ease;
          min-width: 250px;
        }

        .search-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-secondary, #64748b);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 1.1rem;
          margin: 0;
        }

        .table-container {
          overflow-x: auto;
          background: var(--bg-primary, #ffffff);
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          margin-bottom: 1.5rem;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
        }

        .data-table th {
          background: var(--bg-secondary, #f8fafc);
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          white-space: nowrap;
        }

        .data-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          color: var(--text-secondary, #64748b);
        }

        .data-table tr:hover {
          background: var(--bg-hover, #f1f5f9);
        }

        .profile-image {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          margin: 0 auto;
        }

        .profile-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .default-avatar {
          color: white;
          font-weight: 600;
          font-size: 1.1rem;
        }

        .name-cell {
          font-weight: 600;
          color: var(--text-primary, #1e293b);
        }

        .email-cell {
          font-family: monospace;
          font-size: 0.9rem;
        }

        .classroom-cell {
          font-weight: 500;
        }

        .delete-button {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .delete-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .pagination {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .page-button {
          padding: 0.5rem 0.75rem;
          border: 2px solid var(--border-color, #e2e8f0);
          background: var(--bg-primary, #ffffff);
          color: var(--text-secondary, #64748b);
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          min-width: 40px;
        }

        .page-button:hover {
          border-color: #4f46e5;
          color: #4f46e5;
        }

        .page-button.active {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-color: #4f46e5;
          color: white;
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .teacher-list {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --bg-hover: #475569;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .list-header {
            flex-direction: column;
            align-items: stretch;
          }

          .search-input {
            min-width: 100%;
          }

          .data-table {
            font-size: 0.85rem;
          }

          .data-table th,
          .data-table td {
            padding: 0.75rem 0.5rem;
          }

          .profile-image {
            width: 32px;
            height: 32px;
          }
        }

        @media (max-width: 480px) {
          .data-table {
            font-size: 0.8rem;
          }

          .data-table th,
          .data-table td {
            padding: 0.6rem 0.4rem;
          }
        }
      `}</style>
    </div>
  );
}

function ClassroomList({ classrooms: initialClassrooms }) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [classrooms, setClassrooms] = useState(initialClassrooms);
  const itemsPerPage = 10;

  const filtered = classrooms.filter(c =>
    `${c.grade}학년 ${c.class_number}반`.includes(search) ||
    c.teacher_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="classroom-list">
      <div className="list-header">
        <h3 className="list-title">🏫 학급 목록</h3>
        <div className="search-container">
          <input
            type="text"
            placeholder="학년, 반, 교사 이름 검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>
      </div>

      {paginated.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏫</div>
          <p className="empty-text">등록된 학급이 없습니다</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>학년</th>
                  <th>반</th>
                  <th>학교</th>
                  <th>담당 교사</th>
                  <th>학부모 수</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(classroom => (
                  <tr key={classroom.classroom_id}>
                    <td className="grade-cell">{classroom.grade}학년</td>
                    <td className="class-cell">{classroom.class_number}반</td>
                    <td className="school-cell">{classroom.school}</td>
                    <td className="teacher-cell">{classroom.teacher_name}</td>
                    <td className="count-cell">
                      <span className="count-badge">{classroom.parent_count}명</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`page-button ${currentPage === i + 1 ? 'active' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .classroom-list {
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .list-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0;
        }

        .search-container {
          position: relative;
        }

        .search-input {
          padding: 0.75rem 1rem;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-size: 0.95rem;
          background: var(--bg-primary, #ffffff);
          color: var(--text-primary, #1e293b);
          transition: all 0.2s ease;
          min-width: 250px;
        }

        .search-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-secondary, #64748b);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 1.1rem;
          margin: 0;
        }

        .table-container {
          overflow-x: auto;
          background: var(--bg-primary, #ffffff);
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          margin-bottom: 1.5rem;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
        }

        .data-table th {
          background: var(--bg-secondary, #f8fafc);
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          white-space: nowrap;
        }

        .data-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          color: var(--text-secondary, #64748b);
        }

        .data-table tr:hover {
          background: var(--bg-hover, #f1f5f9);
        }

        .grade-cell, .class-cell {
          font-weight: 600;
          color: var(--text-primary, #1e293b);
        }

        .teacher-cell {
          font-weight: 500;
        }

        .count-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .pagination {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .page-button {
          padding: 0.5rem 0.75rem;
          border: 2px solid var(--border-color, #e2e8f0);
          background: var(--bg-primary, #ffffff);
          color: var(--text-secondary, #64748b);
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          min-width: 40px;
        }

        .page-button:hover {
          border-color: #4f46e5;
          color: #4f46e5;
        }

        .page-button.active {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-color: #4f46e5;
          color: white;
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .classroom-list {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --bg-hover: #475569;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .list-header {
            flex-direction: column;
            align-items: stretch;
          }

          .search-input {
            min-width: 100%;
          }

          .data-table {
            font-size: 0.85rem;
          }

          .data-table th,
          .data-table td {
            padding: 0.75rem 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .data-table {
            font-size: 0.8rem;
          }

          .data-table th,
          .data-table td {
            padding: 0.6rem 0.4rem;
          }
        }
      `}</style>
    </div>
  );
}

function AuthCodeList({ inviteCode, setInviteCode }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const token = localStorage.getItem('token');
  const searchParams = new URLSearchParams(location.search);
  const schoolId = searchParams.get('school_id');

  const generateNewCode = async () => {
    if (!window.confirm('새로운 초대 코드를 생성하시겠습니까? 기존 코드는 무효화됩니다.')) return;

    setIsGenerating(true);
    try {
      const res = await fetch(`http://localhost:3001/api/admin/invite-code/generate?school_id=${schoolId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setInviteCode(data.invite_code);
        alert('새로운 초대 코드가 생성되었습니다!');
      } else {
        alert('코드 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error('코드 생성 오류:', err);
      alert('코드 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteCode).then(() => {
      alert('초대 코드가 클립보드에 복사되었습니다!');
    });
  };

  return (
    <div className="auth-code-list">
      <div className="code-header">
        <h3 className="list-title">🔑 교사 초대 코드</h3>
        <p className="code-description">
          새로운 교사가 학교에 가입할 때 사용하는 코드입니다
        </p>
      </div>

      <div className="code-container">
        {inviteCode ? (
          <div className="code-display">
            <div className="code-label">현재 활성 코드</div>
            <div className="code-value">
              <span className="code-text">{inviteCode}</span>
              <button onClick={copyToClipboard} className="copy-button">
                📋 복사
              </button>
            </div>
            <div className="code-info">
              이 코드를 새로운 교사에게 공유하세요
            </div>
          </div>
        ) : (
          <div className="no-code">
            <div className="no-code-icon">🔐</div>
            <p className="no-code-text">활성화된 초대 코드가 없습니다</p>
          </div>
        )}

        <div className="code-actions">
          <button
            onClick={generateNewCode}
            disabled={isGenerating}
            className="generate-button"
          >
            {isGenerating ? '생성 중...' : '새 코드 생성'}
          </button>
        </div>

        <div className="code-guide">
          <h4 className="guide-title">💡 사용 방법</h4>
          <ol className="guide-list">
            <li>위의 초대 코드를 새로운 교사에게 공유합니다</li>
            <li>교사가 회원가입 후 "선생님" 역할을 선택합니다</li>
            <li>교사 인증 페이지에서 이 코드를 입력합니다</li>
            <li>인증 완료 후 학급을 생성할 수 있습니다</li>
          </ol>
        </div>
      </div>

      <style jsx>{`
        .auth-code-list {
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .code-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .list-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0 0 0.5rem 0;
        }

        .code-description {
          font-size: 1rem;
          color: var(--text-secondary, #64748b);
          margin: 0;
        }

        .code-container {
          max-width: 600px;
          margin: 0 auto;
        }

        .code-display {
          background: var(--bg-primary, #ffffff);
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .code-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary, #64748b);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .code-value {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .code-text {
          font-family: 'Courier New', monospace;
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 0.1em;
          border: 2px dashed var(--border-color, #e2e8f0);
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          background-color: var(--bg-secondary, #f8fafc);
        }

        .copy-button {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .copy-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .code-info {
          font-size: 0.9rem;
          color: var(--text-secondary, #64748b);
          font-style: italic;
        }

        .no-code {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-secondary, #64748b);
        }

        .no-code-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .no-code-text {
          font-size: 1.1rem;
          margin: 0;
        }

        .code-actions {
          text-align: center;
          margin-bottom: 2rem;
        }

        .generate-button {
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
        }

        .generate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .code-guide {
          background: var(--bg-secondary, #f8fafc);
          border-radius: 12px;
          padding: 1.5rem;
          border-left: 4px solid #4f46e5;
        }

        .guide-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0 0 1rem 0;
        }

        .guide-list {
          margin: 0;
          padding-left: 1.5rem;
          color: var(--text-secondary, #64748b);
          line-height: 1.6;
        }

        .guide-list li {
          margin-bottom: 0.5rem;
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .auth-code-list {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .code-display {
            padding: 1.5rem;
          }

          .code-text {
            font-size: 1.5rem;
            padding: 0.5rem 1rem;
          }

          .code-value {
            flex-direction: column;
            gap: 0.75rem;
          }

          .guide-list {
            padding-left: 1.2rem;
          }
        }

        @media (max-width: 480px) {
          .code-display {
            padding: 1rem;
          }

          .code-text {
            font-size: 1.2rem;
            padding: 0.4rem 0.8rem;
          }

          .generate-button {
            padding: 0.65rem 1.5rem;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;

        