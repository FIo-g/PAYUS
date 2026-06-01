// src/pages/student/DashboardPage.jsx
// 소비 대시보드 화면 (화면 13)

import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { userService } from '../../services/user.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Loading } from '../../components/common/Loading';
import { CATEGORIES } from '../../constants';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    setLoading(true);
    userService.getDashboard({ year, month })
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <PageLayout>
      <Header title="소비 대시보드" showBack />
      <div className="px-4 py-4 space-y-4">
        {/* 월 선택 */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {months.map((m) => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                month === m ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {m}월
            </button>
          ))}
        </div>

        {loading ? <Loading /> : !data ? (
          <p className="text-center text-gray-400 py-12">데이터를 불러올 수 없습니다.</p>
        ) : (
          <>
            {/* 월 총계 */}
            <Card>
              <p className="text-sm text-gray-500">{year}년 {month}월 총 지출</p>
              <p className="text-3xl font-bold mt-1">
                {data.monthly.totalSpent.toLocaleString()}
                <span className="text-base ml-1">원</span>
              </p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-blue-500">캐시백 +{data.monthly.totalCashback.toLocaleString()}원</span>
                <span className="text-gray-400">{data.monthly.count}건</span>
              </div>
            </Card>

            {/* 카테고리별 파이차트 */}
            {data.byCategory.length > 0 && (
              <Card>
                <h3 className="font-bold mb-3">카테고리별 지출</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.byCategory.map((c) => ({
                        name: CATEGORIES.find((cat) => cat.key === c._id)?.label || c._id,
                        value: c.totalSpent,
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v.toLocaleString()}원`} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* TOP 가맹점 */}
            {data.topMerchants.length > 0 && (
              <Card>
                <h3 className="font-bold mb-3">자주 가는 곳 TOP3</h3>
                {data.topMerchants.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{m.merchantName}</p>
                        <p className="text-xs text-gray-400">{m.count}회 방문</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{m.totalSpent.toLocaleString()}원</span>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
