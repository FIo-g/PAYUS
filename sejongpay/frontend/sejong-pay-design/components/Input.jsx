/**
 * <Input> — 세종페이 디자인 시스템
 *
 * Props: label, helpText, errorText, type, value, onChange, placeholder, name,
 *        leadingIcon, trailingSlot, id, autoComplete, maxLength, disabled.
 */
function SJInput({
  label,
  helpText,
  errorText,
  type = 'text',
  value,
  onChange,
  placeholder,
  name,
  leadingIcon = null,
  trailingSlot = null,
  className = '',
  id: idProp,
  autoComplete,
  maxLength,
  disabled = false,
}) {
  const reactId = React.useId();
  const id = idProp || reactId;
  const [revealed, setRevealed] = React.useState(false);

  const isPassword = type === 'password';
  const isSearch = type === 'search';
  const computedType = isPassword && revealed ? 'text' : type;
  const hasError = Boolean(errorText);

  const fieldBase =
    'w-full h-12 px-3.5 text-[15px] font-medium text-content-primary ' +
    'bg-surface-card border-[1.5px] rounded-lg ' +
    'transition-all duration-fast ease-out-soft ' +
    'placeholder:text-content-muted ' +
    'focus:outline-none ' +
    'disabled:bg-surface-sunken disabled:text-content-muted disabled:cursor-not-allowed';

  const fieldState = hasError
    ? 'border-error focus:border-error focus:shadow-focus-error'
    : 'border-border focus:border-primary-500 focus:shadow-focus';

  const padLeading = (leadingIcon || isSearch) ? 'pl-9' : '';
  const padTrailing = (isPassword || trailingSlot) ? 'pr-12' : '';

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-[12px] font-semibold text-content-secondary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {(leadingIcon || isSearch) && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none">
            {leadingIcon || '⌕'}
          </span>
        )}
        <input
          id={id}
          name={name}
          type={computedType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={(helpText || errorText) ? `${id}-desc` : undefined}
          className={[fieldBase, fieldState, padLeading, padTrailing].join(' ')}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-mono text-content-muted hover:text-content-primary"
            aria-label={revealed ? '비밀번호 숨기기' : '비밀번호 보기'}
          >
            {revealed ? '숨기기' : '보기'}
          </button>
        )}
        {!isPassword && trailingSlot && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailingSlot}</span>
        )}
      </div>
      {(helpText || errorText) && (
        <span
          id={`${id}-desc`}
          className={[
            'block mt-1.5 text-[12px]',
            hasError ? 'text-error' : 'text-content-muted',
          ].join(' ')}
        >
          {errorText || helpText}
        </span>
      )}
    </div>
  );
}

window.SJInput = SJInput;
