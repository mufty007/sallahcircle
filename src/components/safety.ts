import { router } from 'expo-router';
import { Alert } from 'react-native';

import { setBlocked } from '@/lib/data';

/** Report / block / unblock menu for a person (optionally about one nudge). */
export function safetyMenu(userId: string, name: string, isBlocked: boolean, nudgeId?: string) {
  Alert.alert(name, undefined, [
    { text: 'Report', onPress: () => router.push({ pathname: '/report', params: { user: userId, name, ...(nudgeId ? { nudge: nudgeId } : {}) } }) },
    isBlocked
      ? { text: `Unblock ${name}`, onPress: () => setBlocked(userId, false).catch((e) => Alert.alert('Couldn’t unblock', String(e?.message ?? e))) }
      : {
          text: `Block ${name}`,
          style: 'destructive',
          onPress: () =>
            Alert.alert(`Block ${name}?`, 'Neither of you will be able to nudge the other, and their nudges are hidden from you. They aren’t told.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Block', style: 'destructive', onPress: () => setBlocked(userId, true).catch((e) => Alert.alert('Couldn’t block', String(e?.message ?? e))) },
            ]),
        },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
