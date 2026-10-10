import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/** Deep link Supabase redirects back to. Add it under Auth → URL Configuration → Redirect URLs. */
export const authRedirectUrl = () => Linking.createURL('auth/callback');

/** Create a session from an OAuth redirect URL (implicit tokens in the fragment, or a PKCE code). */
export async function sessionFromUrl(url: string) {
  const [, hash = ''] = url.split('#');
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  const params = new URLSearchParams(`${query}&${hash}`);

  const error = params.get('error_description') ?? params.get('error');
  if (error) {
    const detail = error.replace(/\+/g, ' '); // URLSearchParams already decoded it
    console.warn('OAuth error', params.get('error_code'), detail);
    if (/access_denied/i.test(params.get('error') ?? '')) throw new Error('Sign-in was cancelled.');
    // Supabase couldn't trade Google's code: almost always a Client ID / secret mismatch in Auth → Providers → Google.
    if (/exchange external code/i.test(detail)) throw new Error(`Google sign-in failed on the server (${detail}). Check the Google Client ID and secret in Supabase.`);
    throw new Error(detail);
  }

  const code = params.get('code');
  if (code) {
    const { error: e } = await supabase.auth.exchangeCodeForSession(code);
    if (e) throw e;
    return true;
  }
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return false;
  const { error: e } = await supabase.auth.setSession({ access_token, refresh_token });
  if (e) throw e;
  return true;
}

/** Google sign-in through the system browser. Resolves false if the user cancelled. */
export async function signInWithGoogle() {
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return false;
  return sessionFromUrl(res.url);
}

/** Sign in, or create the account if this email is new (email confirmation is off). */
export async function continueWithEmail(email: string, password: string) {
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn.error) return;
  if (signIn.error.code !== 'invalid_credentials') throw signIn.error;

  const signUp = await supabase.auth.signUp({ email, password });
  if (signUp.error) {
    if (signUp.error.code === 'user_already_exists') throw new Error('That password doesn’t match this email.');
    throw signUp.error;
  }
  if (!signUp.data.session) throw new Error('Check your inbox to confirm your email, then sign in.');
}

/** Permanently delete the signed-in account (server-side), then clear the local session. */
export async function deleteAccount() {
  const { data, error } = await supabase.functions.invoke('delete-account');
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(body?.error ?? 'Couldn’t delete your account. Please try again.');
  }
  if (!data?.deleted) throw new Error('Couldn’t delete your account. Please try again.');
  await supabase.auth.signOut({ scope: 'local' });
}

/** Email a password-reset link that opens the app's reset screen. */
export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: Linking.createURL('reset-password') });
  if (error) throw error;
}

/** Set a new password for the session created from the reset link. */
export async function setNewPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
