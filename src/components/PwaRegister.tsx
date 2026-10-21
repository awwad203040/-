'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Proactively check for updates to avoid stale cached bundles
            registration.update().catch(() => {});
          })
          .catch((err) => {
            console.log('ServiceWorker registration: ', err);
          });
      });
    }
  }, []);

  return null;
}
