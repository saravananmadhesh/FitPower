import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { profileFormSchema, type ProfileFormValues } from '@/domain/formSchemas';
import { SEXES, type UserProfile } from '@/domain/profile';
import { useSaveProfileMutation } from '@/queries/useProfile';
import { ROUTES } from '@/routes';
import { FEATURES } from '@/config/features';

const ERROR_KEYS = ['birthDate', 'height', 'goalWeight'] as const;

export function ProfileCard({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const saveProfile = useSaveProfileMutation();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: {
      name: profile.name,
      birthDate: profile.birthDate,
      sex: profile.sex,
      heightCm: profile.heightCm,
      goalWeightKg: profile.goalWeightKg,
    },
  });

  function errorText(message: string | undefined): string | undefined {
    const key = ERROR_KEYS.find((k) => k === message);
    return key ? t(`settings.profile.errors.${key}`) : message;
  }

  function onSubmit(values: ProfileFormValues) {
    saveProfile.mutate(
      { ...profile, ...values, updatedAt: new Date().toISOString() },
      {
        onSuccess: () => {
          reset(values);
          toast.success(t('settings.profile.savedToast'));
        },
        onError: () => toast.error(t('settings.profile.saveError')),
      },
    );
  }

  const field = 'mb-1 block text-caption text-text-muted';
  const error = 'mt-1 text-caption text-danger';

  return (
    <Card>
      <h3 className="mb-1 text-h3 text-text">{t('settings.profile.title')}</h3>
      <p className="mb-4 text-body-sm text-text-muted">{t('settings.profile.description')}</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="profile-name" className={field}>
              {t('settings.profile.name')}
            </label>
            <Input
              id="profile-name"
              autoComplete="given-name"
              placeholder={t('settings.profile.namePlaceholder')}
              {...register('name')}
            />
          </div>
          <div>
            <label htmlFor="profile-birth" className={field}>
              {t('settings.profile.birthDate')}
            </label>
            <Input
              id="profile-birth"
              type="date"
              {...register('birthDate')}
              aria-invalid={Boolean(errors.birthDate)}
              aria-describedby={errors.birthDate ? 'profile-birth-error' : undefined}
            />
            {errors.birthDate && (
              <p id="profile-birth-error" className={error}>
                {errorText(errors.birthDate.message)}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="profile-sex" className={field}>
              {t('settings.profile.sex')}
            </label>
            <Select id="profile-sex" className="w-full" {...register('sex')}>
              {SEXES.map((sex) => (
                <option key={sex} value={sex}>
                  {t(`settings.profile.sexOptions.${sex}`)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="profile-height" className={field}>
              {t('settings.profile.height')}
            </label>
            <Input
              id="profile-height"
              type="number"
              step="0.5"
              {...register('heightCm', { valueAsNumber: true })}
              aria-invalid={Boolean(errors.heightCm)}
              aria-describedby={errors.heightCm ? 'profile-height-error' : undefined}
            />
            {errors.heightCm && (
              <p id="profile-height-error" className={error}>
                {errorText(errors.heightCm.message)}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="profile-goal" className={field}>
              {t('settings.profile.goalWeight')}
            </label>
            <Input
              id="profile-goal"
              type="number"
              step="0.1"
              {...register('goalWeightKg', { valueAsNumber: true })}
              aria-invalid={Boolean(errors.goalWeightKg)}
              aria-describedby={errors.goalWeightKg ? 'profile-goal-error' : undefined}
            />
            {errors.goalWeightKg && (
              <p id="profile-goal-error" className={error}>
                {errorText(errors.goalWeightKg.message)}
              </p>
            )}
          </div>
        </div>
        <Button type="submit" className="mt-4" disabled={!isDirty} loading={saveProfile.isPending}>
          {t('settings.profile.save')}
        </Button>
      </form>

      {/* Hidden until W1's wizard lands: the placeholder overwrites the profile. */}
      {FEATURES.onboardingWizard && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-body-sm font-medium text-text">{t('settings.profile.retakeTitle')}</p>
          <p className="mb-3 mt-1 text-body-sm text-text-muted">
            {t('settings.profile.retakeDescription')}
          </p>
          <Button variant="secondary" onClick={() => navigate(ROUTES.onboarding)}>
            {t('settings.profile.retake')}
          </Button>
        </div>
      )}
    </Card>
  );
}
