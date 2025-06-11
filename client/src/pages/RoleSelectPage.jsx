import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function RoleSelectPage() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  const handleSelectRole = async (role) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setSelectedRole(role);

    try {
      const res = await fetch('http://localhost:3001/api/users/update-role', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role })
      });

      if (res.ok) {
        const updatedUser = { ...user, role };
        setUser(updatedUser);

        // 성공 후 잠시 대기하여 피드백 표시
        setTimeout(() => {
          // ✅ 역할별 분기 처리
          if (role === 'parent') {
            navigate('/join/invite', { state: { role } });
          } else if (role === 'teacher') {
            navigate('/teacher/auth', { state: { role } });
          }
        }, 1000);
      } else {
        const errorData = await res.json();
        alert(`역할 설정 실패: ${errorData.message || '서버 응답 없음'}`);
        setIsLoading(false);
        setSelectedRole('');
      }
    } catch (err) {
      console.error('역할 설정 오류:', err);
      alert('서버 오류가 발생했습니다. 다시 시도해주세요.');
      setIsLoading(false);
      setSelectedRole('');
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'parent':
        return {
          title: '학부모',
          description: '자녀의 학급에 참여하여 소통하고 정보를 확인할 수 있습니다',
          features: ['학급 공지사항 확인', '선생님과 1:1 상담', '학급 일정 확인', '자녀 활동 모니터링']
        };
      case 'teacher':
        return {
          title: '선생님',
          description: '학급을 생성하고 관리하며 학부모와 소통할 수 있습니다',
          features: ['학급 생성 및 관리', '공지사항 작성', '일정 관리', '학부모와 소통']
        };
      default:
        return null;
    }
  };

  return (
    <div className="role-select-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="header-content">
            <h1 className="page-title">
              🎭 역할 선택
            </h1>
            <p className="page-subtitle">
              ClassFeed에서 사용할 역할을 선택해주세요
            </p>
          </div>
        </div>

        {/* 역할 선택 카드들 */}
        <div className="role-cards">
          {['parent', 'teacher'].map((role) => {
            const roleInfo = getRoleDescription(role);
            const isSelected = selectedRole === role && isLoading;
            
            return (
              <div
                key={role}
                className={`role-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectRole(role)}
              >
                <div className="card-header">
                  <div className="role-icon">
                    {role === 'parent' ? '👨‍👩‍👧‍👦' : '👩‍🏫'}
                  </div>
                  <div className="role-title">
                    <h3>{roleInfo.title}</h3>
                    <p className="role-description">{roleInfo.description}</p>
                  </div>
                </div>

                <div className="features-list">
                  <h4 className="features-title">주요 기능</h4>
                  <ul>
                    {roleInfo.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>

                <div className="card-footer">
                  {isSelected ? (
                    <div className="loading-state">
                      <span className="loading-spinner"></span>
                      설정 중...
                    </div>
                  ) : (
                    <div className="select-button">
                      <span className="button-text">선택하기</span>
                      <span className="button-arrow">→</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 안내 정보 */}
        <div className="info-section">
          <div className="info-card">
            <h3 className="info-title">
              <span className="info-icon">💡</span>
              선택 가이드
            </h3>
            <div className="info-content">
              <div className="info-item">
                <strong>학부모를 선택하면:</strong>
                <span>학급 초대코드나 QR코드를 통해 자녀의 학급에 참여할 수 있습니다.</span>
              </div>
              <div className="info-item">
                <strong>선생님을 선택하면:</strong>
                <span>교사 인증 후 새로운 학급을 생성하거나 기존 학급을 관리할 수 있습니다.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* CSS 변수 정의 */
        .role-select-page {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-glass: rgba(255, 255, 255, 0.95);
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --border-color: #e2e8f0;
          --accent-color: #4f46e5;
          --accent-hover: #4338ca;
          --success-color: #10b981;
          --warning-color: #f59e0b;
          --error-color: #ef4444;
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 20px;
        }

        /* 다크모드 */
        @media (prefers-color-scheme: dark) {
          .role-select-page {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-glass: rgba(15, 23, 42, 0.95);
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --text-muted: #64748b;
            --border-color: #334155;
          }
        }

        .role-select-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 1000px;
          margin: 0 auto;
          animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        /* 헤더 */
        .header {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-xl);
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-xl);
          border: 1px solid rgba(255, 255, 255, 0.3);
          text-align: center;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 0.5rem 0;
        }

        .page-subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
          margin: 0;
          font-weight: 500;
        }

        /* 역할 카드들 */
        .role-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .role-card {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-xl);
          padding: 2rem;
          box-shadow: var(--shadow-lg);
          border: 2px solid rgba(255, 255, 255, 0.3);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: relative;
          overflow: hidden;
        }

        .role-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-xl);
          border-color: var(--accent-color);
        }

        .role-card.selected {
          border-color: var(--success-color);
          background: rgba(16, 185, 129, 0.1);
          transform: translateY(-4px);
        }

        .role-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(135deg, var(--accent-color) 0%, #7c3aed 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .role-card:hover::before {
          opacity: 1;
        }

        .role-card.selected::before {
          background: linear-gradient(135deg, var(--success-color) 0%, #059669 100%);
          opacity: 1;
        }

        /* 카드 헤더 */
        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .role-icon {
          font-size: 3rem;
          flex-shrink: 0;
          background: linear-gradient(135deg, var(--accent-color) 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .role-title h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
        }

        .role-description {
          color: var(--text-secondary);
          font-size: 1rem;
          margin: 0;
          line-height: 1.5;
        }

        /* 기능 목록 */
        .features-list {
          flex: 1;
        }

        .features-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 1rem 0;
        }

        .features-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .features-list li {
          color: var(--text-secondary);
          font-size: 0.95rem;
          position: relative;
          padding-left: 1.5rem;
          line-height: 1.4;
        }

        .features-list li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: var(--success-color);
          font-weight: bold;
          font-size: 1.1rem;
        }

        /* 카드 푸터 */
        .card-footer {
          margin-top: auto;
        }

        .select-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%);
          color: white;
          border-radius: var(--radius-md);
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .role-card:hover .select-button {
          transform: translateX(4px);
        }

        .button-text {
          font-size: 1rem;
        }

        .button-arrow {
          font-size: 1.2rem;
          transition: transform 0.2s ease;
        }

        .role-card:hover .button-arrow {
          transform: translateX(4px);
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, var(--success-color) 0%, #059669 100%);
          color: white;
          border-radius: var(--radius-md);
          font-weight: 600;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 안내 정보 */
        .info-section {
          display: flex;
          justify-content: center;
        }

        .info-card {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-xl);
          padding: 2rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(255, 255, 255, 0.3);
          max-width: 600px;
          width: 100%;
        }

        .info-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 1.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .info-icon {
          font-size: 1.4rem;
        }

        .info-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .info-item strong {
          color: var(--text-primary);
          font-weight: 600;
        }

        .info-item span {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .role-select-page {
            padding: 0.5rem;
          }

          .header,
          .info-card {
            padding: 1.5rem;
            margin-bottom: 1rem;
          }

          .page-title {
            font-size: 2rem;
          }

          .page-subtitle {
            font-size: 1rem;
          }

          .role-cards {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .role-card {
            padding: 1.5rem;
          }

          .role-icon {
            font-size: 2.5rem;
          }

          .role-title h3 {
            font-size: 1.3rem;
          }

          .card-header {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }
        }

        /* 태블릿 */
        @media (max-width: 1024px) and (min-width: 769px) {
          .container {
            max-width: 800px;
          }

          .role-cards {
            grid-template-columns: 1fr;
            max-width: 500px;
            margin: 0 auto 2rem;
          }
        }

        /* 접근성 개선 */
        .role-card:focus {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
        }

        .role-card:focus:not(:hover) {
          transform: translateY(-4px);
        }

        /* 프린트 스타일 */
        @media print {
          .role-select-page {
            background: white;
            padding: 0;
          }

          .header,
          .role-card,
          .info-card {
            background: white;
            box-shadow: none;
            border: 1px solid #ccc;
          }

          .role-card {
            break-inside: avoid;
          }
        }

        /* 애니메이션 */
        .role-card {
          animation: slideUp 0.6s ease-out;
        }

        .role-card:nth-child(2) {
          animation-delay: 0.1s;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default RoleSelectPage;