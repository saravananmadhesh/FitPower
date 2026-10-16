import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import common from './locales/en/common.json';
import onboarding from './locales/en/onboarding.json';
import plans from './locales/en/plans.json';
import coach from './locales/en/coach.json';

/**
 * One namespace per feature area so parallel work doesn't collide in one
 * file. `common` is the default: `t('nav.dashboard')` reads common.json;
 * other areas use `useTranslation('onboarding')` (or `t('coach:…')`).
 */
export const NAMESPACES = ['common', 'onboarding', 'plans', 'coach'] as const;

void i18n.use(initReactI18next).init({
  resources: { en: { common, onboarding, plans, coach } },
  ns: NAMESPACES,
  defaultNS: 'common',
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
