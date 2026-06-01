// src/pages/merchant/SalesPage.jsx
// 매출 현황 화면 (화면 21) — TODO: Recharts 차트 연동

import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';

export default function SalesPage() {
  return (
    <PageLayout>
      <Header title="매출 현황" showBack />
      <div className="px-4 py-4 space-y-4">
        <Card>
          <p className="text-center text-gray-500 py-12">매출 차트 (Recharts 연동 예정)</p>
        </Card>
      </div>
    </PageLayout>
  );
}
