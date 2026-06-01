/**
 * <MerchantCard> — 세종페이 디자인 시스템
 *
 * The card on the merchant list — thumbnail, name, meta, cashback badge, rating.
 */
function SJMerchantCard({
  name,
  category,
  distance,
  cashback = 0,
  rating,
  reviewCount,
  thumbnail = 'primary',
  onClick,
  compact = false,
  className = '',
}) {
  const cashTone =
    cashback >= 10 ? 'cashback-bold' : cashback >= 5 ? 'cashback-strong' : 'cashback';

  const stripeMap = {
    primary: 'sj-stripes',
    beige:   'sj-stripes-beige',
    green:   'sj-stripes-green',
  };
  const thumbContent =
    typeof thumbnail === 'string' ? (
      <div className={[
        'w-full h-full grid place-items-center',
        stripeMap[thumbnail] || stripeMap.primary,
      ].join(' ')}>
        <span className="font-mono text-[10px] text-content-secondary opacity-70">PHOTO</span>
      </div>
    ) : (
      thumbnail
    );

  const thumbSize = compact ? 'w-14 h-14' : 'w-[72px] h-[72px]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left flex gap-3 p-3 rounded-3xl',
        'bg-surface-card border border-border shadow-card',
        'transition-all duration-fast ease-out-soft',
        'hover:-translate-y-px hover:shadow-pop hover:border-border-strong',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/30',
        className,
      ].join(' ')}
    >
      <div className={`${thumbSize} rounded-2xl overflow-hidden shrink-0`}>
        {thumbContent}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-[15px] text-content-primary truncate">{name}</div>
          {cashback > 0 && (
            <SJBadge tone={cashTone} size="sm" className="shrink-0">+{cashback}%</SJBadge>
          )}
        </div>
        <div className="text-[12px] text-content-muted mt-0.5 truncate">
          {[category, distance].filter(Boolean).join(' · ')}
        </div>
        {(rating || reviewCount) && (
          <div className="flex items-center gap-1.5 mt-1.5 text-[12px]">
            <span className="text-warning">★</span>
            <span className="font-semibold text-content-primary">{rating?.toFixed(1)}</span>
            {reviewCount != null && (
              <span className="text-content-muted">({reviewCount})</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

window.SJMerchantCard = SJMerchantCard;
