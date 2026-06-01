// src/pages/student/StampPage.jsx
import { useState, useEffect } from 'react';
import { stampService } from '../../services/stamp.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Loading } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/EmptyState';

export default function StampPage() {
  const [stamps, setStamps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stampService.getAll().then((res) => { setStamps(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <Header title="스탬프" />
      <div className="px-4 py-4 space-y-3">
        {loading ? <Loading /> : stamps.length === 0 ? (
          <EmptyState title="스탬프 카드가 없습니다" description="가맹점에서 결제하면 자동으로 적립돼요!" />
        ) : (
          stamps.map((s) => (
            <Card key={s._id}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">{s.merchantId?.name}</h3>
                <span className="text-sm text-primary-600">{s.currentCount}/{s.goal}</span>
              </div>
              {/* 스탬프 프로그레스 바 */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (s.currentCount / s.goal) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">리워드: {s.rewardDescription}</p>
            </Card>
          ))
        )}
      </div>
    </PageLayout>
  );
}
