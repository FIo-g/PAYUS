// src/pages/merchant/MerchantHomePage.jsx
// 가맹점주 홈 화면 (화면 20)

import { BarChart3, QrCode, Gift, Stamp, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';

export default function MerchantHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: BarChart3, label: '매출 현황', to: '/merchant/sales', color: 'bg-blue-100 text-blue-600' },
    { icon: QrCode, label: 'QR 관리', to: '/merchant/qr', color: 'bg-green-100 text-green-600' },
    { icon: Gift, label: '쿠폰 관리', to: '/merchant/coupons', color: 'bg-orange-100 text-orange-600' },
    { icon: Stamp, label: '스탬프 설정', to: '/merchant/stamps', color: 'bg-pink-100 text-pink-600' },
    { icon: FileText, label: '정산 내역', to: '/merchant/settlement', color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <PageLayout>
      <Header title="가맹점 관리" showBack={false} />
      <div className="px-4 py-4 space-y-4">
        {/* 오늘의 매출 요약 — TODO: API 연동 */}
        <Card className="bg-gradient-to-br from-sejong-dark to-gray-800 text-white p-6">
          <p className="text-sm opacity-80">오늘의 매출</p>
          <p className="text-3xl font-bold mt-1">0<span className="text-lg ml-1">원</span></p>
          <p className="text-sm opacity-60 mt-2">거래 0건</p>
        </Card>

        {/* 관리 메뉴 */}
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map(({ icon: Icon, label, to, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="card flex items-center gap-3 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
