// src/components/layout/PageLayout.jsx
import { BottomNav } from './BottomNav';

export function PageLayout({ children, showNav = true }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {children}
      {showNav && <BottomNav />}
    </div>
  );
}
