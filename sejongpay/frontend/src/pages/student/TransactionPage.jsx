// src/pages/student/TransactionPage.jsx
// 거래 내역 화면 (화면 08)

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { transactionService } from '../../services/transaction.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Loading } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/EmptyState';

export default function TransactionPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | payment | charge

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params = {};
        if (filter !== 'all') params.type = filter;
        const res = await transactionService.getAll(params);
        setTransactions(res.data.transactions);
      } catch {
        // 에러 처리
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [filter]);

  const filters = [
    { key: 'all', label: '전체' },
    { key: 'payment', label: '결제' },
    { key: 'charge', label: '충전' },
    { key: 'cashback', label: '캐시백' },
  ];

  return (
    <PageLayout>
      <Header title="거래 내역" showBack />

      {/* 필터 칩 */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              filter === key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-2">
        {loading ? (
          <Loading />
        ) : transactions.length === 0 ? (
          <EmptyState title="거래 내역이 없습니다" description="결제나 충전 후 여기에서 확인할 수 있어요." />
        ) : (
          transactions.map((tx) => (
            <Card key={tx._id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {tx.type === 'payment' ? (
                  <ArrowUpCircle className="w-8 h-8 text-red-400" />
                ) : (
                  <ArrowDownCircle className="w-8 h-8 text-green-400" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {tx.merchantId?.name || (tx.type === 'charge' ? '지갑 충전' : tx.type)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(tx.createdAt), 'M월 d일 HH:mm', { locale: ko })}
                  </p>
                </div>
              </div>
              <p className={`font-semibold ${tx.type === 'payment' ? 'text-red-500' : 'text-green-500'}`}>
                {tx.type === 'payment' ? '-' : '+'}
                {tx.amount.toLocaleString()}원
              </p>
            </Card>
          ))
        )}
      </div>
    </PageLayout>
  );
}
