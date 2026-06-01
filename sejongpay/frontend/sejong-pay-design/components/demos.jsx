/* eslint-disable */
/**
 * Demos — wires the SJ* components into the v2 showcase.
 * Mounts to: #motion-demo, #components-demo, #patterns-demo, #dark-demo
 */

const { useState, useEffect, useRef } = React;

// ──────────────────────────────────────────────────────────────
// PHONE shell helper
// ──────────────────────────────────────────────────────────────
function PhoneShell({ children, dark = false, caption }) {
  return (
    <div className="relative">
      <div className={(dark ? 'dark ' : '') + 'phone'} style={dark ? { background: '#14151A', borderColor: '#000' } : {}}>
        <div className="phone-notch"></div>
        <div className="status-bar">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[11px]">●●●●</span>
            <span className="text-[11px]">5G</span>
            <span className="inline-block w-6 h-3 rounded-[3px] border border-current relative">
              <span className="absolute inset-[1px] right-[7px] bg-current rounded-[1px]"></span>
            </span>
          </span>
        </div>
        {children}
        <div className="home-indicator"></div>
      </div>
      {caption && <div className="absolute -bottom-7 left-0 right-0 text-center text-xs font-mono text-content-muted">{caption}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 04 — Motion playground
// ──────────────────────────────────────────────────────────────
function MotionDemo() {
  const [tick, setTick] = useState(0);
  const replay = () => setTick(t => t + 1);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-h3">Motion playground</h3>
        <button onClick={replay} className="text-[12px] font-mono text-primary-500 hover:underline">↻ replay</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border p-4 bg-surface-sunken overflow-hidden h-32 relative">
          <div className="text-[11px] font-mono text-content-muted mb-2">sheet-in · 320ms · out-soft</div>
          <div key={'s-' + tick} className="absolute left-3 right-3 bottom-3 h-16 rounded-xl bg-primary-500 text-white px-3 grid place-items-center text-sm font-semibold animate-sheet-in">
            결제수단 선택
          </div>
        </div>

        <div className="rounded-2xl border border-border p-4 bg-surface-sunken overflow-hidden h-32 relative">
          <div className="text-[11px] font-mono text-content-muted mb-2">fade-in · 200ms</div>
          <div key={'f-' + tick} className="absolute inset-3 rounded-xl bg-beige-100 grid place-items-center text-beige-700 text-sm font-semibold animate-fade-in">
            오버레이
          </div>
        </div>

        <div className="rounded-2xl border border-border p-4 bg-surface-sunken overflow-hidden h-32 relative">
          <div className="text-[11px] font-mono text-content-muted mb-2">scale-pop · 480ms · spring</div>
          <div className="absolute inset-0 grid place-items-center">
            <div key={'p-' + tick} className="w-16 h-16 rounded-full bg-cash-500 text-white grid place-items-center text-2xl font-bold animate-scale-pop">✓</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-4 bg-surface-sunken overflow-hidden h-32 relative">
          <div className="text-[11px] font-mono text-content-muted mb-2">결제 성공 (check + pulse)</div>
          <div className="absolute inset-0 grid place-items-center">
            <div key={'r-' + tick} className="w-16 h-16 rounded-full bg-cash-500 grid place-items-center animate-ring-pulse">
              <svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16.5 L13.5 23 L25 10" strokeDasharray="40" className="animate-check-draw" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-[12px] text-content-muted">
        결제 성공처럼 <span className="font-semibold text-content-primary">의미 있는 순간</span>에만 spring + pulse를 결합해요. 일반 전환은 <span className="font-mono">out-soft</span>로 통일.
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 05 — Components playground
// ──────────────────────────────────────────────────────────────
function CategoryChips() {
  const cats = ['전체', '카페', '한식', '분식', '편의점', '서점', '약국'];
  const [active, setActive] = useState('전체');
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
      {cats.map(c => (
        <button
          key={c}
          onClick={() => setActive(c)}
          className={[
            'shrink-0 px-3.5 py-1.5 rounded-pill text-sm transition-colors duration-fast',
            active === c
              ? 'bg-primary-600 text-white font-semibold'
              : 'bg-surface-sunken border border-border text-content-secondary hover:bg-ink-100',
          ].join(' ')}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function ComponentsDemo() {
  const [name, setName] = useState('박세종');
  const [pw, setPw] = useState('sejong0429');
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState('20221234');
  const [loading, setLoading] = useState(false);

  const triggerLoad = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1400);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-surface-card border border-border p-8">
        <div className="flex items-baseline justify-between mb-5">
          <h3 className="text-h3">Button</h3>
          <span className="text-xs text-content-muted">primary / secondary / ghost · sm 36 / md 44 / lg 56</span>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-y-5 items-center">
          <div className="text-xs font-mono text-content-muted">Primary</div>
          <div className="flex flex-wrap items-center gap-3">
            <SJButton size="sm">결제하기</SJButton>
            <SJButton size="md">결제하기</SJButton>
            <SJButton size="lg">8,500원 결제하기</SJButton>
            <SJButton size="md" loading={loading} onClick={triggerLoad}>처리하기</SJButton>
            <SJButton size="md" disabled>결제하기</SJButton>
          </div>

          <div className="text-xs font-mono text-content-muted">Secondary</div>
          <div className="flex flex-wrap items-center gap-3">
            <SJButton variant="secondary" size="sm">다음에</SJButton>
            <SJButton variant="secondary" size="md">취소하기</SJButton>
            <SJButton variant="secondary" size="lg">나중에 결정하기</SJButton>
            <SJButton variant="secondary" size="md" disabled>취소하기</SJButton>
          </div>

          <div className="text-xs font-mono text-content-muted">Ghost</div>
          <div className="flex flex-wrap items-center gap-3">
            <SJButton variant="ghost" size="sm">자세히 보기</SJButton>
            <SJButton variant="ghost" size="md">전체 내역 보기</SJButton>
            <SJButton variant="ghost" size="lg" trailingIcon={<span>→</span>}>계좌 변경하기</SJButton>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-surface-card border border-border p-8">
        <div className="flex items-baseline justify-between mb-5">
          <h3 className="text-h3">Input</h3>
          <span className="text-xs text-content-muted">label · password toggle · search · error</span>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <SJInput label="이름" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" />
          <SJInput label="비밀번호" type="password" value={pw} onChange={e => setPw(e.target.value)} helpText="영문·숫자 포함 8자 이상" />
          <SJInput label="가맹점 검색" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="매머드, 김밥천국, GS25..." />
          <SJInput
            label="학번"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            errorText={studentId.length !== 10 ? '올바른 학번 형식이 아니에요. (10자리)' : null}
            helpText="학생 인증에 사용돼요"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-3xl bg-surface-card border border-border p-8">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="text-h3">Badge · Chip</h3>
          </div>

          <div className="text-xs font-mono text-content-muted mb-2">CASHBACK</div>
          <div className="flex flex-wrap gap-2 mb-6">
            <SJBadge tone="cashback">+ 3% 캐시백</SJBadge>
            <SJBadge tone="cashback-strong">+ 5% 캐시백</SJBadge>
            <SJBadge tone="cashback-bold">+ 10% 캐시백</SJBadge>
          </div>

          <div className="text-xs font-mono text-content-muted mb-2">STATUS</div>
          <div className="flex flex-wrap gap-2 mb-6">
            <SJBadge tone="success">결제 완료</SJBadge>
            <SJBadge tone="beige">적립 대기</SJBadge>
            <SJBadge tone="brand">취소됨</SJBadge>
            <SJBadge tone="neutral">미인증</SJBadge>
            <SJBadge tone="warning">기간 임박</SJBadge>
            <SJBadge tone="error">실패</SJBadge>
          </div>

          <div className="text-xs font-mono text-content-muted mb-2">CATEGORY CHIPS</div>
          <CategoryChips />
        </div>

        <div className="rounded-3xl bg-surface-card border border-border p-8">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="text-h3">Merchant Card</h3>
          </div>
          <div className="space-y-3">
            <SJMerchantCard name="청파동 매머드커피" category="카페" distance="도보 3분 · 180m" cashback={5} rating={4.8} reviewCount={284} thumbnail="primary" />
            <SJMerchantCard name="할매김밥 청파점" category="분식" distance="도보 5분 · 320m" cashback={7} rating={4.6} reviewCount={112} thumbnail="beige" />
            <SJMerchantCard name="서점 길벗 · 학습관" category="서점" distance="캠퍼스 내 · 60m" cashback={10} rating={4.9} reviewCount={58} thumbnail="green" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 06 — Patterns: BottomSheet + Payment phones
// ──────────────────────────────────────────────────────────────
function MethodRow({ name, sub, mono, tone, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-fast text-left',
        selected ? 'border-primary-500 bg-primary-50/50' : 'border-border bg-surface-card hover:border-border-strong',
      ].join(' ')}
    >
      <span className={[
        'w-10 h-10 rounded-md grid place-items-center text-sm font-bold',
        tone === 'primary' ? 'bg-primary-600 text-white' : 'bg-beige-100 text-beige-700',
      ].join(' ')}>{mono}</span>
      <div className="flex-1">
        <div className="font-semibold text-[14px] text-content-primary">{name}</div>
        <div className="text-[12px] text-content-muted">{sub}</div>
      </div>
      <span className={[
        'w-5 h-5 rounded-full grid place-items-center text-[11px]',
        selected ? 'bg-primary-600 text-white' : 'border-2 border-border-strong',
      ].join(' ')}>{selected ? '✓' : ''}</span>
    </button>
  );
}

function PaymentScreen({ dark = false, onPay, paid = false }) {
  return (
    <div className="h-full flex flex-col relative">
      <div className="px-5 pt-1 pb-4 flex items-center">
        <button className="w-9 h-9 -ml-2 grid place-items-center text-content-secondary text-lg">←</button>
        <div className="ml-1 font-semibold text-content-primary">결제</div>
        <div className="ml-auto text-[11px] font-mono text-content-muted">SAFE · 256bit</div>
      </div>

      <div className="px-5">
        <div className={(dark ? 'bg-surface-sunken border-border' : 'bg-beige-50 border-beige-100') + ' flex items-center gap-3 p-3.5 rounded-2xl border'}>
          <div className="sj-stripes w-12 h-12 rounded-xl grid place-items-center">
            <span className="font-mono text-[9px] text-primary-500">LOGO</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-mono text-content-muted">청파동 · 카페</div>
            <div className="font-semibold text-[15px] text-content-primary">매머드커피 청파점</div>
          </div>
          <SJBadge tone="cashback-strong">+5%</SJBadge>
        </div>
      </div>

      <div className="px-5 pt-7 pb-5 text-center">
        <div className="text-[12px] text-content-muted font-medium">결제 금액</div>
        <div className="mt-2 flex items-baseline justify-center gap-1">
          <span className="text-money tabular-nums text-content-primary">8,500</span>
          <span className="text-h2 text-content-secondary ml-1">원</span>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-cash-50 text-cash-700 text-[12px] font-bold">
          <span>↻</span>
          <span>예상 캐시백 ₩425 적립 예정</span>
        </div>
      </div>

      <div className="px-5">
        <div className="rounded-2xl border border-border divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[13px] text-content-secondary">상품 금액</span>
            <span className="text-[13px] font-semibold tabular-nums text-content-primary">₩8,500</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[13px] text-content-secondary">학생 즉시 할인</span>
            <span className="text-[13px] font-semibold text-content-brand tabular-nums">- ₩0</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[13px] text-content-secondary">예상 캐시백 (5%)</span>
            <span className="text-[13px] font-semibold text-cash-600 tabular-nums">+ ₩425</span>
          </div>
        </div>
      </div>

      <div className="px-5 mt-4">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-sunken">
          <span className="w-8 h-8 rounded-md bg-primary-600 text-white grid place-items-center text-[11px] font-bold">우리</span>
          <div className="flex-1 text-left">
            <div className="text-[13px] font-semibold text-content-primary leading-tight">우리은행 입출금</div>
            <div className="text-[11px] text-content-muted">잔액 ₩482,140</div>
          </div>
          <span className="text-content-muted text-[12px]">변경 ›</span>
        </button>
      </div>

      <div className="absolute left-0 right-0 bottom-0 px-5 pb-7 pt-3">
        <SJButton block size="lg" onClick={onPay} className="!h-[60px] !text-[17px]">8,500원 결제하기</SJButton>
        <div className="text-center text-[11px] text-content-muted mt-2.5">결제 시 세종페이 이용약관에 동의하게 돼요.</div>
      </div>

      {paid && <PaymentSuccess />}
    </div>
  );
}

function PaymentSuccess() {
  return (
    <div className="absolute inset-0 z-30 bg-surface-card animate-fade-in flex flex-col items-center justify-center px-8 text-center">
      <div className="relative">
        <div className="w-24 h-24 rounded-full animate-ring-pulse absolute inset-0"></div>
        <div className="w-24 h-24 rounded-full bg-cash-500 grid place-items-center animate-scale-pop relative">
          <svg viewBox="0 0 32 32" width="44" height="44" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 16.5 L13.5 23 L25 10" strokeDasharray="40" className="animate-check-draw" />
          </svg>
        </div>
      </div>
      <div className="mt-6 animate-coin-rise">
        <div className="text-[12px] font-mono text-content-muted">결제 완료</div>
        <div className="mt-2 text-h1 text-content-primary tabular-nums">8,500<span className="text-h2 text-content-secondary ml-1">원</span></div>
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-cash-50 text-cash-700 text-[12px] font-bold">
          <span>+</span><span>₩425 적립 예정</span>
        </div>
      </div>
      <div className="absolute left-0 right-0 bottom-7 px-5 animate-coin-rise" style={{ animationDelay: '640ms' }}>
        <SJButton block size="lg" variant="secondary">홈으로 돌아가기</SJButton>
      </div>
    </div>
  );
}

function PatternsDemo() {
  const sheetRef = useRef(null);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [method, setMethod] = useState('woori');

  return (
    <div className="flex gap-10 flex-wrap items-start justify-center">
      <PhoneShell caption="BottomSheet · 결제수단 선택">
        <div ref={sheetRef} className="absolute inset-0 top-[44px] bottom-0">
          <div className="px-5 pt-2 opacity-40 pointer-events-none">
            <div className="h-5 w-24 bg-ink-100 rounded mb-3"></div>
            <div className="h-32 bg-ink-100 rounded-xl mb-3"></div>
            <div className="h-20 bg-ink-100 rounded-xl"></div>
          </div>

          <SJBottomSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            container={sheetRef.current}
            eyebrow="결제 방법 선택"
            title="어떻게 결제할까요?"
            footer={<SJButton block size="lg" onClick={() => setSheetOpen(false)}>이 방법으로 결제하기</SJButton>}
          >
            <div className="space-y-2">
              <MethodRow name="우리은행 입출금" sub="잔액 ₩482,140" mono="우리" tone="primary" selected={method === 'woori'} onClick={() => setMethod('woori')} />
              <MethodRow name="KB국민카드" sub="**** 8821" mono="국민" tone="beige" selected={method === 'kb'} onClick={() => setMethod('kb')} />
              <button className="w-full p-3.5 border border-dashed border-border-strong rounded-xl text-[13px] text-content-muted font-semibold hover:bg-surface-sunken">+ 결제수단 추가하기</button>
            </div>
          </SJBottomSheet>

          {!sheetOpen && (
            <button onClick={() => setSheetOpen(true)} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-primary-500 text-white h-11 px-5 rounded-lg text-sm font-semibold">시트 다시 열기</button>
          )}
        </div>
      </PhoneShell>

      <PhoneShell caption="Payment · 결제 화면">
        <PaymentScreen />
      </PhoneShell>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 07 — Dark mode payment + success animation
// ──────────────────────────────────────────────────────────────
function DarkDemo() {
  const [paid, setPaid] = useState(false);
  const [key, setKey] = useState(0);

  const pay = () => setPaid(true);
  const reset = () => { setPaid(false); setKey(k => k + 1); };

  return (
    <div className="flex gap-10 flex-wrap items-start justify-center">
      <PhoneShell dark caption="Payment · 다크모드">
        <div key={key} className="dark absolute inset-0 top-[44px] bottom-0" style={{ background: '#14151A' }}>
          <PaymentScreen dark onPay={pay} paid={paid} />
        </div>
      </PhoneShell>

      <div className="max-w-[280px] pt-12">
        <div className="text-xs font-mono text-content-muted mb-2">DARK MODE</div>
        <h3 className="text-h2 mb-3">결제 컨텍스트는 어둠에서도 또렷하게.</h3>
        <p className="text-body text-content-secondary mb-6">
          크림슨 600은 어두운 배경에서 채도가 죽기 때문에, 다크모드의 <code className="font-mono text-content-primary">content-brand</code>는 primary-300으로 lift합니다.
          캐시백 그린은 동일 hue를 유지해서 적립 = 그린 학습을 깨지 않아요.
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={pay} disabled={paid} className="bg-primary-500 text-white h-11 rounded-lg font-semibold disabled:opacity-50">결제 성공 트리거</button>
          <button onClick={reset} className="bg-surface-sunken text-content-secondary h-11 rounded-lg font-semibold hover:bg-ink-100">리셋 · 재생</button>
        </div>

        <div className="mt-8 rounded-2xl bg-surface-card border border-border p-4">
          <div className="text-xs font-mono text-content-muted mb-2">전환 방법</div>
          <pre className="font-mono text-[12px] text-content-secondary leading-relaxed">{`<html class="dark">
  <!-- 컴포넌트는 그대로 -->
</html>`}</pre>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Mount
// ──────────────────────────────────────────────────────────────
function mount(id, Component) {
  const el = document.getElementById(id);
  if (!el) return;
  ReactDOM.createRoot(el).render(<Component />);
}

mount('motion-demo', MotionDemo);
mount('components-demo', ComponentsDemo);
mount('patterns-demo', PatternsDemo);
mount('dark-demo', DarkDemo);
