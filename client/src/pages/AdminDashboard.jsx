import React, { useState, useEffect } from 'react';

function AdminDashboard() {
  const [selected, setSelected] = useState('teachers');
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const token = localStorage.getItem('token');

  // ✅ 관리자 권한 확인 및 학교 ID 추출
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

  useEffect(() => {
    if (!isAdmin || !schoolId) return;

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
  }, [selected, token, isAdmin, schoolId]);

  if (!isAdmin) {
    return <p style={{ padding: '2rem', color: 'red' }}>⛔ 관리자만 접근할 수 있습니다.</p>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>관리자 대시보드</h2>

      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => setSelected('teachers')}
          style={{ marginRight: '1rem', fontWeight: selected === 'teachers' ? 'bold' : 'normal' }}
        >
          교사 목록 보기
        </button>
        <button
          onClick={() => setSelected('classrooms')}
          style={{ fontWeight: selected === 'classrooms' ? 'bold' : 'normal' }}
        >
          학급 목록 보기
        </button>
      </div>

      <div>
        {selected === 'teachers' ? (
          <TeacherList teachers={teachers} />
        ) : (
          <ClassroomList classrooms={classrooms} />
        )}
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

export default AdminDashboard;