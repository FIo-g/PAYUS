// src/components/common/Button.jsx
export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'w-full py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600',
  };
  return (
    <button className={`${base[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
