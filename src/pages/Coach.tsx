import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

/** Placeholder for the AI coach (release-plan workstream 3). */
export default function Coach() {
  const { t } = useTranslation('coach');
  return (
    <div className="space-y-6">
      <PageHeader title={t('placeholder.title')} />
      <Card>
        <EmptyState icon={MessageCircle} title={t('placeholder.body')} />
      </Card>
    </div>
  );
}
