import React from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Card } from '../components/Card';

const mockItems = [
  { id: '1', title: 'First swim!', image: 'https://picsum.photos/seed/swim/400/300', date: '2025-01-02' },
  { id: '2', title: 'First steps', image: 'https://picsum.photos/seed/steps/400/300', date: '2025-02-15' }
];

export default function Timeline() {
  return (
    <View style={styles.container}>
      <FlatList
        data={mockItems}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <Card>
            <Image source={{ uri: item.image }} style={{ width: '100%', height: 180, borderRadius: 12 }} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.date}</Text>
          </Card>
        )}
        ListHeaderComponent={<Text style={styles.header}>Timeline</Text>}
        ListFooterComponent={<Link href="/upload" style={styles.link}>➕ Add new memory</Link>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { fontSize: 24, fontWeight: '800', marginBottom: 12, paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  meta: { color: '#6b7280' },
  link: { padding: 16, textAlign: 'center', fontWeight: '700' }
});
