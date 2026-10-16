import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';

export function AppShell() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-[1280px] flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
        <footer className="mx-auto w-full max-w-[1280px] px-4 pb-6 text-caption text-text-muted lg:px-6">
          {t('shell.disclaimer')} {t('shell.localOnly')}
        </footer>
      </div>
      <CommandPalette />
    </div>
  );
}
