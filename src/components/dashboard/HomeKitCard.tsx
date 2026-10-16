import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { ROUTES } from '@/routes';

/** Promotes the app's equipment promise: a pair of dumbbells and a resistance band. */
export function HomeKitCard() {
  const { t } = useTranslation();
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-accent-soft p-2 text-accent">
          <Dumbbell className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-h3 text-text">{t('dashboard.homeKit.title')}</h3>
          <p className="mt-1 text-body-sm text-text-muted">{t('dashboard.homeKit.body')}</p>
          <Link
            to={ROUTES.gallery}
            className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'mt-3' })}
          >
            {t('dashboard.homeKit.action')}
          </Link>
        </div>
      </div>
    </Card>
  );
}
