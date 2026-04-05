'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Search, Settings, CheckCheck, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import type { Notification, NotifType } from '@/lib/store';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

function notifIcon(type: NotifType) {
  const s = 13;
  if (type === 'success') return <CheckCircle   size={s} style={{ color: 'var(--zx-success)' }} />;
  if (type === 'warning') return <AlertTriangle size={s} style={{ color: 'var(--zx-warning)' }} />;
  if (type === 'danger')  return <XCircle       size={s} style={{ color: 'var(--zx-danger)'  }} />;
  return                         <Info          size={s} style={{ color: 'var(--zx-info)'    }} />;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'ahora';
  if (mins < 60)  return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [notifs, setNotifs]       = useState<Notification[]>([]);
  const [open, setOpen]           = useState(false);
  const dropRef                   = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  const fetchNotifs = useCallback(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then((data: Notification[]) => setNotifs(data))
      .catch(() => {});
  }, []);

  // Poll every 15 seconds
  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 15_000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
      style={{
        background:   'var(--zx-bg)',
        borderBottom: '1px solid var(--zx-border)',
        backdropFilter: 'blur(12px)',
      }}>

      {/* Left: page title */}
      <div>
        <h1 className="text-base font-semibold" style={{ color: 'var(--zx-text-1)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--zx-text-3)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Search bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
          style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)', color: 'var(--zx-text-3)' }}>
          <Search size={13} />
          <span className="text-[12px] hidden sm:block">Buscar...</span>
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] px-1 rounded"
            style={{ background: 'var(--zx-surface-2)', color: 'var(--zx-text-3)' }}>
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setOpen(v => !v)}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ background: open ? 'var(--zx-accent-muted)' : 'var(--zx-surface)', border: `1px solid ${open ? 'var(--zx-accent)' : 'var(--zx-border)'}` }}>
            <Bell size={14} style={{ color: open ? 'var(--zx-accent)' : 'var(--zx-text-2)' }} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold"
                style={{ background: 'var(--zx-accent)', color: '#09090B' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-10 w-80 rounded-xl shadow-xl z-50 overflow-hidden"
              style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--zx-border)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--zx-text-1)' }}>
                  Notificaciones {unread > 0 && <span style={{ color: 'var(--zx-accent)' }}>({unread})</span>}
                </p>
                {unread > 0 && (
                  <button onClick={markAllRead}
                    className="flex items-center gap-1 text-[10px] font-medium"
                    style={{ color: 'var(--zx-accent)' }}>
                    <CheckCheck size={11} /> Marcar todas leídas
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Bell size={20} style={{ color: 'var(--zx-text-3)' }} />
                    <p className="text-xs" style={{ color: 'var(--zx-text-3)' }}>Sin notificaciones</p>
                  </div>
                ) : (
                  notifs.map((n, i) => (
                    <button key={n.id}
                      onClick={() => markRead(n.id)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                      style={{
                        background: n.read ? 'transparent' : 'var(--zx-accent-muted)',
                        borderBottom: i < notifs.length - 1 ? '1px solid var(--zx-border)' : 'none',
                      }}>
                      <span className="mt-0.5 shrink-0">{notifIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--zx-text-1)' }}>
                          {n.title}
                        </p>
                        <p className="text-[10px] leading-relaxed mt-0.5 line-clamp-2" style={{ color: 'var(--zx-text-3)' }}>
                          {n.body}
                        </p>
                      </div>
                      <span className="text-[9px] shrink-0 mt-0.5" style={{ color: 'var(--zx-text-3)' }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <button className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
          <Settings size={14} style={{ color: 'var(--zx-text-2)' }} />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2 ml-1"
          style={{ borderLeft: '1px solid var(--zx-border)' }}>
          <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold"
            style={{ background: 'var(--zx-accent)', color: '#09090B' }}>
            VR
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium leading-none" style={{ color: 'var(--zx-text-1)' }}>
              Valentina Ríos
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
