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
      { label: 'Dashboard',        href: '/dashboard',        icon: <LayoutDashboard size={16} /> },
      { label: 'Reportes',         href: '/reports',          icon: <Activity size={16} /> },
      { label: 'Empleados',        href: '/employees',        icon: <Users size={16} /> },
      { label: 'Portal Empleado',  href: '/employee-portal',  icon: <UserCircle size={16} /> },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { label: 'Nómina',      href: '/payroll',     icon: <DollarSign size={16} /> },
      { label: 'Vacaciones',  href: '/vacations',   icon: <Calendar size={16} /> },
      { label: 'Horarios',    href: '/schedule',    icon: <Clock size={16} /> },
      { label: 'Desempeño',   href: '/performance', icon: <TrendingUp size={16} /> },
    ],
  },
  {
    label: 'Talento',
    items: [
      { label: 'Reclutamiento IA', href: '/recruitment', icon: <Brain size={16} /> },
      { label: 'Ausencias IA',     href: '/absences',    icon: <ClipboardList size={16} />, badge: 2 },
      { label: 'Capacitaciones',   href: '/training',    icon: <Briefcase size={16} /> },
    ],
  },
  {
    label: 'Legal & Auditoría',
    items: [
      { label: 'Contratos',       href: '/contracts',      icon: <FileText size={16} /> },
      { label: 'Comunicaciones',  href: '/communications', icon: <MessageSquare size={16} /> },
      { label: 'PQR',             href: '/pqr',            icon: <HelpCircle size={16} />, badge: 3 },
      { label: 'Auditoría',       href: '/audit',          icon: <Shield size={16} /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-40"
      style={{ background: 'var(--zx-surface)', borderRight: '1px solid var(--zx-border)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5"
        style={{ borderBottom: '1px solid var(--zx-border)' }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: 'var(--zx-accent)', boxShadow: '0 0 16px var(--zx-accent-muted)' }}>
          <Zap size={16} fill="currentColor" style={{ color: '#09090B' }} />
        </div>
        <div>
          <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--zx-text-1)' }}>
            Zentryx
          </span>
          <p className="text-[10px] leading-none mt-0.5" style={{ color: 'var(--zx-text-3)' }}>
            HCM Platform
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--zx-text-3)' }}>
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link href={item.href}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-all duration-150 group relative"
                      style={{
                        background:  active ? 'var(--zx-accent-muted)' : 'transparent',
                        color:       active ? 'var(--zx-accent)'        : 'var(--zx-text-2)',
                      }}
                      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--zx-surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--zx-text-1)'; } }}
                      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--zx-text-2)'; } }}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                          style={{ background: 'var(--zx-accent)' }} />
                      )}
                      <span style={{ color: active ? 'var(--zx-accent)' : 'var(--zx-text-3)' }}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? (
                        <span className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                          style={{ background: 'var(--zx-accent)', color: '#09090B' }}>
                          {item.badge}
                        </span>
                      ) : active ? (
                        <ChevronRight size={12} style={{ color: 'var(--zx-accent)', opacity: 0.6 }} />
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
