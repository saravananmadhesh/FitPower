import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Search, Star, type LucideIcon } from 'lucide-react';
import { NAV_ITEMS } from '@/config/navItems';
import { ALBUM_IDS } from '@/domain/constants';
import { FAVORITES_ALBUM_ID, ROUTES, galleryAlbumPath } from '@/routes';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/utils/cn';

interface PaletteItem {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
}

interface PaletteGroup {
  key: string;
  label: string;
  items: PaletteItem[];
}

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useUiStore.getState().paletteOpen);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  const groups = useMemo(() => {
    const all: PaletteGroup[] = [
      {
        key: 'navigate',
        label: t('commandPalette.groupNavigate'),
        items: NAV_ITEMS.map((item) => ({
          key: item.key,
          label: t(item.labelKey),
          to: item.to,
          icon: item.icon,
        })),
      },
      {
        key: 'gallery',
        label: t('commandPalette.groupGallery'),
        items: [
          {
            key: 'gallery-open',
            label: t('gallery.palette.open'),
            to: ROUTES.gallery,
            icon: LayoutGrid,
          },
          {
            key: 'gallery-favorites',
            label: t('gallery.palette.favorites'),
            to: galleryAlbumPath(FAVORITES_ALBUM_ID),
            icon: Star,
          },
          ...ALBUM_IDS.map((id) => ({
            key: `gallery-album-${id}`,
            label: t('gallery.palette.album', { name: t(`gallery.albums.${id}`) }),
            to: galleryAlbumPath(id),
            icon: LayoutGrid,
          })),
        ],
      },
    ];
    const needle = query.trim().toLowerCase();
    return all
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(needle)),
      }))
      .filter((group) => group.items.length > 0);
  }, [query, t]);

  function go(to: string) {
    navigate(to);
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content
          className="fixed left-1/2 top-24 z-50 w-[min(90vw,560px)] -translate-x-1/2 rounded-xl border border-border bg-card shadow-overlay"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">{t('commandPalette.title')}</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('commandPalette.placeholder')}
              className="w-full bg-transparent text-body text-text placeholder:text-text-subtle outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-80 overflow-y-auto p-2">
            {groups.length === 0 && (
              <li className="px-3 py-6 text-center text-body-sm text-text-muted">
                {t('commandPalette.noResults')}
              </li>
            )}
            {groups.flatMap((group) => [
              <li
                key={`group-${group.key}`}
                role="presentation"
                className="px-3 py-1 text-caption uppercase tracking-[.06em] text-text-subtle"
              >
                {group.label}
              </li>,
              ...group.items.map((item) => (
                <li key={item.key} role="option" aria-selected="false">
                  <button
                    type="button"
                    onClick={() => go(item.to)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-body text-text hover:bg-card-2 focus-visible:bg-card-2 focus-visible:outline-none',
                    )}
                  >
                    <item.icon className="h-4 w-4 text-text-muted" aria-hidden="true" />
                    {item.label}
                  </button>
                </li>
              )),
            ])}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
