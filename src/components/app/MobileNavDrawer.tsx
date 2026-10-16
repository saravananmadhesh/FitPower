import * as Dialog from '@radix-ui/react-dialog';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { NAV_ITEMS } from '@/config/navItems';
import { cn } from '@/utils/cn';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNavDrawer({ open, onOpenChange }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 lg:hidden" />
        <Dialog.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[min(80vw,300px)] flex-col bg-surface p-4 shadow-overlay lg:hidden"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-h3 text-text">{t('app.title')}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-2 text-text-muted hover:bg-card-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                aria-label={t('topbar.toggleNav')}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <nav className="mt-4 flex-1 space-y-1" aria-label={t('sidebar.nav')}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.to === '/'}
                onClick={() => onOpenChange(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-body text-text-muted hover:bg-card-2 hover:text-text',
                    isActive && 'bg-accent-soft text-text',
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
