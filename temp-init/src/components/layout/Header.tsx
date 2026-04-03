'use client';

import { Bell, Search, Settings } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
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
        <button className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
          <Bell size={14} style={{ color: 'var(--zx-text-2)' }} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--zx-accent)' }} />
        </button>

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
