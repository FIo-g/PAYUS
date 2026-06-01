/**
 * <Badge> — 세종페이 디자인 시스템
 *
 * Props: tone, size, icon, className, children
 *   tone: 'cashback' | 'cashback-strong' | 'cashback-bold' |
 *         'success' | 'warning' | 'error' | 'info' |
 *         'beige' | 'neutral' | 'brand'
 *   size: 'sm' | 'md'   (default 'sm')
 */
function SJBadge({ tone = 'neutral', size = 'sm', icon = null, children, className = '' }) {
  const sizes = {
    sm: 'text-[11px] px-2.5 py-1 gap-1',
    md: 'text-[12px] px-3 py-1.5 gap-1.5',
  };

  const tones = {
    cashback:          'bg-cash-50 text-cash-700',
    'cashback-strong': 'bg-cash-500 text-white',
    'cashback-bold':   'bg-cash-700 text-white',
    success:           'bg-success-bg text-success-fg',
    warning:           'bg-warning-bg text-warning-fg',
    error:             'bg-error-bg text-error-fg',
    info:              'bg-info-bg text-info-fg',
    beige:             'bg-beige-100 text-beige-700',
    neutral:           'bg-ink-100 text-ink-700',
    brand:             'bg-primary-50 text-primary-600',
  };

  return (
    <span
      className={[
        'inline-flex items-center rounded-pill font-bold',
        sizes[size],
        tones[tone] || tones.neutral,
        className,
      ].join(' ')}
    >
      {icon}
      {children}
    </span>
  );
}

window.SJBadge = SJBadge;
