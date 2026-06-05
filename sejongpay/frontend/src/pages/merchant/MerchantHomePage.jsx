// src/pages/merchant/MerchantHomePage.jsx
// 가맹점주 홈 화면 (화면 20)

import { useState, useEffect } from 'react';
import { BarChart3, QrCode, Gift, Stamp, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { merchantService } from '../../services/merchant.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';

export default function MerchantHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 오늘의 매출 (실데이터 연동) — 매출 없는 날은 stats에 항목이 없으므로 0 fallback
  const [todaySales, setTodaySales] = useState(null);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState(false);

  // 마운트 시 본인 가맹점 조회 → 일별 매출에서 오늘 항목 추출
  useEffect(() => {
    let alive = true;
    setSalesLoading(true);
    setSalesError(false);
    merchantService.getMine()
      .then((res) => {
        const merchantId = res?.data?._id;
        if (!merchantId) throw new Error('merchant not found');
        return merchantService.getSales(merchantId, { period: 'day' });
      })
      .then((res) => {
        if (!alive) return;
        const stats = res?.data?.stats ?? [];
        const today = new Date().toISOString().slice(0, 10);
        const entry = stats.find((s) => s._id === today) ?? { totalSales: 0, count: 0 };
        setTodaySales(entry);
      })
      .catch(() => { if (alive) setSalesError(true); })
      .finally(() => { if (alive) setSalesLoading(false); });
    return () => { alive = false; };
  }, []);

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
        {/* 오늘의 매출 요약 */}
        <Card className="bg-gradient-to-br from-sejong-dark to-gray-800 text-white p-6">
          <p className="text-sm opacity-80">오늘의 매출</p>
          {salesLoading ? (
            <>
              <div className="mt-2 h-8 w-32 rounded-md bg-white/20 animate-pulse" />
              <div className="mt-3 h-4 w-20 rounded bg-white/10 animate-pulse" />
            </>
          ) : salesError ? (
            <>
              <p className="text-3xl font-bold mt-1">—<span className="text-lg ml-1">원</span></p>
              <p className="text-sm opacity-60 mt-2">불러오지 못했습니다</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold mt-1">
                {(todaySales?.totalSales ?? 0).toLocaleString()}<span className="text-lg ml-1">원</span>
              </p>
              <p className="text-sm opacity-60 mt-2">거래 {todaySales?.count ?? 0}건</p>
            </>
          )}
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
