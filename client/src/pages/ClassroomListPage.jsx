// client/src/pages/ClassroomListPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navigation from '../components/Navigation';

const ClassroomListPage = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [activeClassroomId, setActiveClassroomId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:3001/api/classrooms/user/joined-classrooms',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // 안전하게 데이터 설정 (빈 배열을 기본값으로)
      setClassrooms(response.data.classrooms || []);
      setActiveClassroomId(response.data.activeClassroomId || null);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      // 에러 발생 시에도 빈 배열로 설정
      setClassrooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveClassroom = async (classroomId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:3001/api/classrooms/user/set-active',
        { classroom_id: classroomId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // 메인 페이지로 이동 - classroom_id 파라미터 포함
      navigate(`/main?classroom_id=${classroomId}`);
    } catch (error) {
      console.error('Error setting active classroom:', error);
      alert('학급 전환에 실패했습니다.');
    }
  };

  const handleJoinClassroom = async () => {
    setJoinError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3001/api/classrooms/join-additional',
        { invite_code: inviteCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.classroom) {
        setShowJoinModal(false);
        setInviteCode('');
        
        // 새로 가입한 학급으로 바로 이동
        const newClassroomId = response.data.classroom.classroom_id;
        navigate(`/main?classroom_id=${newClassroomId}`);
      }
    } catch (error) {
      setJoinError(error.response?.data?.error || '학급 가입에 실패했습니다.');
    }
  };

  const handleLeaveClassroom = async (classroomId, schoolName, grade, classNumber) => {
    const confirmMsg = `정말로 ${schoolName} ${grade}학년 ${classNumber}반을 탈퇴하시겠습니까?`;
    if (!window.confirm(confirmMsg)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:3001/api/classrooms/leave/${classroomId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchClassrooms();
      alert('학급 탈퇴가 완료되었습니다.');
    } catch (error) {
      console.error('Error leaving classroom:', error);
      alert('학급 탈퇴에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto p-4 pt-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">내 학급 목록</h1>
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 학급 추가
          </button>
        </div>

        {classrooms.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">가입된 학급이 없습니다.</p>
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              첫 학급 가입하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {classrooms.map((classroom) => (
              <div 
                key={classroom.classroom_id} 
                className={`bg-white rounded-lg shadow p-6 ${
                  classroom.classroom_id === activeClassroomId ? 'border-2 border-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-xl font-semibold">{classroom.school_name}</h2>
                      {classroom.classroom_id === activeClassroomId && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-sm rounded">
                          현재 학급
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-1">
                      {classroom.grade}학년 {classroom.class_number}반
                    </p>
                    {classroom.teacher_name && (
                      <p className="text-gray-600 text-sm">
                        담임: {classroom.teacher_name} 선생님
                      </p>
                    )}
                    <p className="text-gray-500 text-sm mt-2">
                      가입일: {new Date(classroom.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {classroom.classroom_id !== activeClassroomId && (
                      <button
                        onClick={() => handleSetActiveClassroom(classroom.classroom_id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        이 학급으로 전환
                      </button>
                    )}
                    <button
                      onClick={() => handleLeaveClassroom(
                        classroom.classroom_id,
                        classroom.school_name,
                        classroom.grade,
                        classroom.class_number
                      )}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      탈퇴
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 학급 가입 모달 */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">새 학급 가입</h2>
            <p className="text-gray-600 mb-4">
              선생님으로부터 받은 초대 코드를 입력해주세요.
            </p>
            
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="초대 코드 입력"
              className="w-full px-4 py-2 border rounded-lg mb-4"
            />
            
            {joinError && (
              <p className="text-red-600 text-sm mb-4">{joinError}</p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={handleJoinClassroom}
                disabled={!inviteCode.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                가입하기
              </button>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setInviteCode('');
                  setJoinError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomListPage;