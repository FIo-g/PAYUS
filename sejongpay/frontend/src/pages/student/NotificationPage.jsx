// src/pages/student/NotificationPage.jsx
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { notificationService } from '../../services/notification.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Loading } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/EmptyState';

export default function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationService.getAll().then((res) => { setNotifications(res?.data?.items ?? []); setLoading(false); }).catch(() => { setNotifications([]); setLoading(false); });
  }, []);

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <PageLayout showNav={false}>
      <Header title="알림" showBack showNotification={false} />

      {notifications.some((n) => !n.isRead) && (
        <div className="px-4 py-2 flex justify-end">
          <button onClick={handleMarkAllRead} className="text-xs text-primary-600">모두 읽음</button>
        </div>
      )}

      <div className="px-4 space-y-2">
        {loading ? <Loading /> : notifications.length === 0 ? (
          <EmptyState icon={<Bell className="w-12 h-12" />} title="알림이 없습니다" />
        ) : (
          notifications.map((n) => (
            <Card key={n._id} className={`${n.isRead ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.isRead ? 'bg-gray-300' : 'bg-primary-600'}`} />
                <div>
                  <p className="font-semibold text-sm">{n.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </PageLayout>
  );
}
