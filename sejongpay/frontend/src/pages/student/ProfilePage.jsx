// src/pages/student/ProfilePage.jsx
import { useNavigate } from 'react-router-dom';
import { User, CreditCard, Settings, LogOut, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('로그아웃 완료');
    navigate('/login');
  };

  const menuItems = [
    { icon: CreditCard, label: '거래 내역', to: '/transactions' },
    { icon: Settings, label: '설정', to: '/settings' },
  ];

  return (
    <PageLayout>
      <Header title="마이페이지" showNotification={false} />
      <div className="px-4 py-4 space-y-4">
        {/* 프로필 카드 */}
        <Card className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-primary-600" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            {user?.studentId && <p className="text-xs text-gray-400">학번: {user.studentId}</p>}
          </div>
        </Card>

        {/* 메뉴 */}
        <Card className="divide-y divide-gray-100 !p-0">
          {menuItems.map(({ icon: Icon, label, to }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
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
