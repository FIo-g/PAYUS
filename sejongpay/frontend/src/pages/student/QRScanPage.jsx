// src/pages/student/QRScanPage.jsx
// QR 결제 스캔 화면 (화면 05)

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from '../payment/QRScanner';

export default function QRScanPage() {
  const navigate = useNavigate();

  // 스캔/수동입력으로 얻은 qrToken 을 결제 확인 화면으로 전달
  const handleScan = useCallback(
    (qrToken) => {
      if (!qrToken) return;
      navigate('/payment/confirm', { state: { qrToken } });
    },
    [navigate]
  );

  return (
    <QRScanner
      onScan={handleScan}
      onCancel={() => navigate(-1)}
      // dev: 카메라 대신 수동입력 시트가 바로 열림 (토큰 붙여넣어 흐름 테스트)
      // 노트북 카메라로 실제 스캔을 테스트하려면 false 로 바꾸세요.
      simulationMode={import.meta.env.DEV}
    />
  );
}
