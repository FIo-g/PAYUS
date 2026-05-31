/**
 * <CategoryFilter> — 가맹점 카테고리 가로 스크롤 칩 필터.
 *
 * 단일 선택 + "전체" 토글. 칩 자체에 카테고리 색상 도트로 마커 색과 매칭.
 */
import React from 'react';
import { CATEGORY_META, CATEGORY_ORDER, type MerchantCategory } from './types';

export type CategoryFilterProps = {
  value: MerchantCategory | null;
  onChange: (next: MerchantCategory | null) => void;
};

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div
      role="tablist"
      aria-label="가맹점 카테고리"
      className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5"
    >
      <Chip
        active={value === null}
        onClick={() => onChange(null)}
        color="#A91D3A"
        label="전체"
      />
      {CATEGORY_ORDER.map((cat) => {
        const meta = CATEGORY_META[cat];
        return (
          <Chip
            key={cat}
            active={value === cat}
            onClick={() => onChange(value === cat ? null : cat)}
            color={meta.color}
            label={meta.label}
            dot
          />
        );
      })}
    </div>
  );
}

function Chip({
  active,
  onClick,
  color,
  label,
  dot = false,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  label: string;
  dot?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold',
        'transition-colors duration-fast',
        active
          ? 'text-white shadow-[0_4px_12px_-4px_rgba(139,0,41,0.35)]'
          : 'bg-surface-card border border-border text-content-secondary hover:bg-surface-sunken',
      ].join(' ')}
      style={active ? { background: color } : undefined}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="w-2 h-2 rounded-full"
          style={{ background: active ? '#fff' : color }}
        />
      )}
      {label}
    </button>
  );
}
