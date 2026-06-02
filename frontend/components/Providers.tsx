"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { useSocket } from '../hooks/useSocket';

export default function Providers({ children }: { children: ReactNode }) {
  // Create query client inside useState to prevent sharing state across users
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Synchronize WebSocket channels dynamically
  return (
    <QueryClientProvider client={queryClient}>
      <SocketSynchronizer />
      {children}
    </QueryClientProvider>
  );
}

function SocketSynchronizer() {
  // This client component binds the custom socket hook instantly
  useSocket();
  return null;
}
