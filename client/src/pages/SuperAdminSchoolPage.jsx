import { useEffect, useState } from 'react';
import axios from 'axios';

export default function SuperAdminSchoolPage() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 [fetchSchools] 토큰:', token);
      
      const res = await axios.get('http://localhost:3001/api/superadmin/schools', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      console.log('📦 [fetchSchools] 응답 데이터:', res.data);
      
      // ✅ 응답 데이터 검증
      if (res.data && typeof res.data === 'object' && res.data.schools) {
        setSchools(res.data.schools);
        setError(null);
      } else {
        console.error('❌ [fetchSchools] 잘못된 응답 형식:', res.data);
        setError('서버에서 잘못된 응답을 받았습니다.');
        setSchools([]);
      }
    } catch (err) {
      console.error('❌ [fetchSchools] 오류 발생:', err);
      console.error('❌ [fetchSchools] 응답 내용:', err.response?.data);
      setError('학교 데이터를 불러오지 못했습니다.');
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (school) => {
    if (!window.confirm(`정말로 "${school.school_name}"를 삭제하시겠습니까?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3001/api/superadmin/schools/${school.school_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert('삭제 완료');
      fetchSchools();
    } catch (err) {
      console.error('❌ 삭제 실패:', err);
      alert('삭제 실패');
    }
  };

  if (loading) return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <p>⏳ 로딩 중...</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <p style={{ color: 'red' }}>❌ {error}</p>
      <button onClick={fetchSchools} style={{ marginTop: '1rem' }}>
        다시 시도
      </button>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        학교 관리
      </h1>

      {schools.length === 0 ? (
        <p>등록된 학교가 없습니다.</p>
      ) : (
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
                <td>{school.admin_name || '없음'}</td>
                <td>{school.email || '없음'}</td>
                <td>{school.phone || '없음'}</td>
                <td>{new Date(school.created_at).toLocaleDateString()}</td>
                <td>
                  <button 
                    onClick={() => handleDelete(school)}
                    style={{ 
                      backgroundColor: 'red', 
                      color: 'white', 
                      border: 'none', 
                      padding: '4px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}