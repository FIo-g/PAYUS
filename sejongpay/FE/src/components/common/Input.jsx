// src/components/common/Input.jsx
import { forwardRef } from 'react';

export const Input = forwardRef(({ label, error, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input ref={ref} className={`input-field ${error ? 'border-red-500 ring-red-500' : ''}`} {...props} />
    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
));
Input.displayName = 'Input';
