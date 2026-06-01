// src/components/layout/BottomNav.jsx
import { NavLink } from 'react-router-dom';
import { Home, QrCode, MapPin, Gift, User, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const studentTabs = [
  { to: '/home', icon: Home, label: '홈' },
  { to: '/scan', icon: QrCode, label: 'QR결제' },
  { to: '/map', icon: MapPin, label: '지도' },
  { to: '/stamps', icon: Gift, label: '스탬프' },
  { to: '/profile', icon: User, label: '마이' },
];

const merchantTabs = [
  { to: '/merchant/home', icon: Home, label: '홈' },
  { to: '/merchant/sales', icon: BarChart3, label: '매출' },
  { to: '/merchant/qr', icon: QrCode, label: 'QR관리' },
  { to: '/merchant/coupons', icon: Gift, label: '쿠폰' },
  { to: '/merchant/settings', icon: Settings, label: '설정' },
];

export function BottomNav() {
  const { isMerchant } = useAuth();
  const tabs = isMerchant ? merchantTabs : studentTabs;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around py-2">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1 px-3 text-xs transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
