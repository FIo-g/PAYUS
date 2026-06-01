// src/pages/student/PaymentCompletePage.jsx
// QR 결제 완료 화면 (화면 07)

import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

export default function PaymentCompletePage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state?.result;

  if (!result) {
    navigate('/home');
    return null;
  }

  return (
    <PageLayout showNav={false}>
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-8">
        {/* 성공 애니메이션 */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">결제 완료!</h1>
        <p className="text-gray-500 mb-6">{result.merchantName}</p>

        {/* 결제 정보 */}
        <Card className="w-full space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-500">결제 금액</span>
            <span className="font-bold text-xl">{result.amount?.toLocaleString()}원</span>
          </div>
          {result.couponDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>쿠폰 할인</span>
              <span>-{result.couponDiscount.toLocaleString()}원</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-blue-500">
            <span>캐시백 적립</span>
            <span>+{result.cashbackAmount?.toLocaleString()}원</span>
          </div>
          {result.stampEarned && (
            <div className="flex justify-between text-sm text-pink-500">
              <span>스탬프</span>
              <span>+1 적립!</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between text-sm">
            <span className="text-gray-500">잔여 잔액</span>
            <span className="font-semibold">{result.balanceAfter?.toLocaleString()}원</span>
          </div>
          <div className="text-xs text-gray-400 text-right">
            {result.transactionNo}
          </div>
        </Card>

        <div className="w-full space-y-3">
          <Button onClick={() => navigate('/home')}>홈으로</Button>
          <Button variant="secondary" onClick={() => navigate('/scan')}>
            연속 결제
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
