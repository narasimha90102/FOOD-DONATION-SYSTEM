"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NgoChatPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ngo');
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6 text-center text-slate-400 text-sm">
      Chat option has been disabled for NGO accounts. Redirecting to NGO Dashboard...
    </div>
  );
}
