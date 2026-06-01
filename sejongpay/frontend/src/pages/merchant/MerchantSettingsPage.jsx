// src/pages/merchant/MerchantSettingsPage.jsx
// 가맹점 설정 화면 — 가맹점 정보 수정, 스탬프 설정 등

import { useNavigate } from 'react-router-dom';
import { Store, Stamp, LogOut, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';

export default function MerchantSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('로그아웃 완료');
    navigate('/login');
  };

  const menuItems = [
    { icon: Store, label: '가맹점 정보 수정', to: '/merchant/settings/info' },
    { icon: Stamp, label: '스탬프 설정', to: '/merchant/settings/stamp' },
  ];

  return (
    <PageLayout>
      <Header title="설정" showNotification={false} />
      <div className="px-4 py-4 space-y-4">
        <Card className="flex items-center gap-4">
          <div className="w-14 h-14 bg-sejong-red/10 rounded-full flex items-center justify-center">
            <Store className="w-7 h-7 text-sejong-red" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </Card>

        <Card className="divide-y divide-gray-100 !p-0">
          {menuItems.map(({ icon: Icon, label, to }) => (
            <button
              key={to}
              onClick={() => toast('설정 페이지 (구현 예정)')}
              className="flex items-center justify-between w-full px-4 py-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gray-500" />
                <span className="text-sm">{label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </Card>

        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-red-500 w-full">
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">로그아웃</span>
        </button>
      </div>
    </PageLayout>
  );
}
