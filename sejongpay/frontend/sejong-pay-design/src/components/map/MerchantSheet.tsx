/**
 * <MerchantSheet> — 가맹점 상세 BottomSheet.
 *
 * 지도에서 마커를 탭했을 때 등장. 결제하기 CTA → QR 스캐너 라우트로 이동.
 */
import React, { useEffect } from 'react';
import { CATEGORY_META, type Merchant } from './types';

export type MerchantSheetProps = {
  merchant: Merchant | null;
  onClose: () => void;
  onPay: (merchant: Merchant) => void;
};

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export function MerchantSheet({ merchant, onClose, onPay }: MerchantSheetProps) {
  // ESC to close
  useEffect(() => {
    if (!merchant) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [merchant, onClose]);

  if (!merchant) return null;

  const meta = CATEGORY_META[merchant.category];
  const cashTone =
    merchant.cashbackRate >= 10
      ? 'bg-cash-700 text-white'
      : merchant.cashbackRate >= 5
      ? 'bg-cash-500 text-white'
      : 'bg-cash-50 text-cash-700';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${merchant.name} 상세`}
      className="fixed inset-0 z-40 flex flex-col justify-end"
    >
      <div
        className="absolute inset-0 bg-ink-900/40 animate-fade-in"
        onClick={onClose}
      />

      <div className="relative bg-surface-card rounded-t-4xl shadow-sheet animate-sheet-in pb-7">
        <div className="pt-3 pb-1 grid place-items-center">
          <span aria-hidden="true" className="block w-9 h-1 rounded-full bg-border-strong" />
        </div>

        <div className="px-5 pt-2">
          {/* thumbnail + meta */}
          <div className="flex gap-3">
            <div
              className="w-[88px] h-[88px] rounded-2xl overflow-hidden shrink-0 grid place-items-center"
              style={{ background: meta.ring }}
            >
              <span className="font-mono text-[10px] text-content-secondary opacity-70">PHOTO</span>
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[11px] font-mono uppercase tracking-wider mb-0.5"
                style={{ color: meta.color }}
              >
                {meta.label}
              </div>
              <h2 className="text-[18px] font-bold text-content-primary leading-tight truncate">
                {merchant.name}
              </h2>
              <p className="text-[12px] text-content-muted mt-1 truncate">
                {merchant.address}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[12px]">
                <span className="inline-flex items-center gap-1 text-content-secondary">
                  <span aria-hidden="true">📍</span>
                  <span className="font-semibold tabular-nums">{formatDistance(merchant.distance)}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-content-secondary">
                  <span className="text-warning" aria-hidden="true">★</span>
                  <span className="font-semibold tabular-nums">{merchant.rating.toFixed(1)}</span>
                  <span className="text-content-muted">({merchant.reviewCount})</span>
                </span>
              </div>
            </div>
          </div>

          {/* cashback */}
          <div className={['flex items-center gap-3 p-3.5 rounded-2xl mt-4', cashTone].join(' ')}>
            <div className="w-8 h-8 rounded-full bg-white/20 grid place-items-center font-bold">
              ₩
            </div>
            <div className="flex-1">
              <div className="text-[11px] opacity-90 font-mono uppercase tracking-wider">
                결제 시 적립
              </div>
              <div className="text-[16px] font-bold">
                {merchant.cashbackRate}% 캐시백
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 mt-5">
          <button
            type="button"
            onClick={() => onPay(merchant)}
            className="w-full h-14 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-[16px] transition-colors shadow-[0_6px_16px_-8px_rgba(139,0,41,0.5)]"
          >
            이 가게에서 결제하기
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 mt-1 rounded-lg text-content-secondary hover:bg-surface-sunken font-semibold text-[14px]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
