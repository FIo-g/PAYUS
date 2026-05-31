// src/pages/student/ReceiptPage.jsx
// 영수증 상세 화면 (화면 17)

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Share2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { transactionService } from '../../services/transaction.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Loading } from '../../components/common/Loading';

export default function ReceiptPage() {
  const { id } = useParams();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transactionService.getById(id)
      .then((res) => setTx(res.data))
      .catch(() => toast.error('영수증을 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopy = () => {
    if (!tx) return;
    const text = `[세종페이 영수증]\n거래번호: ${tx.transactionNo}\n가맹점: ${tx.merchantId?.name || '-'}\n금액: ${tx.amount?.toLocaleString()}원\n일시: ${format(new Date(tx.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}`;
    navigator.clipboard.writeText(text);
    toast.success('영수증이 복사되었습니다.');
  };

  if (loading) return <PageLayout showNav={false}><Header title="영수증" showBack /><Loading /></PageLayout>;
  if (!tx) return <PageLayout showNav={false}><Header title="영수증" showBack /><p className="text-center py-12 text-gray-500">거래를 찾을 수 없습니다.</p></PageLayout>;

  const rows = [
    { label: '거래번호', value: tx.transactionNo },
    { label: '거래유형', value: { payment: '결제', charge: '충전', cashback: '캐시백', refund: '환불' }[tx.type] || tx.type },
    { label: '상태', value: { completed: '완료', pending: '처리중', failed: '실패', refunded: '환불됨' }[tx.status] || tx.status },
    { label: '가맹점', value: tx.merchantId?.name || '-' },
    { label: '결제 금액', value: `${tx.amount?.toLocaleString()}원` },
  ];
  if (tx.couponDiscount > 0) rows.push({ label: '쿠폰 할인', value: `-${tx.couponDiscount.toLocaleString()}원` });
  if (tx.cashbackAmount > 0) rows.push({ label: '캐시백', value: `+${tx.cashbackAmount.toLocaleString()}원` });
  rows.push(
    { label: '거래 전 잔액', value: `${tx.balanceBefore?.toLocaleString()}원` },
    { label: '거래 후 잔액', value: `${tx.balanceAfter?.toLocaleString()}원` },
    { label: '거래 일시', value: format(new Date(tx.createdAt), 'yyyy년 M월 d일 HH:mm:ss', { locale: ko }) },
  );

  return (
    <PageLayout showNav={false}>
      <Header title="영수증" showBack showNotification={false} />
      <div className="px-4 py-4 space-y-4">
        <Card>
          <div className="text-center border-b border-dashed border-gray-200 pb-4 mb-4">
            <h2 className="text-lg font-bold">세종페이</h2>
            <p className="text-xs text-gray-400">SejongPay Digital Receipt</p>
          </div>
          <div className="space-y-3">
            {rows.map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-gray-200 mt-4 pt-4 flex justify-center gap-4">
            <button onClick={handleCopy} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <Copy className="w-4 h-4" /> 복사
            </button>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
