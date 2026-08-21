import { useEffect, useState } from 'react';
import { supabase, supabaseEnabled } from './supabase';

export async function signUp(email, password) {
  if (!supabaseEnabled) throw new Error('Cloud sync is not configured.');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  if (!supabaseEnabled) throw new Error('Cloud sync is not configured.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabaseEnabled) return;
  await supabase.auth.signOut();
}

// 'loading' | 'anon' | 'authed' | 'disabled' (no Supabase configured, so
// there's no account system at all — the app falls back to local-only).
export function useAuthSession() {
  const [status, setStatus] = useState(supabaseEnabled ? 'loading' : 'disabled');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!supabaseEnabled) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data.session?.user || null);
      setStatus(data.session?.user ? 'authed' : 'anon');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setStatus(session?.user ? 'authed' : 'anon');
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  return { status, user };
}
