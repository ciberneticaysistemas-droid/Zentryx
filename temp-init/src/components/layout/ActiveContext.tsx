'use client';

import { Building2, MapPin, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const departments = ['RRHH', 'Tecnología', 'Finanzas', 'Legal', 'Ventas', 'Toda la empresa'];
const locations   = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Nacional'];

export default function ActiveContext() {
  const [dept, setDept]         = useState('Toda la empresa');
  const [loc, setLoc]           = useState('Nacional');
  const [showDept, setShowDept] = useState(false);
  const [showLoc, setShowLoc]   = useState(false);

  return (
    <div className="fixed bottom-0 left-0 w-60 p-3 z-50"
      style={{ background: 'var(--zx-surface)', borderTop: '1px solid var(--zx-border)', borderRight: '1px solid var(--zx-border)' }}>
      <p className="text-[9px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: 'var(--zx-text-3)' }}>
        Contexto Activo
      </p>

      <div className="space-y-1.5">
        {/* Department */}
        <div className="relative">
          <button
            onClick={() => { setShowDept(p => !p); setShowLoc(false); }}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-[11px] transition-colors"
            style={{ background: 'var(--zx-surface-2)', color: 'var(--zx-text-2)' }}>
            <Building2 size={11} style={{ color: 'var(--zx-accent)' }} />
            <span className="flex-1 text-left truncate">{dept}</span>
            <ChevronDown size={10} className={showDept ? 'rotate-180' : ''} style={{ transition: 'transform .2s' }} />
          </button>
          {showDept && (
            <div className="absolute bottom-full left-0 w-full mb-1 rounded-lg overflow-hidden shadow-xl z-50"
              style={{ background: 'var(--zx-surface-3)', border: '1px solid var(--zx-border-2)' }}>
              {departments.map(d => (
                <button key={d} onClick={() => { setDept(d); setShowDept(false); }}
                  className="flex w-full items-center px-3 py-1.5 text-[11px] text-left transition-colors"
                  style={{ color: d === dept ? 'var(--zx-accent)' : 'var(--zx-text-2)',
                           background: d === dept ? 'var(--zx-accent-muted)' : 'transparent' }}>
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="relative">
          <button
            onClick={() => { setShowLoc(p => !p); setShowDept(false); }}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-[11px] transition-colors"
            style={{ background: 'var(--zx-surface-2)', color: 'var(--zx-text-2)' }}>
            <MapPin size={11} style={{ color: 'var(--zx-accent)' }} />
            <span className="flex-1 text-left truncate">{loc}</span>
            <ChevronDown size={10} className={showLoc ? 'rotate-180' : ''} style={{ transition: 'transform .2s' }} />
          </button>
          {showLoc && (
            <div className="absolute bottom-full left-0 w-full mb-1 rounded-lg overflow-hidden shadow-xl z-50"
              style={{ background: 'var(--zx-surface-3)', border: '1px solid var(--zx-border-2)' }}>
              {locations.map(l => (
                <button key={l} onClick={() => { setLoc(l); setShowLoc(false); }}
                  className="flex w-full items-center px-3 py-1.5 text-[11px] text-left transition-colors"
                  style={{ color: l === loc ? 'var(--zx-accent)' : 'var(--zx-text-2)',
                           background: l === loc ? 'var(--zx-accent-muted)' : 'transparent' }}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
