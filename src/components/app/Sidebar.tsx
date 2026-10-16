import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_ITEMS } from '@/config/navItems';
import { useUiStore } from '@/store/useUiStore';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/utils/cn';

export function Sidebar() {
  const { t } = useTranslation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-base lg:flex',
        collapsed ? 'w-sidebar-rail' : 'w-sidebar',
      )}
    >
      <div className="flex h-16 items-center px-4">
        <span className={cn('text-h3 font-semibold text-text', collapsed && 'sr-only')}>
          {t('app.title')}
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-2" aria-label={t('sidebar.nav')}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.to === '/'}
            title={collapsed ? t(item.labelKey) : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-body text-text-muted transition-colors duration-base hover:bg-card-2 hover:text-text',
                isActive && 'bg-accent-soft text-text shadow-[inset_2px_0_0_0_var(--color-accent)]',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className={cn(collapsed && 'sr-only')}>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center justify-between gap-2 border-t border-border p-3">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={t(collapsed ? 'sidebar.expand' : 'sidebar.collapse')}
          onClick={toggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </aside>
  );
}
