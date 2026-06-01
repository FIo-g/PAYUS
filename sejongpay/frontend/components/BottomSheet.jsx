/**
 * <BottomSheet> — 세종페이 디자인 시스템
 *
 * Mobile-first modal anchored to bottom. Animates in via the keyframes
 * declared in tailwind.config.js (sheet-in + fade-in for the backdrop).
 *
 * Props:
 *   open:      boolean
 *   onClose:   () => void
 *   title:     string
 *   eyebrow:   string — small monospaced label above the title
 *   footer:    ReactNode — sticky CTA area
 *   container: HTMLElement | null — if set, sheet is absolute-positioned
 *              within this element (used for in-prototype phone frames).
 *              If unset, sheet covers the viewport (fixed).
 *   children:  body
 */
function SJBottomSheet({
  open,
  onClose,
  title,
  eyebrow,
  footer,
  container = null,
  children,
}) {
  React.useEffect(() => {
    if (!open || container) return;
    const h = (e) => e.key === 'Escape' && onClose && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose, container]);

  if (!open) return null;

  const positionClass = container ? 'absolute' : 'fixed';

  return (
    <div className={`${positionClass} inset-0 z-50 flex flex-col justify-end`}>
      <div
        className="absolute inset-0 bg-ink-900/40 animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative bg-surface-card rounded-t-4xl shadow-sheet pb-7 animate-sheet-in"
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block w-9 h-1 rounded-pill bg-border-strong" />
        </div>

        {(eyebrow || title) && (
          <div className="px-5 pt-3 pb-1">
            {eyebrow && (
              <div className="text-[11px] font-mono uppercase tracking-wider text-content-muted">
                {eyebrow}
              </div>
            )}
            {title && (
              <div className="text-[20px] font-bold text-content-primary mt-1">{title}</div>
            )}
          </div>
        )}

        <div className="px-5 mt-3">{children}</div>

        {footer && <div className="px-5 mt-5">{footer}</div>}
      </div>
    </div>
  );
}

window.SJBottomSheet = SJBottomSheet;
