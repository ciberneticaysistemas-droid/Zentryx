import Sidebar from '@/components/layout/Sidebar';
import ActiveContext from '@/components/layout/ActiveContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <ActiveContext />
      <main className="flex-1 ml-60 flex flex-col min-h-screen" style={{ background: 'var(--zx-bg)' }}>
        {children}
      </main>
    </div>
  );
}
