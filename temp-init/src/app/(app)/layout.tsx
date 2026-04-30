import Sidebar from '@/components/layout/Sidebar';
import ActiveContext from '@/components/layout/ActiveContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <ActiveContext />

      {/* Main content area */}
      <main
        className="flex-1 ml-60 flex flex-col min-h-screen"
        style={{ background: 'var(--zx-bg)', position: 'relative', overflow: 'hidden' }}
      >
        {/* Decorative atmosphere circles — pointer-events: none, behind all content */}
        <div
          className="p3-ring"
          style={{
            position:      'absolute',
            width:         '700px',
            height:        '700px',
            border:        '1.5px solid var(--zx-ring-outer)',
            top:           '-200px',
            right:         '-100px',
            pointerEvents: 'none',
            zIndex:        0,
          }}
        />
        <div
          className="p3-ring"
          style={{
            position:      'absolute',
            width:         '450px',
            height:        '450px',
            border:        '1.5px solid var(--zx-ring-inner)',
            bottom:        '-100px',
            left:          '200px',
            pointerEvents: 'none',
            zIndex:        0,
          }}
        />

        {/* Page content sits above the decorative layer */}
        <div className="relative flex flex-col flex-1" style={{ zIndex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
