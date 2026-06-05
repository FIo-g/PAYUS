// src/pages/merchant/SettlementPage.jsx
// 가맹점주 정산 내역 화면 (화면 25)

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { merchantService } from '../../services/merchant.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';

export default function SettlementPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState(null);

  // 기간 필터
  const now = new Date();
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(now.toISOString().slice(0, 10));

  // 가맹점 ID 조회 (가맹점주 본인의 가맹점)
  useEffect(() => {
    merchantService.getMine()
      .then((res) => { if (res.data?._id) setMerchantId(res.data._id); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!merchantId) return;
    setLoading(true);
    merchantService.getSettlement(merchantId, { from: startDate, to: endDate })
      .then((res) => setData(res.data))
      .catch(() => toast.error('정산 데이터를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [merchantId, startDate, endDate]);

  const handleCsvDownload = () => {
    if (!data?.transactions?.length) return;
    const header = '거래번호,금액,수수료,쿠폰할인,일시\n';
    const rows = data.transactions.map((t) =>
      `${t.transactionNo},${t.amount},${t.feeAmount},${t.couponDiscount},${format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm')}`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `정산내역_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout>
      <Header title="정산 내역" showBack />
      <div className="px-4 py-4 space-y-4">
        {/* 기간 선택 */}
        <Card>
          <div className="flex gap-2 items-center">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field text-sm flex-1" />
            <span className="text-gray-400">~</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field text-sm flex-1" />
          </div>
        </Card>

        {loading ? <Loading /> : !data ? (
          <p className="text-center text-gray-400 py-12">데이터 없음</p>
        ) : (
          <>
            {/* 정산 요약 */}
            <Card className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">총 결제액</span>
                <span className="font-bold">{data.summary.totalPayments.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm text-red-500">
                <span>수수료 차감</span>
                <span>-{data.summary.totalFees.toLocaleString()}원</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>정산 확정액</span>
                <span className="text-primary-600">{data.summary.settlementAmount.toLocaleString()}원</span>
              </div>
              <p className="text-xs text-gray-400">{data.summary.count}건 거래</p>
            </Card>

            {/* 거래 목록 */}
            <Card>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold">거래 상세</h3>
                <button onClick={handleCsvDownload} className="flex items-center gap-1 text-xs text-primary-600">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
              </div>
              {data.transactions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">거래 내역이 없습니다.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {data.transactions.map((t) => (
                    <div key={t._id} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50">
                      <div>
                        <p className="font-medium">{t.amount.toLocaleString()}원</p>
                        <p className="text-xs text-gray-400">
                          수수료 -{t.feeAmount.toLocaleString()}원
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(new Date(t.createdAt), 'M/d HH:mm', { locale: ko })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </PageLayout>
  );
}
