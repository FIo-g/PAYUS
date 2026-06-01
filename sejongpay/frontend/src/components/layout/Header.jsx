// src/components/layout/Header.jsx
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Header({ title, showBack = false, showNotification = true }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack && (
            <button onClick={() => navigate(-1)} className="p-1 -ml-1">
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
          )}
          <h1 className="text-lg font-bold">{title}</h1>
        </div>
        {showNotification && isAuthenticated && (
          <button onClick={() => navigate('/notifications')} className="p-1">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>
    </header>
  );
}
