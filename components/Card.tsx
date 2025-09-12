import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 2, gap: 8 }
});
