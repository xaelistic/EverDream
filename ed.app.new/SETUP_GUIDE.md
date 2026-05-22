# EverDream MVP - Setup & Testing Guide

## ✅ What's Been Completed

### 1. Dependencies Installed
- `@supabase/supabase-js` - Supabase client
- `vite-plugin-pwa` - PWA support with offline caching
- `workbox-window` - Service worker management

### 2. PWA Configuration
- **vite.config.ts** - Configured with VitePWA plugin
  - Auto-update registration
  - Offline caching for images (Unsplash)
  - Manifest generation
- **public/manifest.json** - App manifest with icons
- **index.html** - Already has PWA meta tags

### 3. Supabase Integration
- **src/lib/supabase.ts** - Client setup with type definitions
- **src/lib/supabase-data.ts** - Data layer functions:
  - `saveDream()`, `getUserDreams()`, `deleteDream()`
  - `saveSettings()`, `getUserSettings()`
  - `saveSleepLog()`, `getUserSleepLogs()`
- **src/hooks/useAuth.ts** - Auth state management
- **src/components/AuthModal.tsx** - Login/signup UI
- **src/components/Shell.tsx** - Header with auth button
- **src/DreamJournalApp.tsx** - Integrated auth + data loading

### 4. Database Schema
- **supabase-schema.sql** - Complete schema with:
  - `profiles`, `dreams`, `sleep_logs`, `settings` tables
  - Row Level Security (RLS) policies
  - Triggers for auto-created profiles/settings
  - Indexes for performance

---

## 🚀 How to Test TODAY

### Step 1: Update .env with Your Supabase Credentials

Edit `/workspace/ed.app.new/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from your Coolify Supabase dashboard.

### Step 2: Run the SQL Schema

1. Open your Supabase SQL Editor
2. Copy entire contents of `supabase-schema.sql`
3. Paste and run

This creates all tables, policies, and triggers.

### Step 3: Start Development Server

Server is already running at: **http://localhost:5174/**

Or restart:
```bash
cd /workspace/ed.app.new
npm run dev -- --host
```

### Step 4: Test the App

#### In Browser (Desktop/Mobile)
1. Open http://localhost:5174/
2. Click "Sign In" in header
3. Create account or sign in
4. Record a dream entry
5. Refresh page - data persists!

#### Test PWA Installation
1. Open Chrome DevTools (F12)
2. Click "Application" tab
3. Check "Manifest" - should show EverDream info
4. Check "Service Workers" - should be registered
5. Click install icon in address bar (if available)

#### Test on Mobile (Same Network)
1. On phone, open: http://21.0.17.164:5174/
2. Add to Home Screen (iOS Safari / Android Chrome)
3. Opens as standalone app

---

## 📋 Test Checklist

- [ ] Sign up with email/password works
- [ ] Magic link login works
- [ ] Dream capture saves to Supabase
- [ ] Dreams load on refresh
- [ ] Settings persist across sessions
- [ ] Sign out clears session
- [ ] PWA installs on mobile
- [ ] App works offline (after first load)

---

## 🔧 Troubleshooting

### "User not authenticated" errors
→ Make sure you're signed in before saving dreams

### RLS policy errors
→ Verify SQL schema was run completely
→ Check that `auth.uid() = user_id` matches

### PWA not installing
→ Must be served over HTTPS in production
→ localhost works for testing
→ Check browser console for service worker errors

### Can't connect to Supabase
→ Verify .env has correct URL and key
→ Check Coolify Supabase is running
→ Ensure network access allowed

---

## 📁 File Structure Summary

```
ed.app.new/
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx      ← Login/signup UI
│   │   └── Shell.tsx          ← App frame with nav
│   ├── hooks/
│   │   └── useAuth.ts         ← Auth state hook
│   ├── lib/
│   │   ├── supabase.ts        ← Client config
│   │   └── supabase-data.ts   ← Data layer
│   ├── App.tsx                ← Root component
│   └── DreamJournalApp.tsx    ← Main app logic
├── public/
│   ├── manifest.json          ← PWA manifest
│   ├── icon-192.png           ← App icon
│   └── icon-512.png           ← App icon
├── .env                       ← Supabase credentials
├── vite.config.ts             ← PWA config
└── supabase-schema.sql        ← Database setup
```

---

## 🎯 Next Steps After Testing

1. **AI Integration** - Connect Anthropic API for dream analysis
2. **Image Generation** - Add DALL-E integration
3. **Wearable Sync** - Oura/Whoop API integration
4. **Deployment** - Build for production (`npm run build`)
5. **Mobile App** - Use Expo wrapper in `/expo` folder

---

**Ready to test! Update .env and run the SQL, then visit http://localhost:5174/** 🌙
