import { useApp } from '../../context/AppContext';
import { Modal } from '../shared/Modal';

export function NotificationsModal() {
  const { showNotificationsModal, setShowNotificationsModal, notifications, markNotificationRead, markAllNotificationsRead } = useApp();

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'lead':
        return { icon: 'fa-user-plus', color: '#6366f1' };
      case 'deal':
        return { icon: 'fa-handshake', color: '#10b981' };
      case 'activity':
        return { icon: 'fa-clock-rotate-left', color: '#f59e0b' };
      default:
        return { icon: 'fa-bell', color: '#3b82f6' };
    }
  };

  return (
    <Modal isOpen={showNotificationsModal} onClose={() => setShowNotificationsModal(false)} title="Notifications" size="md">
      <div className="space-y-4">
        {/* Header with Mark All Read */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="text-sm text-accent hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {notifications.map((notification) => {
            const { icon, color } = getNotificationIcon(notification.type);
            return (
              <button
                key={notification.id}
                onClick={() => markNotificationRead(notification.id)}
                className={`w-full p-4 rounded-xl border transition-colors text-left flex items-start gap-3 ${
                  notification.read
                    ? 'border-border dark:border-border bg-transparent'
                    : 'border-accent/20 bg-accent/5'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <i className={`fa-solid ${icon}`} style={{ color }}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-text-primary dark:text-white truncate">{notification.title}</p>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0"></span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary dark:text-text-muted line-clamp-2">{notification.message}</p>
                  <p className="text-xs text-text-muted mt-1">{notification.time}</p>
                </div>
              </button>
            );
          })}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-8">
            <i className="fa-solid fa-bell-slash text-4xl text-text-muted mb-3"></i>
            <p className="text-text-secondary dark:text-text-muted">No notifications</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
