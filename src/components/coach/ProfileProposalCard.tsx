import { useTranslation } from 'react-i18next';
import { CheckCircle2, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { UserProfile } from '@/domain/profile';
import type { ProposalStatus } from '@/ai/chatStore';

function display(value: unknown): string {
  if (Array.isArray(value)) {
    return (
      value
        .map((v) =>
          v && typeof v === 'object'
            ? Object.values(v as Record<string, unknown>)
                .filter((x) => x !== '' && x !== undefined)
                .join(' ')
            : String(v),
        )
        .join(', ') || '—'
    );
  }
  if (value && typeof value === 'object') {
    const v = value as { conditions?: string; clearedByDoctor?: boolean };
    return v.conditions !== undefined ? v.conditions || '—' : JSON.stringify(value);
  }
  return value === undefined || value === '' ? '—' : String(value);
}

interface ProfileProposalCardProps {
  before: UserProfile;
  after: UserProfile;
  changed: string[];
  status: ProposalStatus;
  saving?: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

export function ProfileProposalCard({
  before,
  after,
  changed,
  status,
  saving,
  onAccept,
  onDismiss,
}: ProfileProposalCardProps) {
  const { t } = useTranslation('coach');
  return (
    <section
      aria-label={t('proposal.profileTitle')}
      className="rounded-xl border border-border bg-card p-4 shadow-e1"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-accent" aria-hidden="true" />
          <h3 className="text-h3 text-text">{t('proposal.profileTitle')}</h3>
        </div>
        {status === 'accepted' && (
          <Badge className="gap-1 text-text">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            {t('proposal.profileSaved')}
          </Badge>
        )}
        {status === 'dismissed' && <Badge>{t('proposal.dismissed')}</Badge>}
      </div>
      <dl className="mt-3 space-y-1 text-body-sm">
        {changed.map((field) => (
          <div key={field} className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-text">{t(`proposal.fields.${field}`)}:</dt>
            <dd className="text-text-muted">
              <span className="line-through">{display(before[field as keyof UserProfile])}</span> →{' '}
              <span className="text-text">{display(after[field as keyof UserProfile])}</span>
            </dd>
          </div>
        ))}
      </dl>
      {status === 'pending' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={onAccept} loading={saving}>
            {t('proposal.profileAccept')}
          </Button>
          <Button size="sm" variant="secondary" onClick={onDismiss} disabled={saving}>
            {t('proposal.profileDismiss')}
          </Button>
        </div>
      )}
    </section>
  );
}
