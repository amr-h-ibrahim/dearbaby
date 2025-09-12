import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../components/Button';
import { putToParUrl } from '../lib/storage';

export default function Upload() {
  const [parUrl, setParUrl] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mime, setMime] = useState<string>('image/jpeg');
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
      // Try to infer mime
      setMime(asset.mimeType ?? 'image/jpeg');
    }
  }

  async function upload() {
    if (!parUrl) return Alert.alert('Missing PAR URL', 'Paste your OCI PAR URL for the object first.');
    if (!imageUri) return Alert.alert('No image selected', 'Pick an image first.');
    try {
      setBusy(true);
      const resp = await fetch(imageUri);
      const blob = await resp.blob();
      const arrayBuffer = await blob.arrayBuffer();
      await putToParUrl(parUrl, arrayBuffer, mime);
      Alert.alert('Success', 'Uploaded to OCI via PAR.');
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload via OCI PAR</Text>
      <TextInput placeholder="Paste PAR URL here" value={parUrl} onChangeText={setParUrl} style={styles.input} autoCapitalize="none" />
      <View style={{ height: 12 }} />
      {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: 200, borderRadius: 12 }} /> : <Text style={styles.placeholder}>No image selected</Text>}
      <View style={{ height: 12 }} />
      {busy ? <ActivityIndicator /> : <Button title="Pick Image" onPress={pickImage} />}
      <View style={{ height: 8 }} />
      <Button title="Upload" onPress={upload} disabled={!parUrl || !imageUri || busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f3f4f6' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 },
  placeholder: { textAlign: 'center', color: '#6b7280' }
});
