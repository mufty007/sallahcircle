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
    const code = params.get('error_code') ?? '';
    throw new Error(
      code === 'unexpected_failure' || /exchange external code/i.test(error)
        ? 'Google sign-in isn’t configured correctly on the server. Please try email for now.'
        : error.replace(/\+/g, ' '),
    );
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
