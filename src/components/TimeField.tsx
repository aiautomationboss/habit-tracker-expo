import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useColors } from '../lib/useColors';
import { radius, spacing } from '../theme';

function fmt(h: number, m: number): string {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${`${m}`.padStart(2, '0')} ${ampm}`;
}

interface Props {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

export function TimeField({ hour, minute, onChange }: Props) {
  const c = useColors();
  const [show, setShow] = useState(false);

  const value = new Date();
  value.setHours(hour, minute, 0, 0);

  const handle = (e: DateTimePickerEvent, d?: Date) => {
    setShow(false);
    if (e.type === 'set' && d) onChange(d.getHours(), d.getMinutes());
  };

  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        style={[styles.btn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
      >
        <Text style={[styles.time, { color: c.text }]}>{fmt(hour, minute)}</Text>
        <Text style={[styles.edit, { color: c.primary }]}>Change</Text>
      </Pressable>
      {show && <DateTimePicker value={value} mode="time" is24Hour={false} onChange={handle} />}
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  time: { fontSize: 20, fontWeight: '800' },
  edit: { fontSize: 14, fontWeight: '700' },
});
