/**
 * Covasant Continuum — Notification Bell Component
 * Fetches real notifications from the API. No dummy data.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { fetchNotificationsReal, fetchUnreadCount, markNotifRead, markAllNotifsRead } from '../../utils/api';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  upload: '#059669',
  permission: '#2563EB',
  approval: '#7C3AED',
  system: '#D97706',
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
      setNotifications(notifs || []);
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

  // Reload when dropdown opens
  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotifRead(id);
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
    setUnread(u => Math.max(0, u - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotifsRead();
    setNotifications(n => n.map(x => ({ ...x, is_read: true })));
    setUnread(0);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <a
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
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
            position: 'absolute', top: -3, right: -3, width: 16, height: 16,
            borderRadius: '50%', background: '#EF4444', color: '#fff',
            fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--nav)',
          }}>{unread}</div>
        )}
      </a>

      {open && (
        <div style={{
          position: 'absolute', top: 40, right: 0, width: 300,
          background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 12,
          boxShadow: '0 12px 40px rgba(15,18,53,.14)', zIndex: 300, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>Notifications</div>
            {unread > 0 && (
              <a onClick={handleMarkAllRead} style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Mark all read</a>
            )}
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  style={{
                    padding: '10px 14px', borderBottom: '1px solid rgba(15,18,53,.04)',
                    cursor: n.is_read ? 'default' : 'pointer',
                    background: n.is_read ? 'transparent' : 'rgba(37,99,235,.03)',
                    transition: 'background .15s',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLORS[n.type] || 'var(--t3)', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: n.is_read ? 600 : 700, color: 'var(--t1)', lineHeight: 1.3 }}>{n.title}</div>
                      {n.body && <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 2 }}>{n.body}</div>}
                      <div style={{ fontSize: 9.5, color: 'var(--t3)', marginTop: 4, fontWeight: 600 }}>{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
