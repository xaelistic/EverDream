import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, ActivityIndicator, Button, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Network from 'expo-network';
import { StatusBar } from 'expo-status-bar';

const DEV_PORT = 5173;
const ALT_PORT = 8082;

export default function App() {
  const [urlCandidates, setUrlCandidates] = useState<string[]>([]);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveUrl() {
      const urls: string[] = [];

      if (Platform.OS === 'web') {
        urls.push(`http://localhost:${DEV_PORT}`);
      } else {
        try {
          const ipAddress = await Network.getIpAddressAsync();
          if (ipAddress) {
            urls.push(`http://${ipAddress}:${DEV_PORT}`);
          }
        } catch {
          // ignore, fallback to localhost variants
        }

        urls.push(`http://10.0.2.2:${DEV_PORT}`);
        urls.push(`http://localhost:${DEV_PORT}`);
        urls.push(`http://localhost:${ALT_PORT}`);
      }

      setUrlCandidates(urls);
      setCurrentUrlIndex(0);
      setLoading(false);
    }

    resolveUrl();
  }, []);

  const demoUrl = useMemo(() => urlCandidates[currentUrlIndex] ?? `http://localhost:${DEV_PORT}`, [urlCandidates, currentUrlIndex]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4b5563" />
          <Text style={styles.message}>Detecting local network...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.message}>Open the demo in a browser at:</Text>
          <Text style={styles.code}>{demoUrl}</Text>
          <Button title="Open in browser" onPress={() => Linking.openURL(demoUrl)} />
          {urlCandidates.length > 1 && currentUrlIndex < urlCandidates.length - 1 ? (
            <Button
              title="Try next fallback port"
              onPress={() => {
                setError(null);
                setCurrentUrlIndex((idx) => Math.min(idx + 1, urlCandidates.length - 1));
              }}
            />
          ) : null}
        </View>
      ) : (
        <WebView
          source={{ uri: demoUrl }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#4b5563" />
              <Text style={styles.message}>Loading demo from {demoUrl}</Text>
            </View>
          )}
          onError={({ nativeEvent }) => {
            if (currentUrlIndex + 1 < urlCandidates.length) {
              setCurrentUrlIndex((idx) => idx + 1);
              setError(null);
            } else {
              setError(`WebView load failed: ${nativeEvent.description}`);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f6f0',
  },
  webview: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    marginTop: 16,
    textAlign: 'center',
    color: '#334155',
    fontSize: 16,
  },
  error: {
    marginBottom: 12,
    textAlign: 'center',
    color: '#b91c1c',
    fontSize: 16,
    fontWeight: '600',
  },
  code: {
    marginVertical: 12,
    color: '#0f172a',
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 12,
  },
});
