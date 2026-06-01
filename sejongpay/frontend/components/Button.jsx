/**
 * <Button> — 세종페이 디자인 시스템
 *
 * Props:
 *   variant: 'primary' | 'secondary' | 'ghost' | 'destructive'  (default 'primary')
 *   size:    'sm' | 'md' | 'lg'                                  (default 'md')
 *   block:   boolean — full-width
 *   loading: boolean — show spinner, disable interaction
 *   leadingIcon / trailingIcon: ReactNode
 *   onClick / type / aria-label etc — listed explicitly to avoid
 *     babel-standalone's shared-scope `_excluded` bug across <script> files.
 */
function SJButton({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  className = '',
  onClick,
  type = 'button',
  children,
  'aria-label': ariaLabel,
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-semibold select-none ' +
    'transition-all duration-fast ease-out-soft ' +
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/30 ' +
    'disabled:cursor-not-allowed';

  const sizes = {
    sm: 'h-9  px-3.5 text-[13px] rounded-md',
    md: 'h-11 px-4.5 text-[14px] rounded-lg',
    lg: 'h-14 px-5.5 text-[16px] rounded-xl',
  };

  const variants = {
    primary:
      'bg-primary-500 text-white shadow-[0_6px_16px_-8px_rgba(139,0,41,0.5)] ' +
      'hover:bg-primary-600 active:bg-primary-700 ' +
      'disabled:bg-primary-200 disabled:text-primary-50 disabled:shadow-none',
    secondary:
      'bg-beige-100 text-beige-700 ' +
      'hover:bg-beige-200 active:bg-beige-300 ' +
      'disabled:bg-ink-50 disabled:text-ink-300',
    ghost:
      'bg-transparent text-primary-500 ' +
      'hover:bg-primary-50 active:bg-primary-100 ' +
      'disabled:text-ink-300',
    destructive:
      'bg-error text-white hover:opacity-90 active:opacity-80 disabled:opacity-50',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      className={[base, sizes[size], variants[variant], block ? 'w-full' : '', className].join(' ')}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" aria-hidden="true" />
      ) : (
        leadingIcon
      )}
      <span>{children}</span>
      {!loading && trailingIcon}
    </button>
  );
}

window.SJButton = SJButton;
