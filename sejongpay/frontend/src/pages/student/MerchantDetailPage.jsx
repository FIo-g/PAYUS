// src/pages/student/MerchantDetailPage.jsx
// 가맹점 상세 화면 (화면 11)

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, MapPin, Phone, QrCode, Ticket, ChevronRight } from 'lucide-react';
import { merchantService } from '../../services/merchant.service';
import { couponService } from '../../services/coupon.service';
import { stampService } from '../../services/stamp.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { CATEGORIES } from '../../constants';

export default function MerchantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stamp, setStamp] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      merchantService.getById(id),
      merchantService.getReviews(id, { limit: 3 }),
      stampService.getByMerchant(id).catch(() => ({ data: null })),
      couponService.getAvailable(id).catch(() => ({ data: [] })),
    ])
      .then(([m, r, s, c]) => {
        setMerchant(m.data);
        setReviews(r.data?.reviews || []);
        setStamp(s.data);
        setAvailableCoupons(c.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLayout showNav={false}><Header title="" showBack /><Loading /></PageLayout>;
  if (!merchant) return <PageLayout showNav={false}><Header title="" showBack /><p className="text-center py-12 text-gray-500">가맹점을 찾을 수 없습니다.</p></PageLayout>;

  const cat = CATEGORIES.find((c) => c.key === merchant.category);

  return (
    <PageLayout showNav={false}>
      <Header title={merchant.name} showBack />
      <div className="px-4 py-4 space-y-4">
        {/* 기본 정보 */}
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{cat?.emoji}</span>
            <h2 className="text-lg font-bold">{merchant.name}</h2>
          </div>
          <div className="flex items-center gap-1 text-sm text-yellow-500 mb-2">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-semibold">{merchant.rating}</span>
            <span className="text-gray-400">({merchant.reviewCount}개 리뷰)</span>
          </div>
          {merchant.description && (
            <p className="text-sm text-gray-600 mb-3">{merchant.description}</p>
          )}
          <div className="space-y-1.5 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{merchant.address}</span>
            </div>
            {merchant.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{merchant.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 shrink-0" />
              <span>캐시백 {(merchant.cashbackRate * 100).toFixed(0)}%</span>
            </div>
          </div>
        </Card>

        {/* 메뉴 */}
        {merchant.menu?.length > 0 && (
          <Card>
            <h3 className="font-bold mb-3">메뉴</h3>
            <div className="space-y-2">
              {merchant.menu.filter((m) => m.isAvailable).map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="font-medium">{item.price.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 스탬프 현황 */}
        {stamp && (
          <Card>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">스탬프</h3>
              <span className="text-sm text-primary-600 font-semibold">{stamp.currentCount}/{stamp.goal}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-primary-600 h-2.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, (stamp.currentCount / stamp.goal) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">리워드: {stamp.rewardDescription}</p>
          </Card>
        )}

        {/* 수령 가능 쿠폰 */}
        {availableCoupons.length > 0 && (
          <Card>
            <h3 className="font-bold mb-3">쿠폰 받기</h3>
            {availableCoupons.map((c) => (
              <div key={c._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(c.expiresAt).toLocaleDateString('ko-KR')}까지
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await couponService.claim(c._id);
                      setAvailableCoupons((prev) => prev.filter((x) => x._id !== c._id));
                      const toast = (await import('react-hot-toast')).default;
                      toast.success('쿠폰을 받았습니다!');
                    } catch (err) {
                      const toast = (await import('react-hot-toast')).default;
                      toast.error(err.response?.data?.error?.message || '쿠폰 수령 실패');
                    }
                  }}
                  className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg"
                >
                  받기
                </button>
              </div>
            ))}
          </Card>
        )}

        {/* 리뷰 */}
        <Card>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">리뷰</h3>
            <button
              onClick={() => navigate(`/merchants/${id}/reviews`)}
              className="text-xs text-primary-600 flex items-center gap-0.5"
            >
              전체보기 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">아직 리뷰가 없습니다.</p>
          ) : (
            reviews.map((r) => (
              <div key={r._id} className="py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs font-medium">{r.userId?.name}</span>
                  <div className="flex text-yellow-400">
                    {Array.from({ length: r.rating }, (_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                {r.content && <p className="text-sm text-gray-600">{r.content}</p>}
              </div>
            ))
          )}
        </Card>

        {/* QR 결제 버튼 */}
        <Button onClick={() => navigate('/scan')}>
          <span className="flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5" /> QR 결제하기
          </span>
        </Button>
      </div>
    </PageLayout>
  );
}
