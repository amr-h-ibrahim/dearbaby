import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

async function putToParUrl(parUrl, bytes, contentType) {
  const res = await fetch(parUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: bytes
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload failed: ${res.status} ${res.statusText} - ${txt}`);
  }
  return true;
}

export default function App() {
  const [parUrl, setParUrl] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [mime, setMime] = useState('image/jpeg');
  const [busy, setBusy] = useState(false);

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false
    });
    if (!res.canceled) {
      const asset = res.assets[0];
      setImageUri(asset.uri);
      setMime(asset.mimeType ?? 'image/jpeg');
    }
  }

  async function upload() {
    if (!parUrl) return Alert.alert('Missing PAR URL', 'Paste your OCI PAR URL first.');
    if (!imageUri) return Alert.alert('No image', 'Pick an image first.');
    try {
      setBusy(true);
      const resp = await fetch(imageUri);
      const blob = await resp.blob();
      const arrayBuffer = await blob.arrayBuffer();
      await putToParUrl(parUrl, arrayBuffer, mime);
      Alert.alert('Success', 'Uploaded to OCI via PAR.');
    } catch (e) {
      Alert.alert('Upload failed', String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DearBaby • Snack Upload</Text>
      <TextInput placeholder="Paste PAR URL here" value={parUrl} onChangeText={setParUrl} style={styles.input} autoCapitalize="none" />
      <View style={{ height: 12 }} />
      {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: 220, borderRadius: 12 }} /> : <Text style={styles.placeholder}>No image selected</Text>}
      <View style={{ height: 12 }} />
      {busy ? <ActivityIndicator /> : <Text onPress={pickImage} style={styles.button}>Pick Image</Text>}
      <View style={{ height: 8 }} />
      <Text onPress={upload} style={[styles.button, (!parUrl || !imageUri || busy) && styles.disabled]}>Upload</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f3f4f6' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 },
  placeholder: { textAlign: 'center', color: '#6b7280' },
  button: { backgroundColor: '#111827', color: 'white', paddingVertical: 12, textAlign: 'center', borderRadius: 12, fontWeight: '700' },
  disabled: { opacity: 0.5 }
});
