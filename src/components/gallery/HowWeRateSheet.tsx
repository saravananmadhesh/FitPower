import * as Dialog from '@radix-ui/react-dialog';
import { Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Catalog } from '@/domain/catalog';
import { Button } from '@/components/ui/Button';

/** "How we rate" trigger + side sheet: the score scale and the catalog's sources. */
export function HowWeRateSheet({ catalog }: { catalog: Catalog }) {
  const { t } = useTranslation();
  const tiers = t('gallery.howWeRate.tiers', { returnObjects: true }) as string[];

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Info className="h-4 w-4" aria-hidden="true" />}
        >
          {t('gallery.howWeRate.link')}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(92vw,440px)] flex-col overflow-y-auto border-l border-border bg-surface p-6 shadow-overlay">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-h2 text-text">
              {t('gallery.howWeRate.title')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-2 text-text-muted hover:bg-card-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                aria-label={t('gallery.howWeRate.close')}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-3 text-body text-text-muted">
            {t('gallery.howWeRate.intro')}
          </Dialog.Description>

          <h3 className="mt-6 text-h3 text-text">{t('gallery.howWeRate.scaleTitle')}</h3>
          <ul className="tabular-nums mt-2 space-y-1 text-body text-text-muted">
            {tiers.map((tier) => (
              <li key={tier}>{tier}</li>
            ))}
          </ul>

          <h3 className="mt-6 text-h3 text-text">{t('gallery.howWeRate.sourcesTitle')}</h3>
          <ul className="mt-2 space-y-2 text-body">
            {Object.entries(catalog.sources).map(([key, source]) => (
              <li key={key}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text underline decoration-border-strong underline-offset-4 hover:decoration-accent"
                >
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-body-sm text-text-muted">
            {t('gallery.howWeRate.needsInternet')}
          </p>
          <p className="mt-6 text-caption text-text-muted">{catalog.license}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
