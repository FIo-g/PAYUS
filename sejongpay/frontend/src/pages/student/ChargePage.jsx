// src/pages/student/ChargePage.jsx
// 전자지갑 충전 화면 (화면 10)

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/user.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

const PRESET_AMOUNTS = [5000, 10000, 30000, 50000, 100000];

export default function ChargePage() {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleCharge = async () => {
    if (amount < 1000) {
      toast.error('최소 충전 금액은 1,000원입니다.');
      return;
    }
    setLoading(true);
    try {
      await userService.chargeWallet(amount);
      await refreshUser();
      toast.success(`${amount.toLocaleString()}원 충전 완료!`);
      setAmount(0);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || '충전에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout showNav={false}>
      <Header title="충전" showBack />
      <div className="px-4 py-4 space-y-6">
        <Card className="text-center">
          <p className="text-sm text-gray-500">현재 잔액</p>
          <p className="text-2xl font-bold mt-1">
            {(user?.walletBalance || 0).toLocaleString()}원
          </p>
        </Card>

        {/* 금액 프리셋 */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">충전 금액 선택</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                  amount === a
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {a.toLocaleString()}원
              </button>
            ))}
          </div>
        </div>

        {/* 직접 입력 */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">직접 입력</p>
          <input
            type="number"
            value={amount || ''}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
            placeholder="충전할 금액 입력"
            className="input-field"
          />
        </div>

        {amount > 0 && (
          <Card className="bg-primary-50">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">충전 금액</span>
              <span className="font-bold text-primary-700">{amount.toLocaleString()}원</span>
            </div>
          </Card>
        )}

        <Button onClick={handleCharge} disabled={loading || amount < 1000}>
          {loading ? '충전 중...' : `${amount > 0 ? amount.toLocaleString() + '원 ' : ''}충전하기`}
        </Button>
      </div>
    </PageLayout>
  );
}
