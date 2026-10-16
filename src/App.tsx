import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import '@/i18n';
import { ErrorBoundary } from '@/components/app/ErrorBoundary';
import { AppShell } from '@/components/app/AppShell';
import { OnboardingGate } from '@/components/app/OnboardingGate';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeSync } from '@/hooks/useThemeSync';
import { armAudio } from '@/utils/audio';
import { ROUTES } from '@/routes';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Workout = lazy(() => import('@/pages/Workout'));
const Gallery = lazy(() => import('@/pages/Gallery'));
const GalleryAlbum = lazy(() => import('@/pages/GalleryAlbum'));
const Schedule = lazy(() => import('@/pages/Schedule'));
const Progress = lazy(() => import('@/pages/Progress'));
const Nutrition = lazy(() => import('@/pages/Nutrition'));
const Photos = lazy(() => import('@/pages/Photos'));
const Plan = lazy(() => import('@/pages/Plan'));
const Settings = lazy(() => import('@/pages/Settings'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Coach = lazy(() => import('@/pages/Coach'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function Shell() {
  useThemeSync();

  useEffect(() => {
    window.addEventListener('pointerdown', armAudio);
    window.addEventListener('keydown', armAudio);
    return () => {
      window.removeEventListener('pointerdown', armAudio);
      window.removeEventListener('keydown', armAudio);
    };
  }, []);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path={ROUTES.onboarding} element={<Onboarding />} />
        <Route element={<OnboardingGate fallback={<RouteFallback />} />}>
          <Route element={<AppShell />}>
            <Route path={ROUTES.dashboard} element={<Dashboard />} />
            <Route path={ROUTES.workout} element={<Workout />} />
            <Route path={ROUTES.gallery} element={<Gallery />} />
            <Route path={ROUTES.galleryAlbum} element={<GalleryAlbum />} />
            <Route path={ROUTES.schedule} element={<Schedule />} />
            <Route path={ROUTES.progress} element={<Progress />} />
            <Route path={ROUTES.nutrition} element={<Nutrition />} />
            <Route path={ROUTES.photos} element={<Photos />} />
            <Route path={ROUTES.plan} element={<Plan />} />
            <Route path={ROUTES.settings} element={<Settings />} />
            <Route path={ROUTES.coach} element={<Coach />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
