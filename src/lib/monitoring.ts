import * as Sentry from '@sentry/react-native';

/**
 * Crash reporting. Off until EXPO_PUBLIC_SENTRY_DSN is set (in .env locally, and as an EAS
 * environment variable for builds). No personal data is sent beyond the anonymous user id.
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const monitoringEnabled = !!dsn;

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    enabled: !__DEV__,
  });
}

/** Tag reports with the signed-in user's id (never their email or name). */
export function identify(userId: string | null) {
  if (dsn) Sentry.setUser(userId ? { id: userId } : null);
}

export const wrapRoot = (C: React.ComponentType<Record<string, unknown>>) => (dsn ? Sentry.wrap(C) : C);
