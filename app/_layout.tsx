import { Tabs, Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Tabs>
        <Tabs.Screen name="index" options={{ title: 'Timeline' }} />
        <Tabs.Screen name="upload" options={{ title: 'Upload' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="login" options={{ href: null }} />
      </Tabs>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
