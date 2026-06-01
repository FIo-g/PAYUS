/**
 * QR Scanner — preview adapter (JSX only, no real camera, no html5-qrcode).
 * The real component is src/pages/payment/QRScanner.tsx — this file mirrors
 * its visual structure so the user can see all 4 states in a phone frame.
 */

const { useState, useEffect } = React;

const QR_BOX_SIZE = 250;
const CORNER_LEN = 30;
const CORNER_THICKNESS = 3;

// ─── Fake camera background — a busy table scene + a QR-looking square ──
function FakeCameraScene() {
  // Generate a fake QR-ish pattern
  const cells = [];
  const seed = 'sejong-pay-fake-qr-001';
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const rng = () => { h = (h * 1664525 + 1013904223) | 0; return ((h >>> 0) % 1000) / 1000; };
  for (let i = 0; i < 121; i++) cells.push(rng() < 0.5);
  // Force 3 finder patterns at corners
  const forceBlack = new Set([0,1,2,3,4,5,6, 11,15, 22,26, 33,37, 44,48, 55,56,57,58,59,60,61,
                              7,8,9,10, 18,21, 29,32, 40,43, 51,54, 62,65,
                              66,67,68,69,70,71,72, 77,81, 88,92, 99,103, 110,114]);
  return (
    <div className="absolute inset-0 fake-camera flex items-center justify-center">
      <div className="qr-fake" aria-hidden="true">
        {cells.map((b, i) => (
          <span key={i} className={(b || forceBlack.has(i)) ? '' : 'b'} />
        ))}
      </div>
    </div>
  );
}

function Corner({ pos }) {
  const stroke = `${CORNER_THICKNESS}px solid white`;
  const r = 10;
  const map = {
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

function ScannerOverlay({ simulationMode }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative" style={{ width: QR_BOX_SIZE, height: QR_BOX_SIZE }}>
          <div
            className="absolute inset-0 rounded-xl"
            style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)' }}
          />
          <div
            className="absolute -inset-1 rounded-[14px]"
            style={{ boxShadow: '0 0 24px rgba(169, 29, 58, 0.35)' }}
          />
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />

          {/* animated scan line — preview-only flourish to show this is live */}
          <div className="absolute inset-x-1 top-1 animate-scan-line">
            <div className="scan-line" />
          </div>

          {simulationMode && (
            <div className="absolute inset-0 flex items-end justify-center pb-2">
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

// ─── Manual sheet ───────────────────────────────────────────────────────
function ManualSheet({ value, onChange, onSubmit, onClose, simulationMode }) {
  return (
    <div
      role="dialog"
      aria-label="QR 코드 수동 입력"
      className="absolute inset-0 z-20 flex flex-col justify-end bg-black/60 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="text-content-primary rounded-t-3xl p-5 pb-7 animate-sheet-in"
        style={{ background: 'var(--surface-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid place-items-center mb-3">
          <span aria-hidden="true" className="block w-9 h-1 rounded-full bg-border-strong" />
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
          <label htmlFor="sj-qr-manual" className="sr-only">QR 코드 값</label>
          <input
            id="sj-qr-manual"
            type="text"
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

// ─── Permission-failure view ────────────────────────────────────────────
function PermissionView({ kind, onRetry, onCancel, onManual }) {
  return (
    <div
      role="dialog"
      aria-label="카메라 권한 필요"
      className="absolute inset-0 bg-ink-900 text-white flex flex-col"
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
          className="w-20 h-20 rounded-full grid place-items-center text-3xl mb-5"
          style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}
        >
          ⊘
        </div>
        <h2 className="text-[22px] font-bold mb-2">카메라 권한이 필요해요</h2>
        <p className="text-[15px] opacity-80 mb-7 leading-relaxed max-w-[300px]">
          {kind === 'denied'
            ? '브라우저 설정에서 카메라 권한을 허용한 뒤 다시 시도해 주세요.'
            : '카메라를 열 수 없어요. 다른 앱이 사용 중이거나 기기가 지원하지 않을 수 있어요.'}
        </p>
        <div className="flex flex-col gap-2 w-full max-w-[280px]">
          <button
            type="button"
            onClick={onRetry}
            className="h-12 rounded-lg bg-primary-500 hover:bg-primary-600 font-semibold"
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={onManual}
            className="h-12 rounded-lg bg-white/10 hover:bg-white/15 font-semibold"
          >
            수동 입력으로 진행
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Scanner view ───────────────────────────────────────────────────────
function ScannerView({ status, simulationMode, onCancel, onManual }) {
  return (
    <div role="dialog" aria-label="QR 스캐너" className="absolute inset-0 bg-black text-white flex flex-col">
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
        <FakeCameraScene />
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
          onClick={onManual}
          aria-label="QR 코드를 직접 입력하기"
          className="h-11 px-5 rounded-lg text-primary-300 hover:bg-white/10 font-semibold transition-colors"
        >
          수동 입력
        </button>
      </footer>
    </div>
  );
}

// ─── Top-level demo wrapper ─────────────────────────────────────────────
function QRScannerDemo({ state, simulationMode, showManual, onChangeShowManual, lastScan, onScan, onCancel }) {
  const [manualValue, setManualValue] = useState('sj_merchant_8842');

  const submit = (e) => {
    e.preventDefault();
    const v = manualValue.trim();
    if (!v) return;
    onChangeShowManual(false);
    onScan(v);
  };

  const status = simulationMode
    ? '시뮬레이션 모드 — 수동 입력으로 진행하세요'
    : 'QR을 가이드 박스 안에 맞춰주세요';

  return (
    <>
      {state === 'scanner' && (
        <ScannerView
          status={status}
          simulationMode={simulationMode}
          onCancel={onCancel}
          onManual={() => onChangeShowManual(true)}
        />
      )}
      {(state === 'denied' || state === 'error') && (
        <PermissionView
          kind={state}
          onRetry={() => alert('startScanner() — 실제로는 카메라 재요청')}
          onCancel={onCancel}
          onManual={() => onChangeShowManual(true)}
        />
      )}
      {showManual && (
        <ManualSheet
          value={manualValue}
          onChange={setManualValue}
          onSubmit={submit}
          onClose={() => onChangeShowManual(false)}
          simulationMode={simulationMode}
        />
      )}
    </>
  );
}

// ─── Tweaks panel ───────────────────────────────────────────────────────
function Tweaks({ state, setState, simulationMode, setSimulationMode, showManual, setShowManual, lastScan }) {
  return (
    <div className="tweaks">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-mono uppercase tracking-wider text-content-muted">Preview controls</div>
      </div>

      <div className="mb-4">
        <div className="text-[12px] font-semibold mb-2">상태</div>
        <div className="grid grid-cols-2 gap-1.5 text-[12px]">
          {[
            ['scanner', '스캐너'],
            ['denied', '권한 거부'],
            ['error', '카메라 오류'],
            ['manual', '수동 입력'],
          ].map(([k, label]) => {
            const active = (k === 'manual' ? showManual : state === k && !showManual);
            return (
              <button
                key={k}
                onClick={() => {
                  if (k === 'manual') {
                    setShowManual(true);
                    setState('scanner');
                  } else {
                    setShowManual(false);
                    setState(k);
                  }
                }}
                className={[
                  'h-9 rounded-md font-semibold transition-colors',
                  active
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/5 text-content-secondary hover:bg-white/10',
                ].join(' ')}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center justify-between mb-4 cursor-pointer">
        <div>
          <div className="text-[12px] font-semibold">simulationMode</div>
          <div className="text-[11px] text-content-muted">개발용 — 카메라 없이 텍스트 입력</div>
        </div>
        <span
          className={[
            'inline-flex w-10 h-6 rounded-full p-0.5 transition-colors duration-fast',
            simulationMode ? 'bg-primary-500' : 'bg-white/15',
          ].join(' ')}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={simulationMode}
            onChange={(e) => setSimulationMode(e.target.checked)}
          />
          <span
            className={[
              'block w-5 h-5 rounded-full bg-white transition-transform duration-fast',
              simulationMode ? 'translate-x-4' : 'translate-x-0',
            ].join(' ')}
          />
        </span>
      </label>

      <div className="border-t border-white/10 pt-3">
        <div className="text-[11px] font-mono uppercase tracking-wider text-content-muted mb-1.5">마지막 onScan</div>
        <div className="font-mono text-[12px] text-primary-300 break-all min-h-[18px]">
          {lastScan || <span className="text-content-muted">아직 호출되지 않음</span>}
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-content-muted leading-relaxed">
        실제 컴포넌트는 <span className="font-mono text-content-secondary">src/pages/payment/QRScanner.tsx</span>.
        이 미리보기는 카메라가 없는 환경에서 4가지 상태를 모두 렌더링하기 위한 어댑터예요.
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────
function App() {
  const [state, setState] = useState('scanner');
  const [simulationMode, setSimulationMode] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastScan, setLastScan] = useState('');

  const onScan = (v) => {
    setLastScan(v);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(200); } catch {}
    }
  };
  const onCancel = () => {
    setLastScan('(cancel)');
  };

  return (
    <>
      <div className="phone">
        <div className="phone-notch" />
        <div className="status-bar">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[11px]">●●●●</span>
            <span className="text-[11px]">5G</span>
            <span className="inline-block w-6 h-3 rounded-[3px] border border-white relative">
              <span className="absolute inset-[1px] right-[7px] bg-white rounded-[1px]" />
            </span>
          </span>
        </div>
        <div className="absolute inset-0 top-[44px] bottom-0">
          <QRScannerDemo
            state={state}
            simulationMode={simulationMode}
            showManual={showManual}
            onChangeShowManual={setShowManual}
            onScan={onScan}
            onCancel={onCancel}
          />
        </div>
        <div className="home-indicator" />
      </div>

      <Tweaks
        state={state}
        setState={setState}
        simulationMode={simulationMode}
        setSimulationMode={setSimulationMode}
        showManual={showManual}
        setShowManual={setShowManual}
        lastScan={lastScan}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('phone-mount')).render(<App />);
