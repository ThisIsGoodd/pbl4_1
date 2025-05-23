import { useEffect, useState } from 'react';
import axios from 'axios';

export default function SuperAdminSchoolPage() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/superadmin/schools', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('📦 [fetchSchools] 응답 데이터:', res.data);
      setSchools(res.data.schools);
    } catch (err) {
      console.error('❌ [fetchSchools] 오류 발생:', err);
      console.error('❌ [fetchSchools] 응답 내용:', err.response?.data);
      alert('학교 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (school) => {
    if (!window.confirm(`정말로 "${school.school_name}"를 삭제하시겠습니까?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/superadmin/schools/${school.school_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchSchools();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>학교 관리</h1>

      <table border="1" cellPadding="8" cellSpacing="0" style={{ width: '100%', textAlign: 'left' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>학교 이름</th>
            <th>학교 코드</th>
            <th>관리자 이름</th>
            <th>이메일</th>
            <th>전화번호</th>
            <th>생성일</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {schools.map((school) => (
            <tr key={school.school_id}>
              <td>{school.school_id}</td>
              <td>{school.school_name}</td>
              <td>{school.school_code}</td>
              <td>{school.admin_name}</td>
              <td>{school.email}</td>
              <td>{school.phone}</td>
              <td>{new Date(school.created_at).toLocaleDateString()}</td>
              <td>
                <button onClick={() => handleDelete(school)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
