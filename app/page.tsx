'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is authenticated, redirect to dashboard
        router.replace('/dashboard');
      } else {
        // User is not authenticated, redirect to login
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Show loading spinner while checking auth state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
