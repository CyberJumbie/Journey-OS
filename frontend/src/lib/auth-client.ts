'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { createClient } from './supabase';

export function useSignOut() {
  const router = useRouter();

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [router]);

  return signOut;
}
