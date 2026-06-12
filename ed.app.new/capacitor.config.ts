import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.everdream.app',
  appName: 'EverDream',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For testing the native app against the Vite dev server (live reload on device):
    // 1. Run `npm run dev`
    // 2. Find your PC LAN IP (ipconfig)
    // 3. Uncomment below and replace with your IP, e.g. http://192.168.1.42:5173
    // url: 'http://192.168.1.XXX:5173',
    // cleartext: true,
  },
  plugins: {
    // LocalNotifications and PushNotifications will be configured in code
  },
};

export default config;