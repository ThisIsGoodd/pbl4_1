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

  if (loading) {
    return (
      <div className="superadmin-school-page">
        <div className="loading">
          ⏳ 학교 데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="superadmin-school-page">
        <div className="container">
          <div className="error-section">
            <div className="error-icon">❌</div>
            <h2>오류가 발생했습니다</h2>
            <p>{error}</p>
            <button onClick={fetchSchools} className="retry-button">
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-school-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1>🏫 학교 관리</h1>
          <p>등록된 학교들을 관리하고 모니터링하세요</p>
        </div>

        {/* 콘텐츠 */}
        <div className="content">
          {/* 통계 정보 */}
          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-number">{schools.length}</div>
              <div className="stat-label">총 학교 수</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{schools.filter(s => s.admin_name).length}</div>
              <div className="stat-label">관리자 배정됨</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{schools.reduce((sum, s) => sum + (s.teacher_count || 0), 0)}</div>
              <div className="stat-label">총 교사 수</div>
            </div>
          </div>

          {/* 학교 목록 */}
          <div className="schools-section">
            <h2>📋 학교 목록</h2>
            
            {schools.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏫</div>
                <h3>등록된 학교가 없습니다</h3>
                <p>아직 승인된 학교가 없습니다.</p>
              </div>
            ) : (
              <div className="schools-grid">
                {schools.map((school) => (
                  <div key={school.school_id} className="school-card">
                    <div className="school-header">
                      <h3 className="school-name">{school.school_name}</h3>
                      <span className="school-id">ID: {school.school_id}</span>
                    </div>
                    
                    <div className="school-info">
                      <div className="info-row">
                        <span className="info-label">학교 코드</span>
                        <span className="info-value">{school.school_code}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">관리자</span>
                        <span className="info-value">{school.admin_name || '미배정'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">이메일</span>
                        <span className="info-value">{school.email || '없음'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">전화번호</span>
                        <span className="info-value">{school.phone || '없음'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">생성일</span>
                        <span className="info-value">{new Date(school.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">교사 수</span>
                        <span className="info-value">{school.teacher_count || 0}명</span>
                      </div>
                    </div>

                    <div className="school-actions">
                      <button 
                        onClick={() => handleDelete(school)}
                        className="delete-button"
                      >
                        🗑️ 삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .superadmin-school-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2rem;
        }

        .error-section {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 3rem 2rem;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .error-section h2 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
        }

        .error-section p {
          margin: 0 0 2rem 0;
          color: #64748b;
        }

        .retry-button {
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-button:hover {
          background: #3730a3;
          transform: translateY(-1px);
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

        .content {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .stats-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(248, 250, 252, 0.8);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          border-left: 4px solid #4f46e5;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: #4f46e5;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        .schools-section h2 {
          margin: 0 0 1.5rem 0;
          color: #1e293b;
          font-size: 1.3rem;
          font-weight: 600;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #64748b;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          margin-bottom: 0.5rem;
          color: #374151;
        }

        .schools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .school-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-left: 4px solid #4f46e5;
          transition: transform 0.2s ease;
        }

        .school-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        .school-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .school-name {
          margin: 0;
          color: #1e293b;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .school-id {
          font-size: 0.8rem;
          color: #64748b;
          background: rgba(226, 232, 240, 0.6);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .school-info {
          margin-bottom: 1.5rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(226, 232, 240, 0.6);
        }

        .info-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .info-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #64748b;
          min-width: 70px;
        }

        .info-value {
          font-size: 0.85rem;
          color: #374151;
          font-weight: 500;
          text-align: right;
        }

        .school-actions {
          display: flex;
          justify-content: flex-end;
        }

        .delete-button {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .delete-button:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .superadmin-school-page {
            padding: 0.5rem;
          }

          .header {
            padding: 1.5rem;
          }

          .header h1 {
            font-size: 1.5rem;
          }

          .content {
            padding: 1.5rem;
          }

          .stats-section {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .schools-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .school-header {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }

          .info-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .info-value {
            text-align: left;
            font-weight: 600;
          }
        }
      `}</style>
    </div>
  );
}