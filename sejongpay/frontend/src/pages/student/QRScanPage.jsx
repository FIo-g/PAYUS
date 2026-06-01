// src/pages/student/QRScanPage.jsx
// QR 결제 스캔 화면 (화면 05)

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';

export default function QRScanPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);

  // TODO: html5-qrcode 라이브러리 연동
  const handleScanResult = useCallback(
    (result) => {
      if (result) {
        navigate('/payment/confirm', { state: { qrToken: result } });
      }
    },
    [navigate]
  );

  return (
    <PageLayout showNav={false}>
      <Header title="QR 결제" showBack />
      <div className="flex flex-col items-center justify-center px-6 py-12">
        {/* QR 스캐너 영역 */}
        <div className="w-64 h-64 bg-gray-900 rounded-2xl flex items-center justify-center mb-6">
          <div className="w-48 h-48 border-2 border-white/50 rounded-lg relative">
            {/* 스캔 애니메이션 라인 */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary-500 animate-pulse" />
            <p className="absolute inset-0 flex items-center justify-center text-white text-sm">
              QR 코드를 스캔하세요
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-500 text-center">
          가맹점의 QR 코드를 카메라에 비춰주세요
        </p>

        {/* TODO: 수동 입력 옵션 */}
        <button
          onClick={() => toast('수동 입력 기능은 준비 중입니다.')}
          className="mt-6 text-sm text-primary-600 underline"
        >
          직접 가맹점 코드 입력
        </button>
      </div>
    </PageLayout>
  );
}
