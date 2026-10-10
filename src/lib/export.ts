import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/** Everything we store about you, as one JSON file you can save or send. */
export async function exportMyData(userId: string) {
  const all = async (q: PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data;
  };
  const [profile, reminders, settings, circles, logs, details, sent, received, fasts, qada, sunnah, excused, blocks, reports] = await Promise.all([
    all(supabase.from('profiles').select('*').eq('id', userId).single()),
    all(supabase.from('prayer_reminders').select('*').eq('user_id', userId)),
    all(supabase.from('reminder_settings').select('*').eq('user_id', userId)),
    all(supabase.from('circle_members').select('role, joined_at, circle:circles(name, visibility, focus, created_at)').eq('user_id', userId)),
    all(supabase.from('prayer_logs').select('prayer, prayed_on, status, logged_at').eq('user_id', userId).order('prayed_on')),
    all(supabase.from('prayer_log_details').select('log_id, in_jamaah, at_masjid').eq('user_id', userId)),
    all(supabase.from('nudges').select('kind, prayer, prayer_date, message, response, created_at').eq('from_user', userId)),
    all(supabase.from('nudges').select('kind, prayer, prayer_date, message, response, created_at').eq('to_user', userId)),
    all(supabase.from('fast_logs').select('*').eq('user_id', userId)),
    all(supabase.from('qada_counts').select('*').eq('user_id', userId)),
    all(supabase.from('sunnah_logs').select('*').eq('user_id', userId)),
    all(supabase.from('excused_periods').select('kind, started_on, ended_on').eq('user_id', userId)),
    all(supabase.from('blocks').select('blocked, created_at').eq('blocker', userId)),
    all(supabase.from('reports').select('reason, details, status, created_at').eq('reporter', userId)),
  ]);
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Salah Circle',
    profile,
    reminders: { prayers: reminders, settings },
    circles,
    prayerLog: logs,
    prayerLogDetails: details,
    nudges: { sent, received },
    fasts,
    qada,
    sunnahPrayers: sunnah,
    excusedDays: excused,
    blocked: blocks,
    reportsFiled: reports,
  };
  const json = JSON.stringify(payload, null, 2);
  const name = `salah-circle-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your Salah Circle data' });
}
