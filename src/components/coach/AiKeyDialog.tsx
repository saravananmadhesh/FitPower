import { useEffect, useId, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  AI_PROVIDERS,
  DEFAULT_BASE_URLS,
  DEFAULT_MODELS,
  removeAiKey,
  saveAiKey,
  type AiProviderId,
} from '@/data/aiKeyStore';
import { useAiKey } from '@/ai/useAiKey';

const formSchema = z
  .object({
    provider: z.enum(AI_PROVIDERS),
    apiKey: z.string().trim(),
    model: z.string().trim().min(1, 'model'),
    baseUrl: z.url('baseUrl'),
  })
  .refine((v) => v.provider === 'openai-compatible' || v.apiKey.length > 0, {
    message: 'apiKey',
    path: ['apiKey'],
  });

type FormValues = z.infer<typeof formSchema>;

interface AiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a key is saved (e.g. to start the interview). */
  onSaved?: () => void;
}

/**
 * Popup where the user connects their own AI key. W1 (onboarding) and W2
 * (plan page) can open it too; it is self-contained.
 */
export function AiKeyDialog({ open, onOpenChange, onSaved }: AiKeyDialogProps) {
  const { t } = useTranslation('coach');
  const current = useAiKey();
  const [showKey, setShowKey] = useState(false);
  const ids = { provider: useId(), apiKey: useId(), model: useId(), baseUrl: useId() };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: 'anthropic',
      apiKey: '',
      model: DEFAULT_MODELS.anthropic,
      baseUrl: DEFAULT_BASE_URLS.anthropic,
    },
  });

  useEffect(() => {
    if (!open) return;
    setShowKey(false);
    reset(
      current
        ? {
            provider: current.provider,
            apiKey: current.apiKey,
            model: current.model,
            baseUrl: current.baseUrl,
          }
        : {
            provider: 'anthropic',
            apiKey: '',
            model: DEFAULT_MODELS.anthropic,
            baseUrl: DEFAULT_BASE_URLS.anthropic,
          },
    );
  }, [open, current, reset]);

  const provider = watch('provider');
  const providerField = register('provider');

  function onProviderChange(next: AiProviderId) {
    setValue('provider', next);
    setValue('model', DEFAULT_MODELS[next]);
    setValue('baseUrl', DEFAULT_BASE_URLS[next]);
  }

  function onSubmit(values: FormValues) {
    saveAiKey({ ...values, savedAt: new Date().toISOString() });
    toast.success(t('keyDialog.saved'));
    onOpenChange(false);
    onSaved?.();
  }

  function onRemove() {
    removeAiKey();
    toast.success(t('keyDialog.removed'));
    onOpenChange(false);
  }

  const errorText = (field: keyof FormValues): string | undefined =>
    errors[field] ? t(`keyDialog.errors.${field}`) : undefined;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(94vw,520px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-overlay">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-accent" aria-hidden="true" />
              <Dialog.Title className="text-h2 text-text">{t('keyDialog.title')}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-2 text-text-muted hover:bg-card-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                aria-label={t('keyDialog.cancel')}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-body-sm text-text-muted">
            {t('keyDialog.description')}
          </Dialog.Description>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <label htmlFor={ids.provider} className="block text-body-sm font-medium text-text">
                {t('keyDialog.provider')}
              </label>
              <Select
                id={ids.provider}
                className="w-full"
                {...providerField}
                onChange={(e) => onProviderChange(e.target.value as AiProviderId)}
              >
                {AI_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {t(`providers.${p}`)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={ids.apiKey} className="block text-body-sm font-medium text-text">
                {provider === 'openai-compatible'
                  ? t('keyDialog.apiKeyOptional')
                  : t('keyDialog.apiKey')}
              </label>
              <div className="flex gap-2">
                <Input
                  id={ids.apiKey}
                  type={showKey ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t('keyDialog.apiKeyPlaceholder')}
                  aria-invalid={Boolean(errors.apiKey)}
                  aria-describedby={errors.apiKey ? `${ids.apiKey}-err` : undefined}
                  {...register('apiKey')}
                />
                <Button
                  type="button"
                  variant="secondary"
                  iconOnly
                  aria-label={showKey ? t('keyDialog.hideKey') : t('keyDialog.showKey')}
                  aria-pressed={showKey}
                  onClick={() => setShowKey((s) => !s)}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
              {errors.apiKey && (
                <p id={`${ids.apiKey}-err`} className="text-body-sm text-danger">
                  {errorText('apiKey')}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor={ids.model} className="block text-body-sm font-medium text-text">
                {t('keyDialog.model')}
              </label>
              <Input
                id={ids.model}
                spellCheck={false}
                aria-invalid={Boolean(errors.model)}
                aria-describedby={`${ids.model}-hint`}
                {...register('model')}
              />
              <p id={`${ids.model}-hint`} className="text-caption text-text-muted">
                {errors.model ? (
                  <span className="text-danger">{errorText('model')}</span>
                ) : (
                  t('keyDialog.modelHint')
                )}
              </p>
            </div>

            {provider === 'openai-compatible' && (
              <div className="space-y-1.5">
                <label htmlFor={ids.baseUrl} className="block text-body-sm font-medium text-text">
                  {t('keyDialog.baseUrl')}
                </label>
                <Input
                  id={ids.baseUrl}
                  spellCheck={false}
                  inputMode="url"
                  aria-invalid={Boolean(errors.baseUrl)}
                  aria-describedby={`${ids.baseUrl}-hint`}
                  {...register('baseUrl')}
                />
                <p id={`${ids.baseUrl}-hint`} className="text-caption text-text-muted">
                  {errors.baseUrl ? (
                    <span className="text-danger">{errorText('baseUrl')}</span>
                  ) : (
                    t('keyDialog.baseUrlHint')
                  )}
                </p>
              </div>
            )}

            <div className="flex gap-3 rounded-lg border border-border bg-card-2 p-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
              <div>
                <p className="text-body-sm font-medium text-text">{t('keyDialog.privacyTitle')}</p>
                <p className="mt-1 text-body-sm text-text-muted">{t('keyDialog.privacyBody')}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {current ? (
                <Button type="button" variant="secondary" onClick={onRemove}>
                  {t('keyDialog.remove')}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="secondary">
                    {t('keyDialog.cancel')}
                  </Button>
                </Dialog.Close>
                <Button type="submit">{t('keyDialog.save')}</Button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
