import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { format } from 'date-fns';
import { NAV_ITEMS } from '@/config/navItems';
import { useUiStore } from '@/store/useUiStore';
import { Button } from '@/components/ui/Button';
import { MobileNavDrawer } from './MobileNavDrawer';

export function Topbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const current = NAV_ITEMS.find(
    (item) =>
      item.to === location.pathname ||
      (item.to !== '/' && location.pathname.startsWith(`${item.to}/`)),
  );
  const title = current ? t(current.labelKey) : t('app.title');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:px-6">
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        className="lg:hidden"
        aria-label={t('topbar.toggleNav')}
        onClick={() => setDrawerOpen(true)}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>
      <h1 className="text-h2 text-text">{title}</h1>
      <div className="ml-auto flex items-center gap-3">
        <span className="tabular-nums hidden text-body-sm text-text-muted sm:inline">
          {format(new Date(), 'EEE, MMM d')}
        </span>
        <Button
          variant="secondary"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => setPaletteOpen(true)}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>{t('topbar.searchPlaceholder')}</span>
          <kbd className="ml-2 rounded border border-border-strong px-1.5 py-0.5 text-caption text-text-muted">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          className="sm:hidden"
          aria-label={t('topbar.openCommandPalette')}
          onClick={() => setPaletteOpen(true)}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <MobileNavDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </header>
  );
}
