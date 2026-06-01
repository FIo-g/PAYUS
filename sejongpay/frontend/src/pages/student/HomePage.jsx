// src/pages/student/HomePage.jsx
// 학생 홈 화면 — 지갑 잔액·퀵메뉴·최근 거래

import { useNavigate } from 'react-router-dom';
import { QrCode, Plus, Clock, Gift, MapPin, Ticket } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    { icon: QrCode, label: 'QR 결제', to: '/scan', color: 'bg-primary-100 text-primary-600' },
    { icon: Plus, label: '충전', to: '/charge', color: 'bg-green-100 text-green-600' },
    { icon: Clock, label: '거래내역', to: '/transactions', color: 'bg-orange-100 text-orange-600' },
    { icon: MapPin, label: '가맹점', to: '/map', color: 'bg-purple-100 text-purple-600' },
    { icon: Gift, label: '스탬프', to: '/stamps', color: 'bg-pink-100 text-pink-600' },
    { icon: Ticket, label: '쿠폰', to: '/coupons', color: 'bg-yellow-100 text-yellow-600' },
  ];

  return (
    <PageLayout>
      <Header title="세종페이" showBack={false} />

      <div className="px-4 py-4 space-y-5">
        {/* 지갑 카드 */}
        <Card className="bg-gradient-to-br from-primary-600 to-primary-800 text-white p-6">
          <p className="text-sm opacity-80">내 잔액</p>
          <p className="text-3xl font-bold mt-1">
            {(user?.walletBalance || 0).toLocaleString()}
            <span className="text-lg ml-1">원</span>
          </p>
          <div className="flex justify-between mt-4 text-sm opacity-70">
            <span>이번 달 캐시백: {(user?.cashbackThisMonth || 0).toLocaleString()}원</span>
          </div>
        </Card>

        {/* 퀵 액션 그리드 */}
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map(({ icon: Icon, label, to, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="card flex flex-col items-center gap-2 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>

        {/* 최근 거래 — TODO: API 연동 */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold">최근 거래</h2>
            <button onClick={() => navigate('/transactions')} className="text-sm text-primary-600">
              전체보기
            </button>
          </div>
          <Card>
            <p className="text-center text-gray-400 py-6 text-sm">거래 내역이 없습니다.</p>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
