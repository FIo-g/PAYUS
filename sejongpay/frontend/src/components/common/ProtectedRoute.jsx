// src/components/common/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loading } from './Loading';

/**
 * 인증 필수 라우트 래퍼
 * @param {string[]} roles - 허용 역할 (비어있으면 인증만 확인)
 */
export function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <Loading text="인증 확인 중..." />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
