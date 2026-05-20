/**
 * Covasant Continuum — Notification Bell Component
 * Real notifications from API. Clicking a notification navigates to the product.
 * Badge disappears when dropdown is opened (marks all as read).
 * Holds up to 15 notifications in a scrollable dropdown.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { fetchNotificationsReal, fetchUnreadCount, markNotifRead, markAllNotifsRead } from '../../utils/api';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  upload: '#059669',
  product: '#7C3AED',
  permission: '#2563EB',
  approval: '#D97706',
  system: '#6B7280',
};

const TYPE_ICONS: Record<string, string> = {
  upload: '📄',
  product: '📦',
  permission: '🔑',
  approval: '✅',
  system: '⚙️',
};

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString();
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const [notifs, countData] = await Promise.all([
        fetchNotificationsReal(),
        fetchUnreadCount(),
      ]);
      // Limit to 15 notifications max
      setNotifications((notifs || []).slice(0, 15));
      setUnread(countData?.unread || 0);
    } catch {
      setNotifications([]);
      setUnread(0);
    }
  }, []);

  // Load on mount and poll every 30s
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // When bell is clicked and dropdown opens, mark all as read
  const handleBellClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const willOpen = !open;
    setOpen(willOpen);

    if (willOpen && unread > 0) {
      // Mark all as read immediately in UI, then persist to backend
      setUnread(0);
      setNotifications(n => n.map(x => ({ ...x, is_read: true })));
      await markAllNotifsRead();
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleNotificationClick = async (n: Notification) => {
    // Mark individual as read
    if (!n.is_read) {
      await markNotifRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }

    // Navigate to the product if link (product_id) exists
    if (n.link) {
      setOpen(false);
      useAppStore.getState().setProd(n.link);
      useAppStore.getState().setView('product' as any);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <a
        onClick={handleBellClick}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
          borderRadius: 7, background: 'var(--c2)', border: '1.5px solid var(--bd)',
          cursor: 'pointer', position: 'relative', userSelect: 'none',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        {unread > 0 && (
          <div style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: '50%', background: '#EF4444', color: '#fff',
            fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--nav)',
            animation: 'pulse 2s infinite',
          }}>{unread > 9 ? '9+' : unread}</div>
        )}
      </a>

      {open && (
        <div style={{
          position: 'absolute', top: 40, right: 0, width: 340,
          background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 14,
          boxShadow: '0 16px 48px rgba(15,18,53,.18)', zIndex: 300, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--bd)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(37,99,235,.04), rgba(124,58,237,.04))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>Notifications</span>
              {notifications.length > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--t3)',
                  background: 'var(--c2)', padding: '1px 6px', borderRadius: 10,
                }}>{notifications.length}</span>
              )}
            </div>
          </div>

          {/* Notification List — scrollable, max 15 */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>No notifications yet</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                  You'll be notified when products are created or files are uploaded.
                </div>
              </div>
            ) : (
              notifications.map((n, i) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: i < notifications.length - 1 ? '1px solid rgba(15,18,53,.05)' : 'none',
                    cursor: n.link ? 'pointer' : 'default',
                    background: n.is_read ? 'transparent' : 'rgba(37,99,235,.03)',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => { if (n.link) e.currentTarget.style.background = 'rgba(37,99,235,.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(37,99,235,.03)'; }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Icon */}
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: `${TYPE_COLORS[n.type] || '#6B7280'}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14,
                    }}>
                      {TYPE_ICONS[n.type] || '📌'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: n.is_read ? 600 : 700,
                        color: 'var(--t1)', lineHeight: 1.35,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                        {!n.is_read && (
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: '#2563EB', flexShrink: 0,
                          }} />
                        )}
                      </div>
                      {n.body && (
                        <div style={{
                          fontSize: 11, color: 'var(--t3)', marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{n.body}</div>
                      )}
                      <div style={{
                        fontSize: 10, color: 'var(--t3)', marginTop: 4, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                          color: TYPE_COLORS[n.type] || 'var(--t3)',
                        }}>{n.type}</span>
                        <span>·</span>
                        <span>{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                    {/* Navigate arrow if has link */}
                    {n.link && (
                      <div style={{ flexShrink: 0, color: 'var(--t3)', display: 'flex', alignItems: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Pulse animation for badge */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
