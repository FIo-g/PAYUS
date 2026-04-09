// src/pages/merchant/QRManagePage.jsx
// QR 관리 화면 (화면 24) — 정적/동적 QR

import { useState } from 'react';
import toast from 'react-hot-toast';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

export default function QRManagePage() {
  const [dynamicQr, setDynamicQr] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // TODO: merchantService.generateDynamicQr 호출
  const handleGenerateDynamic = async () => {
    toast('동적 QR 생성 — API 연동 예정');
  };

  return (
    <PageLayout>
      <Header title="QR 관리" showBack />
      <div className="px-4 py-4 space-y-6">
        {/* 정적 QR */}
        <Card>
          <h3 className="font-bold mb-3">정적 QR (상시 부착용)</h3>
          <div className="w-48 h-48 bg-gray-100 rounded-xl mx-auto flex items-center justify-center">
            <p className="text-gray-400 text-sm">QR 이미지</p>
          </div>
          <Button variant="secondary" className="mt-4">다운로드 (PNG)</Button>
        </Card>

        {/* 동적 QR */}
        <Card>
          <h3 className="font-bold mb-3">동적 QR (10분 만료)</h3>
          <div className="w-48 h-48 bg-gray-100 rounded-xl mx-auto flex items-center justify-center">
            {dynamicQr ? (
              <p className="text-gray-400 text-sm">QR 이미지</p>
            ) : (
              <p className="text-gray-400 text-sm">생성 버튼을 눌러주세요</p>
            )}
          </div>
          {countdown > 0 && (
            <p className="text-center text-sm text-primary-600 mt-2">
              남은 시간: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </p>
          )}
          <Button onClick={handleGenerateDynamic} className="mt-4">새로 생성</Button>
        </Card>
      </div>
    </PageLayout>
  );
}
