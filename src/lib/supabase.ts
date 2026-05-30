import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// The publishable key is client-safe by design — security comes from RLS.
const SUPABASE_URL = 'https://qohqmllogilkvgouujjx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ndyN9Xh5NeZd3-NV5YSOdw_oxIMwYJj';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth helpers ---------------------------------------------------------------

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

// Sends a password recovery email. The link lands on Supabase's hosted
// password-update page (no app deep-link configuration required).
export async function sendPasswordResetEmail(email: string) {
  return supabase.auth.resetPasswordForEmail(email);
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(cb: (userId: string | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user.id ?? null);
  });
}
