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
    <div
      className="fixed bottom-0 left-0 w-60 p-3 z-50"
      style={{
        background:  'var(--zx-surface)',
        borderTop:   '1px solid var(--zx-border)',
        borderRight: '1px solid var(--zx-border)',
      }}
    >
      {/* Section label with accent line */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-px" style={{ background: 'var(--zx-accent)', opacity: 0.5 }} />
        <p
          className="text-[9px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--zx-text-3)' }}
        >
          Contexto Activo
        </p>
      </div>

      <div className="space-y-1.5">
        {/* Department */}
        <div className="relative">
          <button
            onClick={() => { setShowDept(p => !p); setShowLoc(false); }}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[10px] uppercase tracking-[0.06em] font-semibold"
            style={{
              background: showDept ? 'var(--zx-surface-3)' : 'var(--zx-surface-2)',
              border: `1px solid ${showDept ? 'var(--zx-accent)' : 'var(--zx-border)'}`,
              color: 'var(--zx-text-2)',
            }}
          >
            <Building2 size={11} style={{ color: 'var(--zx-accent)' }} />
            <span className="flex-1 text-left truncate">{dept}</span>
            <ChevronDown
              size={10}
              className={showDept ? 'rotate-180' : ''}
              style={{ transition: 'transform .2s', color: 'var(--zx-text-3)' }}
            />
          </button>
          {showDept && (
            <div
              className="absolute bottom-full left-0 w-full mb-1 overflow-hidden shadow-xl z-50"
              style={{ background: 'var(--zx-surface-3)', border: '1px solid var(--zx-accent)' }}
            >
              {departments.map(d => (
                <button
                  key={d}
                  onClick={() => { setDept(d); setShowDept(false); }}
                  className="flex w-full items-center px-3 py-1.5 text-[10px] uppercase tracking-[0.06em] text-left font-semibold"
                  style={{
                    color:      d === dept ? 'var(--zx-accent)'        : 'var(--zx-text-2)',
                    background: d === dept ? 'var(--zx-accent-muted)'  : 'transparent',
                    borderLeft: d === dept ? '2px solid var(--zx-accent)' : '2px solid transparent',
                  }}
                >
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
            className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[10px] uppercase tracking-[0.06em] font-semibold"
            style={{
              background: showLoc ? 'var(--zx-surface-3)' : 'var(--zx-surface-2)',
              border: `1px solid ${showLoc ? 'var(--zx-accent)' : 'var(--zx-border)'}`,
              color: 'var(--zx-text-2)',
            }}
          >
            <MapPin size={11} style={{ color: 'var(--zx-accent)' }} />
            <span className="flex-1 text-left truncate">{loc}</span>
            <ChevronDown
              size={10}
              className={showLoc ? 'rotate-180' : ''}
              style={{ transition: 'transform .2s', color: 'var(--zx-text-3)' }}
            />
          </button>
          {showLoc && (
            <div
              className="absolute bottom-full left-0 w-full mb-1 overflow-hidden shadow-xl z-50"
              style={{ background: 'var(--zx-surface-3)', border: '1px solid var(--zx-accent)' }}
            >
              {locations.map(l => (
                <button
                  key={l}
                  onClick={() => { setLoc(l); setShowLoc(false); }}
                  className="flex w-full items-center px-3 py-1.5 text-[10px] uppercase tracking-[0.06em] text-left font-semibold"
                  style={{
                    color:      l === loc ? 'var(--zx-accent)'        : 'var(--zx-text-2)',
                    background: l === loc ? 'var(--zx-accent-muted)'  : 'transparent',
                    borderLeft: l === loc ? '2px solid var(--zx-accent)' : '2px solid transparent',
                  }}
                >
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
