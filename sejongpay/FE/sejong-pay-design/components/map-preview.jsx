/* eslint-disable */
/**
 * 가맹점 지도 — 미리보기 어댑터 (JSX, 카카오 SDK 없이 가짜 캔버스).
 *
 * 실제 컴포넌트는 src/pages/Map.tsx. 이 파일은 카카오 지도 키가 없는
 * 미리보기 환경에서 마커/시트/검색/필터 인터랙션을 모두 시연하기 위해
 * 동일한 비주얼 구조를 SVG 캔버스로 재현합니다.
 */

const { useState, useMemo, useEffect, useRef } = React;

// ─── 더미 데이터 (실제로는 MSW가 /api/v1/merchants/nearby에서 반환) ──────
const MERCHANTS = [
  { _id:'mch_01', name:'매머드커피 조치원역점', category:'cafe',        location:[127.2961, 36.6014], rating:4.8, reviewCount:284, cashbackRate:5 },
  { _id:'mch_02', name:'스타벅스 세종조치원점', category:'cafe',        location:[127.2949, 36.6006], rating:4.6, reviewCount:512, cashbackRate:2 },
  { _id:'mch_03', name:'청파동 로스터스',       category:'cafe',        location:[127.2918, 36.5998], rating:4.9, reviewCount:142, cashbackRate:7 },
  { _id:'mch_04', name:'컴포즈커피 캠퍼스점',   category:'cafe',        location:[127.2884, 36.6001], rating:4.3, reviewCount:187, cashbackRate:3 },
  { _id:'mch_05', name:'카페 길벗',             category:'cafe',        location:[127.2972, 36.6022], rating:4.7, reviewCount:64,  cashbackRate:8 },
  { _id:'mch_06', name:'할매김밥 청파점',       category:'restaurant',  location:[127.2956, 36.6019], rating:4.6, reviewCount:412, cashbackRate:7 },
  { _id:'mch_07', name:'24시 백반천국',         category:'restaurant',  location:[127.2978, 36.6008], rating:4.4, reviewCount:238, cashbackRate:5 },
  { _id:'mch_08', name:'교촌치킨 조치원점',     category:'restaurant',  location:[127.2941, 36.5994], rating:4.5, reviewCount:661, cashbackRate:3 },
  { _id:'mch_09', name:'청년식당',              category:'restaurant',  location:[127.2925, 36.6011], rating:4.7, reviewCount:198, cashbackRate:6 },
  { _id:'mch_10', name:'본죽 세종조치원점',     category:'restaurant',  location:[127.2902, 36.6005], rating:4.2, reviewCount:91,  cashbackRate:4 },
  { _id:'mch_11', name:'명동돈가스',            category:'restaurant',  location:[127.2967, 36.6027], rating:4.6, reviewCount:322, cashbackRate:5 },
  { _id:'mch_12', name:'교토라멘',              category:'restaurant',  location:[127.2989, 36.6002], rating:4.8, reviewCount:156, cashbackRate:8 },
  { _id:'mch_13', name:'왕만두 조치원역점',     category:'restaurant',  location:[127.2934, 36.6018], rating:4.4, reviewCount:73,  cashbackRate:6 },
  { _id:'mch_14', name:'GS25 조치원역점',       category:'convenience', location:[127.2964, 36.6012], rating:4.1, reviewCount:28,  cashbackRate:1 },
  { _id:'mch_15', name:'CU 세종조치원중앙점',   category:'convenience', location:[127.2929, 36.6007], rating:4.0, reviewCount:41,  cashbackRate:1 },
  { _id:'mch_16', name:'이마트24 캠퍼스점',     category:'convenience', location:[127.2891, 36.6004], rating:4.2, reviewCount:35,  cashbackRate:2 },
  { _id:'mch_17', name:'세븐일레븐 봉산점',     category:'convenience', location:[127.2952, 36.5988], rating:3.9, reviewCount:19,  cashbackRate:1 },
  { _id:'mch_18', name:'북적북적 스터디카페',   category:'study',       location:[127.2980, 36.6024], rating:4.7, reviewCount:88,  cashbackRate:10 },
  { _id:'mch_19', name:'집중 24H 스터디룸',     category:'study',       location:[127.2972, 36.5996], rating:4.5, reviewCount:52,  cashbackRate:7 },
  { _id:'mch_20', name:'서점 길벗 · 학습관',    category:'other',       location:[127.2886, 36.6009], rating:4.9, reviewCount:58,  cashbackRate:10 },
];

const CATEGORY_META = {
  restaurant:  { label:'식당',   color:'#EF4444', emojiless:'식' },
  cafe:        { label:'카페',   color:'#8A6E3F', emojiless:'카' },
  convenience: { label:'편의점', color:'#3B82F6', emojiless:'편' },
  study:       { label:'스터디', color:'#7C3AED', emojiless:'스' },
  other:       { label:'기타',   color:'#8B8C95', emojiless:'기' },
};
const CATEGORY_ORDER = ['cafe','restaurant','convenience','study','other'];

// ─── lng/lat → x/y projection for fake canvas ───────────────────────────
const VIEW = {
  minLng: 127.2870, maxLng: 127.3005,
  minLat: 36.5982,  maxLat: 36.6034,
};
function project(lng, lat, w, h) {
  const x = ((lng - VIEW.minLng) / (VIEW.maxLng - VIEW.minLng)) * w;
  const y = h - ((lat - VIEW.minLat) / (VIEW.maxLat - VIEW.minLat)) * h;
  return { x, y };
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = d => d*Math.PI/180;
  const dLat = toRad(lat2-lat1), dLng = toRad(lng2-lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(a)));
}

const CAMPUS_CENTER = { lat: 36.6004, lng: 127.2858 };

function formatDistance(m) {
  if (m < 1000) return `${m}m`;
  return `${(m/1000).toFixed(1)}km`;
}

// ─── Fake map canvas (SVG) ──────────────────────────────────────────────
function FakeMap({ width, height, children }) {
  // a couple of imaginary roads
  return (
    <svg width={width} height={height} className="absolute inset-0" aria-hidden="true">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
        </pattern>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%"  stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(26,27,32,0.10)" />
        </radialGradient>
      </defs>
      {/* background tile */}
      <rect width={width} height={height} fill="#F0EBE0" />
      <rect width={width} height={height} fill="url(#grid)" />
      {/* big road */}
      <path d={`M 0 ${height*0.5} Q ${width*0.4} ${height*0.4} ${width} ${height*0.55}`}
            stroke="#fff" strokeWidth="22" fill="none" />
      <path d={`M 0 ${height*0.5} Q ${width*0.4} ${height*0.4} ${width} ${height*0.55}`}
            stroke="#D6CFBC" strokeWidth="1" fill="none" />
      {/* secondary road */}
      <path d={`M ${width*0.55} 0 Q ${width*0.5} ${height*0.55} ${width*0.6} ${height}`}
            stroke="#fff" strokeWidth="14" fill="none" />
      <path d={`M ${width*0.55} 0 Q ${width*0.5} ${height*0.55} ${width*0.6} ${height}`}
            stroke="#D6CFBC" strokeWidth="1" fill="none" />
      {/* park blob */}
      <ellipse cx={width*0.18} cy={height*0.78} rx="58" ry="40" fill="#C9D8B9" opacity="0.7" />
      <ellipse cx={width*0.82} cy={height*0.20} rx="36" ry="28" fill="#C9D8B9" opacity="0.7" />
      {/* station marker */}
      <g transform={`translate(${project(127.2966, 36.6010, width, height).x}, ${project(127.2966, 36.6010, width, height).y})`}>
        <rect x="-26" y="-12" width="52" height="20" rx="10" fill="#1A1B20" />
        <text x="0" y="2" textAnchor="middle" fontSize="10" fontWeight="700" fill="white" fontFamily="Pretendard, sans-serif">조치원역</text>
      </g>
      {/* campus label */}
      <g transform={`translate(${project(127.2858, 36.6004, width, height).x}, ${project(127.2858, 36.6004, width, height).y})`}>
        <rect x="-46" y="-12" width="92" height="20" rx="10" fill="#8B0029" />
        <text x="0" y="2" textAnchor="middle" fontSize="10" fontWeight="700" fill="white" fontFamily="Pretendard, sans-serif">고려대 세종캠</text>
      </g>
      <rect width={width} height={height} fill="url(#vignette)" />
      {children}
    </svg>
  );
}

// ─── Marker pin ─────────────────────────────────────────────────────────
function MarkerPin({ x, y, meta, cashbackRate, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        position: 'absolute',
        left: x, top: y,
        transform: 'translate(-50%, -100%)',
      }}
      className="block group"
    >
      <span
        className="block w-9 h-9 rounded-full border-2 border-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.4)] grid place-items-center font-bold text-white text-[14px] transition-transform group-hover:scale-110 group-active:scale-95"
        style={{ background: meta.color }}
      >
        {meta.emojiless}
      </span>
      <span
        aria-hidden="true"
        className="absolute left-1/2 -bottom-1.5 -translate-x-1/2"
        style={{
          width: 0, height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `8px solid ${meta.color}`,
        }}
      />
      {cashbackRate >= 5 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] text-white text-[9px] font-bold grid place-items-center border-2 border-white"
        >%</span>
      )}
    </button>
  );
}

// ─── Category chips ─────────────────────────────────────────────────────
function CategoryFilter({ value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
      <Chip active={value === null} onClick={() => onChange(null)} color="#A91D3A" label="전체" />
      {CATEGORY_ORDER.map(cat => {
        const meta = CATEGORY_META[cat];
        return (
          <Chip key={cat} active={value === cat}
                onClick={() => onChange(value === cat ? null : cat)}
                color={meta.color} label={meta.label} dot />
        );
      })}
    </div>
  );
}
function Chip({ active, onClick, color, label, dot = false }) {
  return (
    <button
      type="button" onClick={onClick}
      className={[
        'shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors',
        active ? 'text-white shadow-[0_4px_12px_-4px_rgba(139,0,41,0.35)]'
               : 'bg-white border border-[#EFEFF2] text-[#4A4B53] hover:bg-[#F7F7F8]'
      ].join(' ')}
      style={active ? { background: color } : undefined}
    >
      {dot && (
        <span aria-hidden="true" className="w-2 h-2 rounded-full"
              style={{ background: active ? '#fff' : color }} />
      )}
      {label}
    </button>
  );
}

// ─── Bottom sheet ───────────────────────────────────────────────────────
function MerchantSheet({ merchant, onClose, onPay }) {
  useEffect(() => {
    if (!merchant) return;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [merchant, onClose]);

  if (!merchant) return null;
  const meta = CATEGORY_META[merchant.category];
  const cashTone =
    merchant.cashbackRate >= 10 ? 'bg-[#047857] text-white'
    : merchant.cashbackRate >= 5 ? 'bg-[#10B981] text-white'
    : 'bg-[#ECFDF5] text-[#047857]';

  return (
    <div role="dialog" aria-modal="true" aria-label={merchant.name + ' 상세'}
         className="absolute inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-[rgba(26,27,32,0.45)] animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[24px] shadow-[0_-8px_32px_-8px_rgba(26,27,32,0.18)] animate-sheet-in pb-7"
           onClick={(e) => e.stopPropagation()}>
        <div className="pt-3 pb-1 grid place-items-center">
          <span aria-hidden="true" className="block w-9 h-1 rounded-full bg-[#D1D2D8]" />
        </div>

        <div className="px-5 pt-2">
          <div className="flex gap-3">
            <div className="w-[88px] h-[88px] rounded-2xl overflow-hidden shrink-0 grid place-items-center"
                 style={{ background: meta.color + '20' }}>
              <span className="font-mono text-[10px] text-[#4A4B53] opacity-70">PHOTO</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono uppercase tracking-wider mb-0.5"
                   style={{ color: meta.color }}>{meta.label}</div>
              <h2 className="text-[18px] font-bold text-[#1A1B20] leading-tight truncate">{merchant.name}</h2>
              <p className="text-[12px] text-[#8B8C95] mt-1 truncate">조치원역 인근 · {merchant._id}</p>
              <div className="flex items-center gap-3 mt-2 text-[12px]">
                <span className="inline-flex items-center gap-1 text-[#4A4B53]">
                  <span aria-hidden="true">📍</span>
                  <span className="font-semibold tabular-nums">{formatDistance(merchant.distance)}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[#4A4B53]">
                  <span className="text-[#F59E0B]" aria-hidden="true">★</span>
                  <span className="font-semibold tabular-nums">{merchant.rating.toFixed(1)}</span>
                  <span className="text-[#8B8C95]">({merchant.reviewCount})</span>
                </span>
              </div>
            </div>
          </div>

          <div className={['flex items-center gap-3 p-3.5 rounded-2xl mt-4', cashTone].join(' ')}>
            <div className="w-8 h-8 rounded-full bg-white/20 grid place-items-center font-bold">₩</div>
            <div className="flex-1">
              <div className="text-[11px] opacity-90 font-mono uppercase tracking-wider">결제 시 적립</div>
              <div className="text-[16px] font-bold">{merchant.cashbackRate}% 캐시백</div>
            </div>
          </div>
        </div>

        <div className="px-5 mt-5">
          <button type="button" onClick={() => onPay(merchant)}
                  className="w-full h-14 rounded-xl bg-[#A91D3A] hover:bg-[#8B0029] text-white font-semibold text-[16px] transition-colors shadow-[0_6px_16px_-8px_rgba(139,0,41,0.5)]">
            이 가게에서 결제하기
          </button>
          <button type="button" onClick={onClose}
                  className="w-full h-11 mt-1 rounded-lg text-[#4A4B53] hover:bg-[#F7F7F8] font-semibold text-[14px]">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main app ───────────────────────────────────────────────────────────
function MapApp() {
  const [category, setCategory] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [lastNav, setLastNav] = useState(null);

  // debounce search
  useEffect(() => {
    setIsFetching(true);
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
      setIsFetching(false);
    }, 500);
    return () => clearTimeout(t);
  }, [searchInput, category]);

  // compute filtered + sorted + distance
  const merchants = useMemo(() => {
    return MERCHANTS
      .map(m => ({ ...m, distance: haversine(CAMPUS_CENTER.lat, CAMPUS_CENTER.lng, m.location[1], m.location[0]) }))
      .filter(m => !category || m.category === category)
      .filter(m => !searchQuery || m.name.toLowerCase().includes(searchQuery))
      .sort((a, b) => a.distance - b.distance);
  }, [category, searchQuery]);

  const MAP_W = 364, MAP_H = 540; // inside phone after header

  return (
    <div className="relative w-[380px] h-[760px] bg-black rounded-[44px] border-[8px] border-[#0a0a0a] overflow-hidden shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6),0_8px_20px_-10px_rgba(139,0,41,0.25)]">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[110px] h-7 bg-black rounded-full z-30" />
      <div className="absolute inset-0 top-0 bg-white rounded-[36px] overflow-hidden flex flex-col">
        {/* status bar */}
        <div className="h-11 flex items-end justify-between px-[22px] pb-1.5 text-[13px] font-semibold">
          <span>9:41</span>
          <span className="inline-flex items-center gap-1.5 text-[11px]">●●●● 5G
            <span className="inline-block w-[22px] h-[11px] border border-current rounded-[3px] relative">
              <span className="absolute inset-[1px] right-[6px] bg-current rounded-[1px]" />
            </span>
          </span>
        </div>

        {/* Search + filter */}
        <div className="relative px-5 pt-2 pb-3 z-20 bg-gradient-to-b from-white via-white/95 to-transparent">
          <div className="relative">
            <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8C95] text-[16px]">⌕</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="가맹점 이름으로 찾기"
              className="w-full h-11 pl-10 pr-3 text-[14px] rounded-full bg-white border border-[#EFEFF2] shadow-[0_1px_2px_rgba(26,27,32,0.04),0_6px_18px_-8px_rgba(26,27,32,0.10)] placeholder:text-[#8B8C95] focus:outline-none focus:border-[#A91D3A] focus:shadow-[0_0_0_4px_rgba(169,29,58,0.20)]"
            />
          </div>
          <div className="mt-3">
            <CategoryFilter value={category} onChange={setCategory} />
          </div>
          {isFetching && (
            <div role="status" aria-live="polite"
                 className="absolute left-1/2 -translate-x-1/2 -bottom-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1B20]/85 text-white text-[12px] font-semibold backdrop-blur shadow-md whitespace-nowrap">
              <span aria-hidden="true" className="inline-block w-3 h-3 border-2 border-current border-r-transparent rounded-full animate-spin" />
              지도 영역 검색 중
            </div>
          )}
        </div>

        {/* Fake map */}
        <div className="relative flex-1 overflow-hidden">
          <FakeMap width={MAP_W} height={MAP_H} />
          {merchants.map(m => {
            const meta = CATEGORY_META[m.category];
            const { x, y } = project(m.location[0], m.location[1], MAP_W, MAP_H);
            return (
              <MarkerPin
                key={m._id}
                x={x} y={y}
                meta={meta}
                cashbackRate={m.cashbackRate}
                onClick={() => setSelected(m)}
                label={`${m.name} (${meta.label}, ${m.cashbackRate}% 캐시백)`}
              />
            );
          })}

          {/* Result count pill */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="px-4 py-2 rounded-full bg-white border border-[#EFEFF2] shadow-[0_1px_2px_rgba(26,27,32,0.04),0_6px_18px_-8px_rgba(26,27,32,0.10)] text-[13px] font-semibold text-[#4A4B53]">
              {merchants.length === 0 && !isFetching
                ? '이 영역에는 가맹점이 없어요'
                : `근처 가맹점 ${merchants.length}곳`}
            </div>
          </div>

          {/* nav simulated */}
          {lastNav && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-[#10B981] text-white text-[11px] font-semibold animate-fade-in">
              → navigate({lastNav})
            </div>
          )}

          <MerchantSheet
            merchant={selected}
            onClose={() => setSelected(null)}
            onPay={(m) => {
              setSelected(null);
              setLastNav(`/payment/scan?merchantId=${m._id}`);
              setTimeout(() => setLastNav(null), 1800);
            }}
          />
        </div>

        <div className="absolute bottom-[7px] left-1/2 -translate-x-1/2 w-[120px] h-1 bg-black rounded-full opacity-85 z-30" />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('phone-mount')).render(<MapApp />);
