// src/pages/merchant/MerchantCouponPage.jsx
// 가맹점 쿠폰 관리 화면 (화면 23) — TODO: 쿠폰 템플릿 생성 UI

import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';

export default function MerchantCouponPage() {
  return (
    <PageLayout>
      <Header title="쿠폰 관리" showBack />
      <div className="px-4 py-4 space-y-4">
        <Card>
          <p className="text-center text-gray-500 py-12">쿠폰 템플릿 관리 (구현 예정)</p>
        </Card>
      </div>
    </PageLayout>
  );
}
