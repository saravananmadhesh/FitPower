/**
 * Switches for features that are reserved (route + nav item) but not built
 * yet. Flip one on in the PR that delivers the feature.
 */
export const FEATURES = {
  coach: true,
  /** The first-run wizard (W1); also shows "Redo setup" in Settings. */
  onboardingWizard: true,
} as const;
