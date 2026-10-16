/**
 * Dev mode (`npm run dev`) never registers a service worker — only a
 * production build does (see vite.config.ts's VitePWA plugin). But a
 * service worker is scoped to the *origin*, not to how that origin is
 * currently being served: if a production build was ever loaded on this
 * same port before, its service worker stays active indefinitely and will
 * keep intercepting fetches for the dev server too, since dev never serves
 * a replacement to take over. The symptom is exactly what it sounds like —
 * `sw.js` throwing "Failed to fetch" for requests dev's own server would
 * happily serve. Self-heal by clearing it out whenever running in dev.
 */
export function unregisterStaleServiceWorker(): void {
  if (!import.meta.env.DEV || !('serviceWorker' in navigator)) return;

  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      void registration.unregister();
    }
  });

  if ('caches' in window) {
    void caches.keys().then((keys) => {
      for (const key of keys) {
        void caches.delete(key);
      }
    });
  }
}
