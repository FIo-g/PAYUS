// src/pages/student/CouponPage.jsx
import { useState, useEffect } from 'react';
import { Ticket } from 'lucide-react';
import { couponService } from '../../services/coupon.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Loading } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/EmptyState';

export default function CouponPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    couponService.getMine({ isUsed: 'false' }).then((res) => { setCoupons(res.data.coupons); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <Header title="내 쿠폰" />
      <div className="px-4 py-4 space-y-3">
        {loading ? <Loading /> : coupons.length === 0 ? (
          <EmptyState icon={<Ticket className="w-12 h-12" />} title="보유 쿠폰이 없습니다" description="가맹점 페이지에서 쿠폰을 받아보세요!" />
        ) : (
          coupons.map((c) => (
            <Card key={c._id} className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-primary-600 font-bold text-lg">
                  {c.discountType === 'rate' ? `${c.discountValue * 100}%` : `${c.discountValue.toLocaleString()}원`}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{c.title}</h3>
                <p className="text-xs text-gray-500">{c.merchantId?.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(c.expiresAt).toLocaleDateString('ko-KR')}까지
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </PageLayout>
  );
}
