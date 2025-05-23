import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'teachers';

  const [selected, setSelected] = useState(defaultTab);
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [inviteCode, setInviteCode] = useState('');
  const [isCreator, setIsCreator] = useState(false);

  const token = localStorage.getItem('token');

  const parseJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  };

  const payload = parseJwt(token);
  const isAdmin = payload?.is_admin === true || payload?.is_admin === 1;
  const schoolId = payload?.school_id;
  const userId = payload?.user_id;

  // ✅ 학교 생성자인지 확인
  useEffect(() => {
    if (!isAdmin || !schoolId || !userId) return;

    fetch(`http://localhost:3001/api/schools/${schoolId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.created_by === userId) {
          setIsCreator(true);
        }
      });
  }, [schoolId, isAdmin, userId]);

  // ✅ 데이터 조회
  useEffect(() => {
    if (!isAdmin || !isCreator || !schoolId) return;

    if (selected === 'teachers' || selected === 'classrooms') {
      const endpoint =
        selected === 'teachers'
          ? `http://localhost:3001/api/admin/teachers?school_id=${schoolId}`
          : `http://localhost:3001/api/admin/classrooms?school_id=${schoolId}`;

      fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (selected === 'teachers') {
            setTeachers(data.teachers || []);
          } else {
            setClassrooms(data.classrooms || []);
          }
        });
    }

    if (selected === 'codes') {
      fetch(`http://localhost:3001/api/admin/invite-code`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setInviteCode(data.invite_code || '');
        });
    }
  }, [selected, token, isAdmin, isCreator, schoolId]);

  if (!isAdmin || !isCreator) {
    return <p style={{ padding: '2rem', color: 'red' }}>⛔ 전체 관리자만 접근할 수 있습니다.</p>;
  }

  const handleTabClick = (tab) => {
    setSelected(tab);
    setSearchParams({ tab });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>관리자 대시보드</h2>

      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => handleTabClick('teachers')}
          style={{ marginRight: '1rem', fontWeight: selected === 'teachers' ? 'bold' : 'normal' }}
        >
          교사 목록
        </button>
        <button
          onClick={() => handleTabClick('classrooms')}
          style={{ marginRight: '1rem', fontWeight: selected === 'classrooms' ? 'bold' : 'normal' }}
        >
          학급 목록
        </button>
        <button
          onClick={() => handleTabClick('codes')}
          style={{ fontWeight: selected === 'codes' ? 'bold' : 'normal' }}
        >
          인증 코드
        </button>
      </div>

      <div>
        {selected === 'teachers' && <TeacherList teachers={teachers} />}
        {selected === 'classrooms' && <ClassroomList classrooms={classrooms} />}
        {selected === 'codes' && <AuthCodeList inviteCode={inviteCode} setInviteCode={setInviteCode} />}
      </div>
    </div>
  );
}

function TeacherList({ teachers: initialTeachers }) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [teachers, setTeachers] = useState(initialTeachers);
  const itemsPerPage = 10;
  const token = localStorage.getItem('token');

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = async (userId) => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;

    const res = await fetch(`http://localhost:3001/api/admin/teachers/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      setTeachers(prev => prev.filter(t => t.user_id !== userId));
      alert('삭제 완료');
    } else {
      alert('삭제 실패');
    }
  };

  return (
    <div>
      <h3>교사 목록</h3>
      <input
        type="text"
        placeholder="이름 또는 이메일 검색"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
        style={{ marginBottom: '1rem', padding: '0.5rem', width: '300px' }}
      />

      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>이름</th>
            <th>이메일</th>
            <th>생성 학급 수</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map(t => (
            <tr key={t.user_id}>
              <td>{t.name}</td>
              <td>{t.email}</td>
              <td>{t.classroom_count}</td>
              <td>
                <button onClick={() => handleDelete(t.user_id)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '1rem' }}>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            style={{ margin: '0 4px', fontWeight: currentPage === i + 1 ? 'bold' : 'normal' }}
          >
            {i + 1}
          </button>
        ))}
      </div>
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
    <div>
      <h3>학급 목록</h3>
      <input
        type="text"
        placeholder="학년, 반, 교사 이름 검색"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
        style={{ marginBottom: '1rem', padding: '0.5rem', width: '300px' }}
      />

      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
          {paginated.map(c => (
            <tr key={c.classroom_id}>
              <td>{c.grade}</td>
              <td>{c.class_number}</td>
              <td>{c.school}</td>
              <td>{c.teacher_name}</td>
              <td>{c.parent_count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '1rem' }}>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            style={{ margin: '0 4px', fontWeight: currentPage === i + 1 ? 'bold' : 'normal' }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

// ✅ 인증코드 단일 표시 + 재발급 버튼
function AuthCodeList({ inviteCode, setInviteCode }) {
  const token = localStorage.getItem('token');

  const regenerateCode = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/admin/invite-code', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setInviteCode(data.new_code);
      } else {
        alert('재발급 실패: ' + data.error);
      }
    } catch (err) {
      alert('서버 오류: ' + err.message);
    }
  };

  return (
    <div>
      <h3>학교 인증 코드</h3>
      {inviteCode ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <code style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{inviteCode}</code>
          <button onClick={regenerateCode}>🔄 재발급</button>
        </div>
      ) : (
        <p>인증코드가 없습니다.</p>
      )}
    </div>
  );
}

export default AdminDashboard;
