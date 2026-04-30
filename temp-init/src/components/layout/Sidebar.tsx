'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, Brain, ClipboardList,
  MessageSquare, HelpCircle, DollarSign, Clock, TrendingUp,
  Zap, ChevronRight, UserCircle, Activity, Calendar, Briefcase, Shield
} from 'lucide-react';

interface NavItem { label: string; href: string; icon: React.ReactNode; badge?: number; }
interface NavGroup { label: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard',        href: '/dashboard',        icon: <LayoutDashboard size={15} /> },
      { label: 'Reportes',         href: '/reports',          icon: <Activity size={15} /> },
      { label: 'Empleados',        href: '/employees',        icon: <Users size={15} /> },
      { label: 'Portal Empleado',  href: '/employee-portal',  icon: <UserCircle size={15} /> },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { label: 'Nómina',      href: '/payroll',     icon: <DollarSign size={15} /> },
      { label: 'Vacaciones',  href: '/vacations',   icon: <Calendar size={15} /> },
      { label: 'Horarios',    href: '/schedule',    icon: <Clock size={15} /> },
      { label: 'Desempeño',   href: '/performance', icon: <TrendingUp size={15} /> },
    ],
  },
  {
    label: 'Talento',
    items: [
      { label: 'Reclutamiento IA', href: '/recruitment', icon: <Brain size={15} /> },
      { label: 'Ausencias IA',     href: '/absences',    icon: <ClipboardList size={15} />, badge: 2 },
      { label: 'Capacitaciones',   href: '/training',    icon: <Briefcase size={15} /> },
    ],
  },
  {
    label: 'Legal & Auditoría',
    items: [
      { label: 'Contratos',       href: '/contracts',      icon: <FileText size={15} /> },
      { label: 'Comunicaciones',  href: '/communications', icon: <MessageSquare size={15} /> },
      { label: 'PQR',             href: '/pqr',            icon: <HelpCircle size={15} />, badge: 3 },
      { label: 'Auditoría',       href: '/audit',          icon: <Shield size={15} /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 flex flex-col z-40 overflow-hidden"
      style={{
        background: 'var(--zx-sidebar)',
        borderRight: '1px solid var(--zx-border)',
      }}
    >
      {/* Atmospheric ring decorations */}
      <div className="p3-bg-rings" />

      {/* Logo — with faint radial cyan glow at top */}
      <div
        className="relative z-10 flex items-center gap-2.5 px-5 py-4"
        style={{
          borderBottom: '1px solid var(--zx-border)',
          background: `radial-gradient(ellipse at 50% 0%, var(--zx-logo-glow) 0%, transparent 70%)`,
        }}
      >
        <div
          className="flex items-center justify-center w-8 h-8"
          style={{
            background: 'var(--zx-accent)',
            boxShadow: '0 0 20px var(--zx-accent-muted)',
          }}
        >
          <Zap size={15} fill="currentColor" style={{ color: 'var(--zx-bg)' }} />
        </div>
        <div>
          <span
            className="text-sm font-bold tracking-[0.12em] uppercase"
            style={{ color: 'var(--zx-accent)' }}
          >
            Zentryx
          </span>
          <p
            className="text-[9px] leading-none mt-0.5 uppercase tracking-widest"
            style={{ color: 'var(--zx-text-3)' }}
          >
            HCM Platform
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {/* Group header with left accent line */}
            <div className="flex items-center gap-2 px-2 mb-2">
              <span
                className="w-2 h-px"
                style={{ background: 'var(--zx-accent)', opacity: 0.5 }}
              />
              <p
                className="text-[9px] font-bold uppercase tracking-[0.18em]"
                style={{ color: 'var(--zx-text-3)' }}
              >
                {group.label}
              </p>
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2.5 px-3 py-[7px] text-[11px] font-semibold uppercase tracking-[0.08em] group relative"
                      style={{
                        background: active ? 'var(--zx-secondary-muted)' : 'transparent',
                        color:      active ? 'var(--zx-secondary)'        : 'var(--zx-text-2)',
                        borderLeft: active ? '2px solid var(--zx-secondary)' : '2px solid transparent',
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = 'var(--zx-surface-2)';
                          (e.currentTarget as HTMLElement).style.color = 'var(--zx-text-1)';
                          (e.currentTarget as HTMLElement).style.borderLeft = '2px solid var(--zx-border-2)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                          (e.currentTarget as HTMLElement).style.color = 'var(--zx-text-2)';
                          (e.currentTarget as HTMLElement).style.borderLeft = '2px solid transparent';
                        }
                      }}
                    >
                      <span style={{ color: active ? 'var(--zx-secondary)' : 'var(--zx-text-3)' }}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? (
                        <span
                          className="flex items-center justify-center min-w-[18px] h-4 px-1 text-[9px] font-bold uppercase"
                          style={{
                            background: 'var(--zx-danger)',
                            color: 'var(--zx-text-on-dark)',
                          }}
                        >
                          {item.badge}
                        </span>
                      ) : active ? (
                        <ChevronRight size={11} style={{ color: 'var(--zx-secondary)', opacity: 0.7 }} />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom spacer for ActiveContext */}
      <div className="h-24" />
    </aside>
  );
}
