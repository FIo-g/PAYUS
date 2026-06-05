// src/pages/merchant/QRManagePage.jsx
// QR 관리 화면 (화면 24) — 정적/동적 QR

import { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import { merchantService } from '../../services/merchant.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';

// 동적 QR 토큰(SP-DYN-<base64url(payload)>.<hmac>)에서 만료시각(epoch ms) 디코드.
// 파싱 실패 시 발급 +10분으로 fallback (크래시 금지).
function decodeQrExp(qrToken) {
  try {
    const body = qrToken.replace(/^SP-DYN-/, '').split('.')[0];
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    if (payload && typeof payload.exp === 'number') return payload.exp;
  } catch {
    // 무시하고 fallback
  }
  return Date.now() + 10 * 60 * 1000;
}

// 남은 ms → "M:SS" 포맷 (기존 스텁 포맷 로직 유지)
function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function QRManagePage() {
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // 정적 QR
  const [staticQr, setStaticQr] = useState(null);
  const staticWrapRef = useRef(null);

  // 동적 QR
  const [dynamicQr, setDynamicQr] = useState(null);
  const [dynamicExp, setDynamicExp] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [generating, setGenerating] = useState(false);
  const intervalRef = useRef(null);

  // 마운트 시 본인 가맹점 + 정적 QR 조회
  useEffect(() => {
    let alive = true;
    setLoading(true);
    merchantService.getMine()
      .then((res) => {
        const m = res?.data;
        if (!alive) return;
        if (!m?._id) {
          setLoadError(true);
          toast.error('가맹점 정보를 불러오지 못했습니다');
          return;
        }
        setMerchant(m);
        return merchantService.getStaticQr(m._id)
          .then((qrRes) => { if (alive) setStaticQr(qrRes?.data?.staticQrCode ?? null); })
          .catch(() => { if (alive) toast.error('정적 QR을 불러오지 못했습니다'); });
      })
      .catch(() => {
        if (!alive) return;
        setLoadError(true);
        toast.error('가맹점 정보를 불러오지 못했습니다');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // 동적 QR 카운트다운 — exp 변경 시 재시작, 언마운트/만료 시 정리
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!dynamicQr || !dynamicExp) return;

    const tick = () => {
      const left = dynamicExp - Date.now();
      setRemaining(left);
      if (left <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [dynamicQr, dynamicExp]);

  const handleGenerateDynamic = async () => {
    if (!merchant?._id) return;
    setGenerating(true);
    try {
      const res = await merchantService.generateDynamicQr(merchant._id);
      const token = res?.data?.qrToken;
      if (!token) {
        toast.error('QR 발급에 실패했습니다');
        return;
      }
      setDynamicQr(token);
      setDynamicExp(decodeQrExp(token));
    } catch {
      toast.error('QR 발급에 실패했습니다');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadStatic = () => {
    const canvas = staticWrapRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error('QR 이미지를 찾을 수 없습니다');
      return;
    }
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sejongpay-qr-static.png';
      a.click();
    } catch {
      toast.error('다운로드에 실패했습니다');
    }
  };

  const handleCopyToken = async () => {
    if (!dynamicQr) return;
    try {
      await navigator.clipboard.writeText(dynamicQr);
      toast.success('토큰이 복사되었습니다');
    } catch {
      toast.error('복사에 실패했습니다');
    }
  };

  const expired = !!dynamicQr && remaining <= 0;

  if (loading) {
    return (
      <PageLayout>
        <Header title="QR 관리" showBack />
        <Loading />
      </PageLayout>
    );
  }

  if (loadError) {
    return (
      <PageLayout>
        <Header title="QR 관리" showBack />
        <div className="px-4 py-4">
          <Card>
            <p className="text-center text-gray-500 py-8">
              가맹점 정보를 불러오지 못했습니다.<br />
              잠시 후 다시 시도해 주세요.
            </p>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Header title="QR 관리" showBack />
      <div className="px-4 py-4 space-y-6">
        {/* 정적 QR */}
        <Card>
          <h3 className="font-bold mb-3">정적 QR (상시 부착용)</h3>
          {staticQr ? (
            <>
              <div ref={staticWrapRef} className="flex justify-center">
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                  <QRCodeCanvas value={staticQr} size={192} />
                </div>
              </div>
              {merchant?.name && (
                <p className="text-center text-sm text-gray-500 mt-3">{merchant.name}</p>
              )}
              <Button variant="secondary" className="mt-4" onClick={handleDownloadStatic}>
                다운로드 (PNG)
              </Button>
            </>
          ) : (
            <div className="w-48 h-48 bg-gray-100 rounded-xl mx-auto flex items-center justify-center">
              <p className="text-gray-400 text-sm text-center px-4">
                정적 QR이 아직<br />발급되지 않았습니다
              </p>
            </div>
          )}
        </Card>

        {/* 동적 QR */}
        <Card>
          <h3 className="font-bold mb-3">동적 QR (10분 만료)</h3>

          {dynamicQr ? (
            <>
              <div className="flex justify-center">
                <div className="relative bg-white p-4 rounded-xl border border-gray-100">
                  <div className={expired ? 'opacity-20' : ''}>
                    <QRCodeCanvas value={dynamicQr} size={192} />
                  </div>
                  {expired && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="px-3 py-1 bg-gray-900/80 text-white text-sm rounded-lg">
                        만료됨
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {expired ? (
                <p className="text-center text-sm text-red-500 mt-2">
                  QR이 만료되었습니다. 새 QR을 발급해 주세요.
                </p>
              ) : (
                <p className="text-center text-sm text-primary-600 mt-2">
                  남은 시간: {formatRemaining(remaining)}
                </p>
              )}

              {/* 토큰 원문 (시뮬레이션 수동 입력 테스트용) */}
              <div className="mt-3">
                <div className="text-xs break-all bg-gray-50 rounded-lg p-3 font-mono text-gray-700">
                  {dynamicQr}
                </div>
                <Button variant="secondary" className="mt-2" onClick={handleCopyToken}>
                  복사
                </Button>
              </div>
            </>
          ) : (
            <div className="w-48 h-48 bg-gray-100 rounded-xl mx-auto flex items-center justify-center">
              <p className="text-gray-400 text-sm">생성 버튼을 눌러주세요</p>
            </div>
          )}

          <Button onClick={handleGenerateDynamic} disabled={generating} className="mt-4">
            {generating ? '발급 중...' : '새 QR 발급'}
          </Button>
          <p className="text-center text-xs text-gray-400 mt-3">
            QR은 10분 후 만료되며 1회 결제에만 사용됩니다.
          </p>
        </Card>
      </div>
    </PageLayout>
  );
}
