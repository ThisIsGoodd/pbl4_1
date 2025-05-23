import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function RequestSchoolPage() {
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const formatPhoneNumber = (value) => {
    const onlyNums = value.replace(/\D/g, '');
    if (onlyNums.length <= 3) return onlyNums;
    if (onlyNums.length <= 7) return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3)}`;
    return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 7)}-${onlyNums.slice(7, 11)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phoneRegex = /^\d{3}-\d{4}-\d{4}$/;

    if (
      !schoolName.trim() ||
      !schoolType ||
      schoolCode.length !== 7 ||
      !name.trim() ||
      !phone.trim() ||
      !phoneRegex.test(phone)
    ) {
      setError('모든 항목을 정확히 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/schools/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ schoolName, schoolType, schoolCode, name, phone }),
      });

      if (res.ok) {
        navigate('/school/pending');
      } else {
        const result = await res.json();
        setError(result.error || '요청에 실패했습니다.');
      }
    } catch (err) {
      console.error('🔥 요청 오류:', err);
      setError('서버 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <h2 className="text-2xl font-semibold mb-6">학교 생성 요청</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-100 shadow-md rounded-lg p-6 w-full max-w-md"
      >
        {/* 학교명 */}
        <label className="block mb-2 text-sm font-medium">학교명</label>
        <input
          type="text"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="학교명 입력란"
          className="w-full px-3 py-2 mb-4 border rounded"
        />

        {/* 학교 유형 */}
        <label className="block mb-2 text-sm font-medium">학교 유형</label>
        <div className="flex gap-4 mb-4">
          {['초등학교', '중학교', '고등학교'].map((type) => (
            <label key={type} className="flex items-center gap-1">
              <input
                type="radio"
                name="schoolType"
                value={type}
                checked={schoolType === type}
                onChange={(e) => setSchoolType(e.target.value)}
              />
              {type}
            </label>
          ))}
        </div>

        {/* 학교코드 */}
        <label className="block mb-2 text-sm font-medium">학교 코드</label>
        <input
          type="text"
          value={schoolCode}
          onChange={(e) => setSchoolCode(e.target.value.replace(/\D/g, '').slice(0, 7))}
          maxLength={7}
          inputMode="numeric"
          placeholder="예: 1234567(교육부 제공 학교 코드)"
          className="w-full px-3 py-2 mb-4 border rounded"
        />

        {/* 신청자 정보 */}
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="성함 입력란"
            className="w-1/2 px-3 py-2 border rounded"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
            placeholder="예: 010-1234-5678"
            className="w-1/2 px-3 py-2 border rounded"
            maxLength={13}
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <div className="flex justify-between gap-4 mt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-1/2 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
          >
            뒤로 가기
          </button>
          <button
            type="submit"
            className="w-1/2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            요청하기
          </button>
        </div>
      </form>
    </div>
  );
}

export default RequestSchoolPage;
