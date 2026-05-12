# EverDream Expo Demo

This folder contains a lightweight Expo Go wrapper for the existing EverDream web app.

## How it works

- The app loads the web demo via a native `WebView`.
- It detects your machine's local IP and points the WebView at the Vite dev server running on port `5173`.

## Run the demo

1. Start the web app from the root project:
   ```bash
   cd ..
   npm run dev
   ```
2. In another terminal, start Expo:
   ```bash
   cd expo
   npm install
   npx expo start
   ```
3. Open the project in Expo Go on your phone.

## Notes

- The web app must be accessible from the mobile device on the same network.
- If local network discovery fails, the app will show the URL and let you open it in a browser instead.
