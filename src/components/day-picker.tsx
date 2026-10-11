import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { RoundBtn } from '@/components/ui/primitives';
import { T } from '@/components/ui/text';
import { addDays, niceDate } from '@/lib/cycle';
import { SC } from '@/theme/colors';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const monthLabel = (ym: string) => new Date(`${ym}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** A date the user picks. `min` and `max` are inclusive YYYY-MM-DD. */
export function DayPicker({ value, onChange, min, max }: { value: string; onChange: (iso: string) => void; min?: string; max?: string }) {
  const [open, setOpen] = useState(false);
  const [ym, setYm] = useState(value.slice(0, 7));
  const cursor = open ? ym : value.slice(0, 7);
  const [y, m] = cursor.split('-').map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: count }, (_, i) => `${cursor}-${String(i + 1).padStart(2, '0')}`)];

  const floor = (min ?? addDays(max ?? value, -365 * 3)).slice(0, 7);
  const ceil = (max ?? value).slice(0, 7);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (next < floor || next > ceil) return;
    setYm(next);
  };
  const allowed = (iso: string) => (!min || iso >= min) && (!max || iso <= max);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={niceDate(value)}
        onPress={() => {
          setYm(value.slice(0, 7));
          setOpen((v) => !v);
        }}
        style={{ height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
        <Icon n="cal" s={18} c={SC.mint} />
        <T style={{ flex: 1, fontSize: 15, fontWeight: '600' }}>{niceDate(value)}</T>
        <Icon n="down" s={16} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open && (
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <RoundBtn n="back" s={32} bg="rgba(255,255,255,0.08)" onPress={() => shift(-1)} accessibilityLabel="Previous month" />
            <T style={{ fontSize: 15, fontWeight: '600' }}>{monthLabel(cursor)}</T>
            <RoundBtn n="chev" s={32} bg="rgba(255,255,255,0.08)" onPress={() => shift(1)} accessibilityLabel="Next month" />
          </View>
          <View style={{ flexDirection: 'row' }}>
            {WEEK.map((d, i) => (
              <T key={`${d}${i}`} style={{ flex: 1, textAlign: 'center', fontSize: 11, opacity: 0.45, fontWeight: '600' }}>
                {d}
              </T>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((iso, i) => {
              const on = iso === value;
              const ok = iso != null && allowed(iso);
              return (
                <Pressable
                  key={iso ?? `empty-${i}`}
                  disabled={!ok}
                  accessibilityRole="button"
                  accessibilityLabel={iso ? niceDate(iso) : undefined}
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    if (!iso) return;
                    onChange(iso);
                    setOpen(false);
                  }}
                  style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
                  {iso && (
                    <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? SC.mint : 'transparent' }}>
                      <T style={{ fontSize: 14, fontWeight: on ? '700' : '400', color: on ? SC.ink : '#fff', opacity: ok ? 1 : 0.25 }}>{Number(iso.slice(8))}</T>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
