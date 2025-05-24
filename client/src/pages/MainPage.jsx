import { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function MainPage() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [classroomId, setClassroomId] = useState(null);
  const [classroomInfo, setClassroomInfo] = useState(null);
  const [posts, setPosts] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [classPhoto, setClassPhoto] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    const id = searchParams.get('classroom_id');
    if (id) {
      setClassroomId(id);
    } else {
      alert('학급 정보가 없습니다. 다시 로그인해주세요.');
      navigate('/join/invite');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!classroomId) return;

    // ✅ 학급 정보 가져오기
    fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setClassroomInfo(data);
        // 기존 단체사진 URL 설정
        if (data.class_photo) {
          setClassPhoto(`http://localhost:3001${data.class_photo}`);
        }
      })
      .catch(err => {
        console.error('학급 정보 불러오기 실패:', err);
      });
  }, [classroomId]);

  useEffect(() => {
    if (!user || !classroomId) return;

    // ✅ 공지사항 요청
    fetch(`http://localhost:3001/api/posts?classroom_id=${classroomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.posts) {
          const filtered = data.posts.filter(p => !p.school_wide).slice(0, 5);
          setPosts(filtered);
        }
      });

    // ✅ 일정 요청
    fetch(`http://localhost:3001/api/schedules?classroom_id=${classroomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.schedules) {
          const today = new Date().toISOString().split('T')[0];
          const filtered = data.schedules.filter(e => e.start <= today && e.end >= today);
          setTodayEvents(filtered);
        }
      });
  }, [user, classroomId]);

  // ✅ 단체사진 업로드 핸들러
  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('class_photo', file);

      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setClassPhoto(`http://localhost:3001${data.photo_url}`);
        alert('단체사진이 업로드되었습니다!');
      } else {
        alert(data.error || '업로드 실패');
      }
    } catch (err) {
      console.error('사진 업로드 오류:', err);
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (user === undefined) return null;

  return (
    <div style={styles.wrapper}>
      <h2 style={{ fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', margin: '2rem 0' }}>
        {classroomInfo
          ? `${classroomInfo.school} - ${classroomInfo.grade}학년 ${classroomInfo.class_number}반`
          : '학급 정보 불러오는 중...'}
      </h2>

      <div style={styles.layout}>
        {/* 왼쪽 영역 */}
        <div style={styles.left}>
          <div style={styles.photoBox}>
            {classPhoto ? (
              <img
                src={classPhoto}
                alt="단체사진"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  borderRadius: '8px'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  setClassPhoto('');
                }}
              />
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#777',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📸</div>
                <div>단체 사진 없음</div>
                {isTeacher && (
                  <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                    아래 버튼으로 사진을 업로드하세요
                  </div>
                )}
              </div>
            )}

            {/* 교사만 업로드 버튼 표시 */}
            {isTeacher && (
              <div style={styles.uploadButtonContainer}>
                <input
                  type="file"
                  id="photoUpload"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  disabled={uploadingPhoto}
                />
                <label 
                  htmlFor="photoUpload" 
                  style={{
                    ...styles.uploadButton,
                    opacity: uploadingPhoto ? 0.7 : 1,
                    cursor: uploadingPhoto ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploadingPhoto ? '업로드 중...' : classPhoto ? '📷 사진 변경' : '📷 사진 업로드'}
                </label>
              </div>
            )}
          </div>

          <div style={styles.noticeBox}>
            <h3>📌 최근 공지사항</h3>
            <ul>
              {posts.length === 0 ? (
                <li>공지사항 없음</li>
              ) : (
                posts.map(p => (
                  <li key={p.post_id} style={{ marginBottom: '0.5rem' }}>
                    <Link 
                      to={`/posts/${p.post_id}?classroom_id=${classroomId}`}
                      style={{ textDecoration: 'none', color: '#0066cc' }}
                    >
                      {p.title}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* 오른쪽 영역 */}
        <div style={styles.right}>
          <h3>🗓️ 오늘 일정</h3>
          {todayEvents.length === 0 ? (
            <p>오늘 일정 없음</p>
          ) : (
            <ul>
              {todayEvents.map(ev => (
                <li key={ev.schedule_id}>
                  <strong>{ev.title}</strong><br />
                  {ev.description}
                </li>
              ))}
            </ul>
          )}
          <br />
          <button onClick={() => navigate(`/schedules?classroom_id=${classroomId}`)}>
            전체 캘린더 보기
          </button>
          <hr style={{ margin: '2rem 0' }} />
          <h3>📅 달력 (예시 캘린더 자리)</h3>
          <div style={styles.calendarPlaceholder}>
            <p style={{ textAlign: 'center', color: '#999' }}>[여기에 달력이 표시됩니다]</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    padding: '2rem',
    width: '100%'
  },
  layout: {
    display: 'flex',
    gap: '2rem',
    marginTop: '2rem',
    height: '80vh'
  },
  left: {
    flex: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  photoBox: {
    flex: 4,
    border: '1px solid #ccc',
    backgroundColor: '#f8f8f8',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  uploadButtonContainer: {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2
  },
  uploadButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    border: 'none',
    display: 'inline-block',
    textDecoration: 'none'
  },
  noticeBox: {
    flex: 4,
    border: '1px solid #ccc',
    padding: '1rem',
    backgroundColor: '#fff',
    overflowY: 'auto',
    borderRadius: '8px'
  },
  right: {
    flex: 4,
    border: '1px solid #ccc',
    padding: '1rem',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRadius: '8px'
  },
  calendarPlaceholder: {
    flex: 1,
    border: '1px dashed #ccc',
    backgroundColor: '#fafafa',
    padding: '2rem',
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px'
  }
};

export default MainPage;