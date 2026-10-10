import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

/** A code from an invite link opened before sign-up, pre-filled on "Find your circle". */
const PENDING_KEY = 'pending-invite-code';

/** Link that opens the app and joins the circle (sallahcircle://join/ABC123 in builds). */
export const inviteLink = (code: string) => Linking.createURL(`join/${code}`);

export const savePendingInvite = (code: string) => AsyncStorage.setItem(PENDING_KEY, code).catch(() => {});

/** Read and clear the pending code. */
export async function takePendingInvite() {
  try {
    const code = await AsyncStorage.getItem(PENDING_KEY);
    if (code) await AsyncStorage.removeItem(PENDING_KEY);
    return code;
  } catch {
    return null;
  }
}
