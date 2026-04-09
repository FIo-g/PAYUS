// src/App.jsx
// 세종페이 메인 앱 — 라우팅 설정

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Student Pages
import HomePage from './pages/student/HomePage';
import QRScanPage from './pages/student/QRScanPage';
import TransactionPage from './pages/student/TransactionPage';
import StampPage from './pages/student/StampPage';
import CouponPage from './pages/student/CouponPage';
import MapPage from './pages/student/MapPage';
import ProfilePage from './pages/student/ProfilePage';
import NotificationPage from './pages/student/NotificationPage';
import ChargePage from './pages/student/ChargePage';
import PaymentConfirmPage from './pages/student/PaymentConfirmPage';
import PaymentCompletePage from './pages/student/PaymentCompletePage';
import MerchantDetailPage from './pages/student/MerchantDetailPage';
import ReviewWritePage from './pages/student/ReviewWritePage';
import DashboardPage from './pages/student/DashboardPage';
import ReceiptPage from './pages/student/ReceiptPage';

// Merchant Pages
import MerchantHomePage from './pages/merchant/MerchantHomePage';
import SalesPage from './pages/merchant/SalesPage';
import QRManagePage from './pages/merchant/QRManagePage';
import MerchantCouponPage from './pages/merchant/MerchantCouponPage';
import MerchantSettingsPage from './pages/merchant/MerchantSettingsPage';
import SettlementPage from './pages/merchant/SettlementPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* 인증 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* 학생 페이지 */}
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/scan" element={<ProtectedRoute roles={['student']}><QRScanPage /></ProtectedRoute>} />
            <Route path="/charge" element={<ProtectedRoute roles={['student']}><ChargePage /></ProtectedRoute>} />
            <Route path="/payment/confirm" element={<ProtectedRoute roles={['student']}><PaymentConfirmPage /></ProtectedRoute>} />
            <Route path="/payment/complete" element={<ProtectedRoute roles={['student']}><PaymentCompletePage /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><TransactionPage /></ProtectedRoute>} />
            <Route path="/transactions/:id" element={<ProtectedRoute><ReceiptPage /></ProtectedRoute>} />
            <Route path="/stamps" element={<ProtectedRoute roles={['student']}><StampPage /></ProtectedRoute>} />
            <Route path="/coupons" element={<ProtectedRoute roles={['student']}><CouponPage /></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
            <Route path="/merchants/:id" element={<ProtectedRoute><MerchantDetailPage /></ProtectedRoute>} />
            <Route path="/merchants/:merchantId/review" element={<ProtectedRoute roles={['student']}><ReviewWritePage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute roles={['student']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationPage /></ProtectedRoute>} />

            {/* 가맹점주 페이지 */}
            <Route path="/merchant/home" element={<ProtectedRoute roles={['merchant']}><MerchantHomePage /></ProtectedRoute>} />
            <Route path="/merchant/sales" element={<ProtectedRoute roles={['merchant']}><SalesPage /></ProtectedRoute>} />
            <Route path="/merchant/qr" element={<ProtectedRoute roles={['merchant']}><QRManagePage /></ProtectedRoute>} />
            <Route path="/merchant/coupons" element={<ProtectedRoute roles={['merchant']}><MerchantCouponPage /></ProtectedRoute>} />
            <Route path="/merchant/settlement" element={<ProtectedRoute roles={['merchant']}><SettlementPage /></ProtectedRoute>} />
            <Route path="/merchant/settings" element={<ProtectedRoute roles={['merchant']}><MerchantSettingsPage /></ProtectedRoute>} />

            {/* 기본 리다이렉트 */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>

          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: { background: '#1a1a2e', color: '#fff', borderRadius: '12px' },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
