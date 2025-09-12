import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthProvider';
import { Link } from 'expo-router';

export default function Profile() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.line}>Email: {user?.email ?? 'Guest'}</Text>
      {!user ? <Link href="/login" style={styles.login}>Sign in</Link> : <Button title="Sign out" onPress={signOut} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f3f4f6' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  line: { fontSize: 16, marginBottom: 16 },
  login: { fontWeight: '700' }
});
