import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { ROUTES } from '@/routes';
import { cn } from '@/utils/cn';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Compass}
      title={t('notFound.title')}
      description={t('notFound.description')}
      action={
        <Link
          to={ROUTES.dashboard}
          className={cn(buttonVariants({ variant: 'primary', size: 'sm' }))}
        >
          {t('notFound.action')}
        </Link>
      }
    />
  );
}
