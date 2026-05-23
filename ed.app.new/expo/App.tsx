import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Network from 'expo-network';
import { StatusBar } from 'expo-status-bar';

const FALLBACK_URL = 'http://localhost:5173';

export default function App() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    detectLocalServer();
  }, []);

  async function detectLocalServer() {
    try {
      const ip = await Network.getIpAddressAsync();
      if (ip) {
        // Replace last octet pattern to get gateway
        const parts = ip.split('.');
        parts[parts.length - 1] = '1';
        const gateway = parts.join('.');
        setUrl(`http://${gateway}:5173`);
      } else {
        setUrl(FALLBACK_URL);
      }
    } catch {
      setUrl(FALLBACK_URL);
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Text style={styles.error}>Unable to connect</Text>
        <Text style={styles.hint}>Make sure the web app is running on your local network:</Text>
        <Text style={styles.url}>{url || FALLBACK_URL}</Text>
        <TouchableOpacity style={styles.button} onPress={detectLocalServer}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => Linking.openURL('http://localhost:5173')}>
          <Text style={styles.buttonText}>Open in Browser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!url) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.hint}>Detecting local server...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          setError(nativeEvent.description);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          if (nativeEvent.statusCode >= 404) {
            setError(`Server returned ${nativeEvent.statusCode}`);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  webview: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a', padding: 24 },
  error: { color: '#ef4444', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  hint: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  url: { color: '#8b5cf6', fontSize: 16, fontFamily: 'monospace', marginBottom: 20 },
  button: { backgroundColor: '#8b5cf6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, marginBottom: 12, minWidth: 200, alignItems: 'center' },
  secondaryButton: { backgroundColor: '#334155' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
