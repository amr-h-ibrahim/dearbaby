import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

export function Button({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.btn, pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={styles.txt}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  txt: { color: 'white', fontWeight: '600' }
});
