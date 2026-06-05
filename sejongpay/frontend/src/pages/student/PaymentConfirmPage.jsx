// src/pages/student/PaymentConfirmPage.jsx
// QR 결제 확인 화면 (화면 06)

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { transactionService } from '../../services/transaction.service';
import { couponService } from '../../services/coupon.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';

export default function PaymentConfirmPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [merchant, setMerchant] = useState(null);
  const [amount, setAmount] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const qrToken = state?.qrToken;

  useEffect(() => {
    if (!qrToken) {
      toast.error('QR 정보가 없습니다.');
      navigate('/scan');
      return;
    }
    // QR 사전 검증
    transactionService.verifyPayment({ qrToken })
      .then((res) => {
        setMerchant(res.data);
        return couponService.getMine({ isUsed: 'false' });
      })
      .then((res) => setCoupons(res?.data?.items ?? []))
      .catch((err) => {
        toast.error(err.response?.data?.error?.message || 'QR 검증 실패');
        navigate('/scan');
      })
      .finally(() => setLoading(false));
  }, [qrToken, navigate]);

  // 쿠폰 선택 시 할인 계산
  useEffect(() => {
    if (!selectedCoupon || !amount) { setDiscount(0); return; }
    const coupon = coupons.find((c) => c._id === selectedCoupon);
    if (!coupon) return;
    if (coupon.discountType === 'rate') {
      let d = Math.floor(parseInt(amount) * coupon.discountValue);
      if (coupon.maxDiscountAmount) d = Math.min(d, coupon.maxDiscountAmount);
      setDiscount(d);
    } else {
      setDiscount(coupon.discountValue);
    }
  }, [selectedCoupon, amount, coupons]);

  const finalAmount = Math.max(0, parseInt(amount || 0) - discount);
  const cashback = merchant ? Math.floor(parseInt(amount || 0) * merchant.cashbackRate) : 0;

  const handlePay = async () => {
    if (!amount || parseInt(amount) < 100) {
      toast.error('결제 금액을 입력하세요.');
      return;
    }
    if (user.walletBalance < finalAmount) {
      toast.error('잔액이 부족합니다. 충전 후 다시 시도하세요.');
      return;
    }
    setPaying(true);
    try {
      const res = await transactionService.payment({
        qrToken,
        amount: parseInt(amount),
        couponId: selectedCoupon || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      await refreshUser();
      navigate('/payment/complete', { state: { result: res.data } });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || '결제에 실패했습니다.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <PageLayout showNav={false}><Header title="결제 확인" showBack /><Loading /></PageLayout>;

  return (
    <PageLayout showNav={false}>
      <Header title="결제 확인" showBack />
      <div className="px-4 py-4 space-y-4">
        {/* 가맹점 정보 */}
        <Card className="text-center">
          <h2 className="text-xl font-bold">{merchant?.merchantName}</h2>
          <p className="text-sm text-gray-500 mt-1">{merchant?.category}</p>
        </Card>

        {/* 금액 입력 */}
        <div>
          <label className="text-sm font-medium text-gray-700">결제 금액</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="금액 입력"
            className="input-field mt-1 text-2xl font-bold text-center"
            autoFocus
          />
        </div>

        {/* 쿠폰 선택 */}
        {coupons.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700">쿠폰 적용</label>
            <select
              value={selectedCoupon}
              onChange={(e) => setSelectedCoupon(e.target.value)}
              className="input-field mt-1"
            >
              <option value="">쿠폰 미사용</option>
              {coupons.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title} ({c.discountType === 'rate' ? `${c.discountValue * 100}%` : `${c.discountValue.toLocaleString()}원`})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 결제 요약 */}
        {amount > 0 && (
          <Card className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">결제 금액</span>
              <span>{parseInt(amount).toLocaleString()}원</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>쿠폰 할인</span>
                <span>-{discount.toLocaleString()}원</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>최종 결제액</span>
              <span className="text-primary-600">{finalAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-sm text-blue-500">
              <span>예상 캐시백</span>
              <span>+{cashback.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>결제 후 잔액</span>
              <span>{(user.walletBalance - finalAmount + cashback).toLocaleString()}원</span>
            </div>
          </Card>
        )}

        <Button onClick={handlePay} disabled={paying || !amount || parseInt(amount) < 100}>
          {paying ? '결제 처리 중...' : `${finalAmount.toLocaleString()}원 결제하기`}
        </Button>
      </div>
    </PageLayout>
  );
}
