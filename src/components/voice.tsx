import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Tap } from '@/components/ui/primitives';
import { T } from '@/components/ui/text';
import { voiceUrl } from '@/lib/data';
import { SC } from '@/theme/colors';

export const VOICE_MAX_MS = 30_000;

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export type Recording = { uri: string; ms: number };

/**
 * Tap to record (up to 30 s), tap to stop, then preview or redo.
 * Reports the finished recording through `onChange` (null while recording or after redo).
 */
export function VoiceRecorder({ onChange, light = true }: { onChange: (r: Recording | null) => void; light?: boolean }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [done, setDone] = useState<Recording | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ink = light ? SC.ink : '#fff';

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const stop = async () => {
    clearTimeout(timer.current);
    const ms = recorder.getStatus().durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (recorder.uri && ms > 600) {
      const r = { uri: recorder.uri, ms };
      setDone(r);
      onChange(r);
    } else setError('Too short. Tap and say a little more.');
  };

  const start = async () => {
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError('Microphone access is off. Turn it on in Settings to send voice notes.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    timer.current = setTimeout(stop, VOICE_MAX_MS); // hard stop at the limit
  };

  const redo = () => {
    setDone(null);
    onChange(null);
  };

  if (done) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <VoicePlayer source={done.uri} ms={done.ms} light={light} />
        </View>
        <Tap onPress={redo} accessibilityLabel="Record again" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: light ? 'rgba(11,18,32,0.06)' : 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon n="redo" s={18} c={ink} />
        </Tap>
      </View>
    );
  }

  const pct = Math.min(1, state.durationMillis / VOICE_MAX_MS);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Tap
          onPress={state.isRecording ? stop : start}
          accessibilityLabel={state.isRecording ? 'Stop recording' : 'Start recording'}
          style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: SC.coral, alignItems: 'center', justifyContent: 'center' }}>
          <Icon n={state.isRecording ? 'stop' : 'mic'} s={22} c="#fff" />
        </Tap>
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 15, fontWeight: '600', color: ink }}>{state.isRecording ? `Recording… ${clock(state.durationMillis)}` : 'Tap to record'}</T>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: light ? 'rgba(11,18,32,0.08)' : 'rgba(255,255,255,0.12)', marginTop: 8, overflow: 'hidden' }}>
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: SC.coral }} />
          </View>
          <T style={{ fontSize: 11, opacity: 0.5, marginTop: 4, color: ink }}>Up to 30 seconds</T>
        </View>
      </View>
      {error && <T style={{ color: SC.coral, fontSize: 13, marginTop: 8 }}>{error}</T>}
    </View>
  );
}

/** Play/pause pill for a local file URI or a remote URL. */
export function VoicePlayer({ source, ms, light = false }: { source: string; ms?: number; light?: boolean }) {
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const ink = light ? SC.ink : '#fff';
  const total = status.duration ? status.duration * 1000 : (ms ?? 0);
  const pos = status.currentTime * 1000;

  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  return (
    <Tap
      onPress={() => (status.playing ? player.pause() : player.play())}
      accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
      style={{ height: 44, borderRadius: 22, backgroundColor: light ? 'rgba(11,18,32,0.06)' : 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6, paddingRight: 14 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: SC.coral, alignItems: 'center', justifyContent: 'center' }}>
        {!status.isLoaded ? <ActivityIndicator size="small" color="#fff" /> : <Icon n={status.playing ? 'pause' : 'play'} s={14} c="#fff" w={2.4} />}
      </View>
      <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: light ? 'rgba(11,18,32,0.1)' : 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
        <View style={{ width: total ? `${Math.min(100, (pos / total) * 100)}%` : '0%', height: '100%', backgroundColor: SC.coral }} />
      </View>
      <T style={{ fontSize: 13, fontWeight: '600', color: ink, fontVariant: ['tabular-nums'] }}>{clock(status.playing ? pos : total)}</T>
    </Tap>
  );
}

/** Player for a voice note in storage: fetches a short-lived signed URL first. */
export function StoredVoice({ path, light }: { path: string; light?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    voiceUrl(path)
      .then((u) => live && setUrl(u))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [path]);
  if (failed) return <T style={{ fontSize: 13, opacity: 0.6 }}>Voice note unavailable</T>;
  if (!url) return <ActivityIndicator color={light ? SC.ink : '#fff'} style={{ alignSelf: 'flex-start', height: 44 }} />;
  return <VoicePlayer source={url} light={light} />;
}
