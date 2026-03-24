/**
 * App.tsx — Root component.
 *
 * Mounts:
 *  - QueryClientProvider (React Query global cache)
 *  - RouterProvider     (React Router v6 with all route definitions)
 *
 * No layout wrapping here — each page manages its own layout.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

/** Single QueryClient instance for the entire app. */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 2 minutes — reduces redundant refetches for catalog data.
      staleTime: 2 * 60 * 1000,
      // Retry failed queries once before showing an error.
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
