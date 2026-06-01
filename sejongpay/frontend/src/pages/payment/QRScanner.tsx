/**
 * QRScanner — 세종페이
 *
 * Mobile-first fullscreen QR scanner used in the payment flow.
 * Backed by html5-qrcode; assumes Tailwind set up with the SejongPay preset.
 *
 * Usage:
 *   <QRScanner
 *     onScan={(token) => router.push(`/payment/confirm/${token}`)}
 *     onCancel={() => router.back()}
 *     simulationMode={process.env.NODE_ENV !== 'production'}
 *   />
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export type QRScannerProps = {
  /** Fires once with the decoded QR text. Scanner stops on first hit. */
  onScan: (qrToken: string) => void;
  /** User tapped the close button — caller decides where to navigate. */
  onCancel: () => void;
  /**
   * Skip camera initialization and open the manual-entry sheet immediately.
   * Intended for local development and CI; never enable in production builds.
   */
  simulationMode?: boolean;
};

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

const SCANNER_REGION_ID = 'sj-qr-scanner-region';
const QR_BOX_SIZE = 250;

export default function QRScanner({
  onScan,
  onCancel,
  simulationMode = false,
}: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);

  const [permission, setPermission] = useState<PermissionState>(
    simulationMode ? 'granted' : 'idle'
  );
  const [status, setStatus] = useState<string>(
    simulationMode ? '시뮬레이션 모드' : 'QR을 가이드 박스 안에 맞춰주세요'
  );
  const [showManual, setShowManual] = useState<boolean>(simulationMode);
  const [manualValue, setManualValue] = useState<string>('');

  // ─── camera lifecycle ────────────────────────────────────────────

  const stopScanner = useCallback(async () => {
    const inst = scannerRef.current;
    if (!inst) return;
    try {
      if (isScanningRef.current) await inst.stop();
      await inst.clear();
    } catch {
      /* swallow: cleanup-only path */
    }
    isScanningRef.current = false;
    scannerRef.current = null;
  }, []);

  const handleSuccess = useCallback(
    (decodedText: string) => {
      // Guard against double-fire — html5-qrcode can dispatch twice
      // before stop() resolves.
      if (!isScanningRef.current) return;
      isScanningRef.current = false;

      try {
        navigator.vibrate?.(200);
      } catch {
        /* haptics unsupported */
      }
      setStatus('QR을 인식했어요');
      void stopScanner();
      onScan(decodedText);
    },
    [onScan, stopScanner]
  );

  const startScanner = useCallback(async () => {
    if (simulationMode) return;
    setPermission('requesting');
    setStatus('카메라 준비 중...');
    try {
      const inst = new Html5Qrcode(SCANNER_REGION_ID, /* verbose */ false);
      scannerRef.current = inst;
      isScanningRef.current = true;

      await inst.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: QR_BOX_SIZE, height: QR_BOX_SIZE },
          aspectRatio: 1,
        },
        handleSuccess,
        () => {
          /* per-frame decode errors are expected; ignore */
        }
      );

      setPermission('granted');
      setStatus('QR을 가이드 박스 안에 맞춰주세요');
    } catch (err) {
      isScanningRef.current = false;
      const msg = err instanceof Error ? err.message : String(err);
      setPermission(/permission|denied|notallowed/i.test(msg) ? 'denied' : 'error');
    }
  }, [handleSuccess, simulationMode]);

  useEffect(() => {
    if (simulationMode) return;
    void startScanner();
    return () => {
      void stopScanner();
    };
    // start/stop are stable for the component's lifetime; intentional empty deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── manual entry ────────────────────────────────────────────────

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const v = manualValue.trim();
    if (!v) return;
    void stopScanner();
    onScan(v);
  };

  // ─── permission failure view ─────────────────────────────────────

  if (permission === 'denied' || permission === 'error') {
    return (
      <div
        role="dialog"
        aria-label="카메라 권한 필요"
        className="fixed inset-0 bg-ink-900 text-white flex flex-col"
      >
        <header className="h-14 shrink-0 px-3 flex items-center">
          <button
            type="button"
            onClick={onCancel}
            aria-label="닫기"
            className="w-11 h-11 grid place-items-center -ml-1"
          >
            <span aria-hidden="true" className="text-xl">✕</span>
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div
            aria-hidden="true"
            className="w-20 h-20 rounded-full bg-error/20 grid place-items-center text-error text-3xl mb-5"
          >
            ⊘
          </div>
          <h2 className="text-[22px] font-bold mb-2">카메라 권한이 필요해요</h2>
          <p className="text-[15px] opacity-80 mb-7 leading-relaxed max-w-[300px]">
            {permission === 'denied'
              ? '브라우저 설정에서 카메라 권한을 허용한 뒤 다시 시도해 주세요.'
              : '카메라를 열 수 없어요. 다른 앱이 사용 중이거나 기기가 지원하지 않을 수 있어요.'}
          </p>
          <div className="flex flex-col gap-2 w-full max-w-[280px]">
            <button
              type="button"
              onClick={startScanner}
              className="h-12 rounded-lg bg-primary-500 hover:bg-primary-600 font-semibold"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="h-12 rounded-lg bg-white/10 hover:bg-white/15 font-semibold"
            >
              수동 입력으로 진행
            </button>
          </div>
        </div>
        {showManual && (
          <ManualSheet
            value={manualValue}
            onChange={setManualValue}
            onSubmit={submitManual}
            onClose={() => setShowManual(false)}
            simulationMode={false}
          />
        )}
      </div>
    );
  }

  // ─── scanner view ────────────────────────────────────────────────

  return (
    <div
      role="dialog"
      aria-label="QR 스캐너"
      className="fixed inset-0 bg-black text-white flex flex-col"
    >
      <header className="h-14 shrink-0 px-3 flex items-center bg-black/60 relative z-10">
        <button
          type="button"
          onClick={onCancel}
          aria-label="스캔 취소하고 닫기"
          className="w-11 h-11 grid place-items-center text-white -ml-1"
        >
          <span aria-hidden="true" className="text-xl">✕</span>
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold whitespace-nowrap">
          결제할 가맹점 QR을 스캔하세요
        </h1>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {/* html5-qrcode injects a <video> inside this node */}
        <div
          id={SCANNER_REGION_ID}
          aria-hidden="true"
          className="absolute inset-0 bg-black"
        />

        <ScannerOverlay simulationMode={simulationMode} />

        <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none px-6">
          <p
            role="status"
            aria-live="polite"
            className="px-4 py-2 rounded-full bg-black/60 text-[13px] font-medium text-center backdrop-blur"
          >
            {status}
          </p>
        </div>
      </main>

      <footer className="h-[100px] shrink-0 px-5 flex items-center justify-center bg-black/60 relative z-10">
        <button
          type="button"
          onClick={() => setShowManual(true)}
          aria-label="QR 코드를 직접 입력하기"
          className="h-11 px-5 rounded-lg text-primary-300 hover:bg-white/10 font-semibold transition-colors"
        >
          수동 입력
        </button>
      </footer>

      {showManual && (
        <ManualSheet
          value={manualValue}
          onChange={setManualValue}
          onSubmit={submitManual}
          onClose={() => setShowManual(false)}
          simulationMode={simulationMode}
        />
      )}
    </div>
  );
}

// ─── viewfinder ─────────────────────────────────────────────────────

type CornerPos = 'tl' | 'tr' | 'bl' | 'br';
const CORNER_LEN = 30;
const CORNER_THICKNESS = 3;

function ScannerOverlay({ simulationMode }: { simulationMode: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="relative"
          style={{ width: QR_BOX_SIZE, height: QR_BOX_SIZE }}
        >
          {/* dim everything outside the 250×250 box */}
          <div
            className="absolute inset-0 rounded-xl"
            style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)' }}
          />
          {/* subtle crimson glow on the cut-out edge */}
          <div
            className="absolute -inset-1 rounded-[14px]"
            style={{ boxShadow: '0 0 24px rgba(169, 29, 58, 0.35)' }}
          />
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
          {simulationMode && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-[10px] tracking-[0.3em] text-white/60">
                SIMULATION
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Corner({ pos }: { pos: CornerPos }) {
  const stroke = `${CORNER_THICKNESS}px solid white`;
  const r = 10;
  const map: Record<CornerPos, React.CSSProperties> = {
    tl: { top: -2, left: -2,  borderTop: stroke,    borderLeft: stroke,  borderTopLeftRadius: r },
    tr: { top: -2, right: -2, borderTop: stroke,    borderRight: stroke, borderTopRightRadius: r },
    bl: { bottom: -2, left: -2,  borderBottom: stroke, borderLeft: stroke,  borderBottomLeftRadius: r },
    br: { bottom: -2, right: -2, borderBottom: stroke, borderRight: stroke, borderBottomRightRadius: r },
  };
  return (
    <span
      aria-hidden="true"
      className="absolute"
      style={{ width: CORNER_LEN, height: CORNER_LEN, ...map[pos] }}
    />
  );
}

// ─── manual entry sheet ─────────────────────────────────────────────

function ManualSheet({
  value,
  onChange,
  onSubmit,
  onClose,
  simulationMode,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  simulationMode: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-label="QR 코드 수동 입력"
      className="absolute inset-0 z-20 flex flex-col justify-end bg-black/60 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface-card text-content-primary rounded-t-3xl p-5 pb-7 animate-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid place-items-center mb-3">
          <span
            aria-hidden="true"
            className="block w-9 h-1 rounded-full bg-border-strong"
          />
        </div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[18px] font-bold">
            {simulationMode ? '시뮬레이션 QR 입력' : 'QR 코드를 직접 입력하세요'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-content-muted text-[13px] font-semibold px-2 py-1"
          >
            닫기
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <label htmlFor="sj-qr-manual" className="sr-only">
            QR 코드 값
          </label>
          <input
            id="sj-qr-manual"
            type="text"
            inputMode="text"
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="예: sj_merchant_8842"
            className="w-full h-12 px-3.5 text-[15px] rounded-lg border-[1.5px] border-border bg-surface-card text-content-primary focus:outline-none focus:border-primary-500 focus:shadow-focus"
          />
          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full mt-3 h-12 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-semibold disabled:bg-primary-200 disabled:cursor-not-allowed transition-colors"
          >
            이 코드로 결제 진행
          </button>
        </form>
      </div>
    </div>
  );
}
