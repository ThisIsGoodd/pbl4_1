import React, { useEffect, useState } from 'react';
import axios from 'axios';

function SuperAdminSchoolPage() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

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
    if (!window.confirm(`정말로 "${school.school_name}"를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없으며, 해당 학교의 모든 데이터가 삭제됩니다.`)) return;
    
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
      alert('삭제 실패: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredSchools = schools.filter(school =>
    school.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.school_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.admin_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedSchools = [...filteredSchools].sort((a, b) => {
    let aValue = a[sortBy] || '';
    let bValue = b[sortBy] || '';
    
    if (sortBy === 'created_at') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="admin-schools-page">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <p className="loading-text">학교 목록을 불러오는 중...</p>
        </div>
        <style jsx>{`
          .admin-schools-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }

          .loading-container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }

          .loading-spinner {
            margin-bottom: 1.5rem;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }

          .loading-text {
            color: white;
            font-size: 1.1rem;
            font-weight: 500;
            margin: 0;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-schools-page">
        <div className="error-container">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">오류가 발생했습니다</h2>
            <p className="error-description">{error}</p>
            <button onClick={fetchSchools} className="retry-button">
              <span className="button-icon">🔄</span>
              다시 시도
            </button>
          </div>
        </div>
        <style jsx>{`
          .admin-schools-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }

          .error-container {
            max-width: 500px;
            width: 100%;
            padding: 0;
          }

          .error-content {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            padding: 2.5rem;
            text-align: center;
          }

          .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }

          .error-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: white;
            margin: 0 0 1rem 0;
          }

          .error-description {
            color: rgba(255, 255, 255, 0.8);
            margin: 0 0 2rem 0;
            line-height: 1.6;
          }

          .retry-button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.875rem 1.75rem;
            background: rgba(255, 255, 255, 0.9);
            color: #333;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .retry-button:hover {
            background: white;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .button-icon {
            font-size: 1.2rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-schools-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header-section">
          <div className="header-content">
            <div className="header-icon">🏫</div>
            <div className="header-text">
              <h1 className="page-title">학교 관리</h1>
              <p className="page-subtitle">등록된 학교들을 관리하고 모니터링할 수 있습니다</p>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-number">{schools.length}</div>
                <div className="stat-label">전체 학교</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">{schools.reduce((sum, school) => sum + (school.teacher_count || 0), 0)}</div>
                <div className="stat-label">총 교사 수</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👨‍💼</div>
              <div className="stat-content">
                <div className="stat-number">{schools.reduce((sum, school) => sum + (school.admin_count || 0), 0)}</div>
                <div className="stat-label">총 관리자 수</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-number">{schools.filter(s => {
                  const date = new Date(s.created_at);
                  const today = new Date();
                  return date.toDateString() === today.toDateString();
                }).length}</div>
                <div className="stat-label">오늘 생성</div>
              </div>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="controls-section">
          <div className="search-card">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              placeholder="학교명, 학교코드, 관리자명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="sort-card">
            <div className="sort-controls">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="created_at">생성일</option>
                <option value="school_name">학교명</option>
                <option value="admin_name">관리자명</option>
                <option value="teacher_count">교사 수</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="sort-button"
              >
                {sortOrder === 'asc' ? '▲' : '▼'}
              </button>
            </div>
          </div>
        </div>

        {/* 학교 목록 */}
        <div className="schools-section">
          {sortedSchools.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏫</div>
              <h3 className="empty-title">
                {searchTerm ? '검색 결과가 없습니다' : '등록된 학교가 없습니다'}
              </h3>
              <p className="empty-description">
                {searchTerm 
                  ? '다른 검색어로 시도해보세요.'
                  : '아직 승인된 학교가 없습니다.'
                }
              </p>
            </div>
          ) : (
            <div className="schools-grid">
              {sortedSchools.map((school) => (
                <div key={school.school_id} className="school-card">
                  <div className="school-header">
                    <div className="school-info">
                      <h3 className="school-name">{school.school_name}</h3>
                      <div className="school-meta">
                        <span className="meta-item">
                          <span className="meta-icon">🏷️</span>
                          {school.school_code || 'N/A'}
                        </span>
                        <span className="meta-item">
                          <span className="meta-icon">📅</span>
                          {formatDate(school.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="school-actions">
                      <button
                        onClick={() => handleDelete(school)}
                        className="delete-button"
                      >
                        <span className="button-icon">🗑️</span>
                        삭제
                      </button>
                    </div>
                  </div>

                  <div className="school-details">
                    <div className="detail-row">
                      <span className="detail-label">
                        <span className="detail-icon">🆔</span>
                        학교 ID
                      </span>
                      <span className="detail-value">{school.school_id}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">
                        <span className="detail-icon">👨‍💼</span>
                        관리자
                      </span>
                      <span className="detail-value">{school.admin_name || '없음'}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">
                        <span className="detail-icon">📧</span>
                        이메일
                      </span>
                      <span className="detail-value">{school.email || '없음'}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">
                        <span className="detail-icon">📞</span>
                        전화번호
                      </span>
                      <span className="detail-value">{school.phone || '없음'}</span>
                    </div>

                    <div className="stats-row">
                      <div className="stat-item">
                        <span className="stat-number">{school.teacher_count || 0}</span>
                        <span className="stat-label">교사</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-number">{school.admin_count || 0}</span>
                        <span className="stat-label">관리자</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .admin-schools-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem 1rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* 헤더 섹션 */
        .header-section {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          padding: 2rem;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .header-icon {
          font-size: 3rem;
        }

        .header-text {
          flex: 1;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 800;
          color: white;
          margin: 0 0 0.5rem 0;
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1.1rem;
          margin: 0;
        }

        /* 통계 그리드 */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .stat-icon {
          font-size: 2rem;
        }

        .stat-content {
          flex: 1;
        }

        .stat-number {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          font-weight: 500;
        }

        /* 컨트롤 섹션 */
        .controls-section {
          display: flex;
          gap: 1rem;
        }

        .search-card {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1rem 1.5rem;
        }

        .search-icon {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          font-size: 1rem;
          outline: none;
        }

        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .sort-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1rem 1.5rem;
        }

        .sort-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sort-select {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 500;
          backdrop-filter: blur(10px);
        }

        .sort-select option {
          background: #333;
          color: white;
        }

        .sort-button {
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }

        .sort-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* 학교 섹션 */
        .schools-section {
          flex: 1;
        }

        .empty-state {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 3rem;
          text-align: center;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin: 0 0 0.5rem 0;
        }

        .empty-description {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.1rem;
          margin: 0;
        }

        .schools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        /* 학교 카드 */
        .school-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .school-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .school-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .school-info {
          flex: 1;
        }

        .school-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin: 0 0 0.5rem 0;
        }

        .school-meta {
          display: flex;
          gap: 1rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .meta-icon {
          font-size: 1rem;
        }

        .school-actions {
          display: flex;
          gap: 0.5rem;
        }

        .delete-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .delete-button:hover {
          background: #b91c1c;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
        }

        .button-icon {
          font-size: 1rem;
        }

        .school-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .detail-row:last-of-type {
          border-bottom: none;
        }

        .detail-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .detail-icon {
          font-size: 1rem;
        }

        .detail-value {
          color: white;
          font-weight: 600;
          text-align: right;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .stats-row {
          display: flex;
          justify-content: space-around;
          padding: 1rem 0;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          margin-top: 0.5rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .stat-item .stat-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }

        .stat-item .stat-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }

        /* 반응형 */
        @media (max-width: 768px) {
          .admin-schools-page {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
            gap: 0.5rem;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .controls-section {
            flex-direction: column;
          }

          .schools-grid {
            grid-template-columns: 1fr;
          }

          .school-header {
            flex-direction: column;
            gap: 1rem;
          }

          .school-meta {
            flex-direction: column;
            gap: 0.5rem;
          }

          .detail-value {
            max-width: 150px;
          }
        }

        @media (max-width: 480px) {
          .page-title {
            font-size: 1.25rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .stat-card {
            padding: 1rem;
          }

          .school-card {
            padding: 1rem;
          }

          .school-details {
            gap: 0.75rem;
          }

          .detail-value {
            max-width: 120px;
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}

export default SuperAdminSchoolPage;