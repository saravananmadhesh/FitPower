/**
 * Switches for features that are reserved (route + nav item) but not built
 * yet. Flip one on in the PR that delivers the feature.
 */
export const FEATURES = {
  coach: false,
  /** The first-run wizard (W1). Until it lands, /onboarding is a placeholder that resets the profile. */
  onboardingWizard: false,
} as const;
