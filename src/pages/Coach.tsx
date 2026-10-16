import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertTriangle,
  KeyRound,
  MessageCircle,
  Send,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { AiKeyDialog } from '@/components/coach/AiKeyDialog';
import { ChatThread } from '@/components/coach/ChatThread';
import { PlanProposalCard } from '@/components/coach/PlanProposalCard';
import { ProfileProposalCard } from '@/components/coach/ProfileProposalCard';
import { useAiKey } from '@/ai/useAiKey';
import { useCoach } from '@/ai/useCoach';
import { useCoachChatStore, type StoredProposal } from '@/ai/chatStore';
import { isSetUp, useAppDataQuery, type ReadyAppData } from '@/queries/useAppDataQuery';
import { useCatalogQuery } from '@/queries/useCatalogQuery';
import { useSavePlanMutation } from '@/queries/usePlan';
import { useSaveProfileMutation } from '@/queries/useProfile';
import { parseISO } from '@/domain/dates';
import type { AiKeyConfig } from '@/data/aiKeyStore';
import type { Catalog } from '@/domain/catalog';
import { ROUTES } from '@/routes';

export default function Coach() {
  const { t } = useTranslation('coach');
  const appData = useAppDataQuery();
  const catalog = useCatalogQuery();
  const config = useAiKey();
  const [keyOpen, setKeyOpen] = useState(false);

  if (appData.isError || catalog.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void appData.refetch();
          void catalog.refetch();
        }}
      />
    );
  }
  if (appData.isLoading || catalog.isLoading || !isSetUp(appData.data) || !catalog.data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('title')} description={t('description')} />
      {config ? (
        <CoachChat
          config={config}
          data={appData.data}
          catalog={catalog.data}
          onManageKey={() => setKeyOpen(true)}
        />
      ) : (
        <NotConnected onConnect={() => setKeyOpen(true)} />
      )}
      <AiKeyDialog open={keyOpen} onOpenChange={setKeyOpen} />
    </div>
  );
}

function NotConnected({ onConnect }: { onConnect: () => void }) {
  const { t } = useTranslation('coach');
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <Badge>{t('notConnected.badge')}</Badge>
      <MessageCircle className="h-10 w-10 text-text-subtle" aria-hidden="true" />
      <h3 className="text-h2 text-text">{t('notConnected.title')}</h3>
      <p className="max-w-md text-body text-text-muted">{t('notConnected.body')}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button onClick={onConnect} leftIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}>
          {t('notConnected.connect')}
        </Button>
        <Link to={ROUTES.plan} className={buttonVariants({ variant: 'secondary' })}>
          {t('notConnected.builtIn')}
        </Link>
      </div>
    </Card>
  );
}

interface CoachChatProps {
  config: AiKeyConfig;
  data: ReadyAppData;
  catalog: Catalog;
  onManageKey: () => void;
}

function CoachChat({ config, data, catalog, onManageKey }: CoachChatProps) {
  const { t, i18n } = useTranslation('coach');
  const coach = useCoach(config, data, catalog);
  const proposals = useCoachChatStore((s) => s.proposals);
  const setProposalStatus = useCoachChatStore((s) => s.setProposalStatus);
  const clearChat = useCoachChatStore((s) => s.clear);
  const savePlan = useSavePlanMutation();
  const saveProfile = useSaveProfileMutation();
  const [input, setInput] = useState('');
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [params, setParams] = useSearchParams();
  const autoStarted = useRef(false);

  async function submit(text: string) {
    if (!text.trim() || coach.busy) return;
    setInput('');
    setLastFailed(null);
    const ok = await coach.send(text);
    if (!ok) {
      setLastFailed(text);
      setInput((current) => current || text);
    }
  }

  // `/coach?intent=plan` (from onboarding or the Plan page) starts the plan interview.
  useEffect(() => {
    if (autoStarted.current || params.get('intent') !== 'plan') return;
    autoStarted.current = true;
    setParams({}, { replace: true });
    if (coach.messages.length === 0) void submit(t('chat.starters.planText'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFormSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit(input);
    }
  }

  function acceptPlan(toolUseId: string, stored: StoredProposal) {
    if (stored.proposal.kind !== 'plan') return;
    const plan = stored.proposal.plan;
    savePlan.mutate(plan, {
      onSuccess: (saved) => {
        // Other drafts still waiting are superseded by this one.
        for (const [id, other] of Object.entries(proposals)) {
          if (id !== toolUseId && other.status === 'pending' && other.proposal.kind === 'plan') {
            setProposalStatus(id, 'dismissed');
          }
        }
        setProposalStatus(toolUseId, 'accepted', t('proposal.acceptedNote', { name: saved.name }));
        toast.success(
          t('proposal.savedToast', {
            start: parseISO(saved.startDate).toLocaleDateString(i18n.language, {
              day: 'numeric',
              month: 'short',
            }),
          }),
        );
      },
      onError: () => toast.error(t('proposal.saveError')),
    });
  }

  function askForChanges(toolUseId: string) {
    setProposalStatus(toolUseId, 'dismissed', t('proposal.planDismissedNote'));
    setInput(t('proposal.changesPrefill'));
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function acceptProfile(toolUseId: string, stored: StoredProposal) {
    if (stored.proposal.kind !== 'profile') return;
    const { profile: proposed, changed } = stored.proposal;
    // Apply only the changed fields on top of the latest saved profile.
    const next = { ...data.profile, updatedAt: new Date().toISOString() };
    for (const field of changed) {
      (next as Record<string, unknown>)[field] = proposed[field as keyof typeof proposed];
    }
    saveProfile.mutate(next, {
      onSuccess: () => {
        setProposalStatus(
          toolUseId,
          'accepted',
          t('proposal.profileAcceptedNote', { fields: changed.join(', ') }),
        );
        toast.success(t('proposal.profileSaved'));
      },
      onError: () => toast.error(t('proposal.saveError')),
    });
  }

  function renderProposal(toolUseId: string, stored: StoredProposal) {
    if (stored.proposal.kind === 'plan') {
      return (
        <PlanProposalCard
          plan={stored.proposal.plan}
          status={stored.status}
          saving={savePlan.isPending}
          onAccept={() => acceptPlan(toolUseId, stored)}
          onAskChanges={() => askForChanges(toolUseId)}
        />
      );
    }
    const { previous, profile, changed } = stored.proposal;
    return (
      <ProfileProposalCard
        before={previous}
        after={profile}
        changed={changed}
        status={stored.status}
        saving={saveProfile.isPending}
        onAccept={() => acceptProfile(toolUseId, stored)}
        onDismiss={() =>
          setProposalStatus(
            toolUseId,
            'dismissed',
            t('proposal.profileDismissedNote', { fields: changed.join(', ') }),
          )
        }
      />
    );
  }

  function onClear() {
    if (!window.confirm(t('header.clearConfirm'))) return;
    coach.cancel();
    clearChat();
    toast.success(t('header.cleared'));
  }

  const starters = [
    { label: t('chat.starters.plan'), text: t('chat.starters.planText') },
    { label: t('chat.starters.progress'), text: t('chat.starters.progressText') },
    { label: t('chat.starters.swap'), text: t('chat.starters.swapText') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-body-sm text-text-muted">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
          {t('header.connectedTo', {
            provider: t(`providers.${config.provider}`),
            model: config.model,
          })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onManageKey}
            leftIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
          >
            {t('header.manageKey')}
          </Button>
          {coach.messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            >
              {t('header.clearChat')}
            </Button>
          )}
        </div>
      </div>

      <Card className="min-h-[24rem]">
        {coach.messages.length === 0 && !coach.busy ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Sparkles className="h-8 w-8 text-accent" aria-hidden="true" />
            <h3 className="text-h3 text-text">{t('chat.emptyTitle')}</h3>
            <p className="max-w-md text-body text-text-muted">{t('chat.emptyBody')}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {starters.map((s) => (
                <Button
                  key={s.label}
                  variant="secondary"
                  size="sm"
                  onClick={() => void submit(s.text)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ChatThread
            messages={coach.messages}
            proposals={proposals}
            busy={coach.busy}
            renderProposal={renderProposal}
          />
        )}
      </Card>

      {coach.error && (
        <div
          role="alert"
          className="flex flex-wrap items-start gap-3 rounded-lg border border-danger/40 bg-danger-soft p-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-body-sm">
            <p className="text-text">{t(`chat.errors.${coach.error}`)}</p>
            {coach.errorDetail && (
              <p className="mt-1 break-words text-text-muted">
                {t('chat.errors.details', { detail: coach.errorDetail })}
              </p>
            )}
          </div>
          {lastFailed && (
            <Button size="sm" variant="secondary" onClick={() => void submit(lastFailed)}>
              {t('chat.errors.retry')}
            </Button>
          )}
        </div>
      )}

      <form onSubmit={onFormSubmit} className="flex items-end gap-2">
        <label htmlFor="coach-input" className="sr-only">
          {t('chat.inputLabel')}
        </label>
        <textarea
          id="coach-input"
          ref={inputRef}
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('chat.placeholder')}
          className="min-h-[2.75rem] flex-1 resize-y rounded-md border border-border bg-card-2 px-3 py-2 text-body text-text placeholder:text-text-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        {coach.busy ? (
          <Button
            type="button"
            variant="secondary"
            onClick={coach.cancel}
            leftIcon={<Square className="h-4 w-4" aria-hidden="true" />}
          >
            {t('chat.stop')}
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!input.trim()}
            leftIcon={<Send className="h-4 w-4" aria-hidden="true" />}
          >
            {t('chat.send')}
          </Button>
        )}
      </form>
      <p className="text-caption text-text-muted">{t('chat.scope')}</p>
    </div>
  );
}
