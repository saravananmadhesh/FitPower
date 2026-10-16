import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ErrorState } from '@/components/ui/ErrorState';
import { isSetUp, useAppDataQuery } from '@/queries/useAppDataQuery';
import { ROUTES } from '@/routes';

/**
 * Sends a first-time user (no profile or plan yet) to onboarding; otherwise
 * renders the matched app route.
 */
export function OnboardingGate({ fallback }: { fallback: ReactNode }) {
  const { data, isLoading, isError, refetch } = useAppDataQuery();
  if (isLoading) return <>{fallback}</>;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!isSetUp(data)) return <Navigate to={ROUTES.onboarding} replace />;
  return <Outlet />;
}
