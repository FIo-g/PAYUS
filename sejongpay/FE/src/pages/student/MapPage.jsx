// src/pages/student/MapPage.jsx
// 가맹점 지도 화면 (화면 09) — TODO: Kakao Map API 연동

import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';

export default function MapPage() {
  return (
    <PageLayout>
      <Header title="가맹점 지도" />
      <div className="px-4 py-4">
        {/* TODO: Kakao Map 또는 Google Map 컴포넌트 */}
        <div className="w-full h-[60vh] bg-gray-200 rounded-2xl flex items-center justify-center">
          <p className="text-gray-500 text-sm">지도 API 연동 예정</p>
        </div>
      </div>
    </PageLayout>
  );
}
