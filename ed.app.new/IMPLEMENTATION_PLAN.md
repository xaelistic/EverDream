# DreamScape Implementation Plan

## ✅ Completed Features

### 1. Onboarding Flow ✓
- **File**: `src/components/OnboardingFlow.tsx` (CREATED)
- Multi-step walkthrough with progress indicator
- Personalization quiz covering:
  - Goals selection (better dreams, lucid dreaming, self-discovery, etc.)
  - Experience level (beginner to expert)
  - Sleep schedule (bedtime/wake time for circadian rhythm)
  - Dream traditions (Jungian, Freudian, spiritual, etc.)
- All-in-one permission request (notifications, camera, mic, storage)
- Skip option available
- Progressive disclosure of features through guided steps

### 2. Authentication ✓
- **File**: `src/components/AuthModal.tsx` (UPDATED)
- Google OAuth integration
- Apple OAuth integration  
- Phone number authentication (OTP)
- Email/password authentication
- Magic link support
- Clean tabbed interface for auth method selection

---

## 🚧 To Implement

### 3. Push Notifications (Circadian-Based)
**Status**: Partially implemented in settings, needs actual implementation

**Required**:
- Install `expo-notifications` or use Web Push API
- Schedule morning reflection reminders (based on user's wake time from onboarding)
- Schedule evening wind-down reminders (based on user's bedtime from onboarding)
- Smart triggers based on wearable data when available
- Customizable notification preferences

**Files to modify**:
- `src/DreamJournalApp.tsx` - Add notification scheduling logic
- Create `src/lib/notifications.ts` - Notification service

---

### 4. Image Generation (Free API)
**Status**: Currently using Unsplash placeholders

**Required**:
- Integrate free tier of DALL-E 3 API via Anthropic Claude (already set up)
- OR use Stable Diffusion free API (Hugging Face Inference API)
- Generate dream images from AI-crafted prompts
- Cache generated images locally

**Files to modify**:
- `src/DreamJournalApp.tsx` - Update `generateDreamImage()` function

---

### 5. Video Thumbnail Generation
**Status**: Video capture exists but no thumbnail generation

**Required**:
- Extract frame from recorded video for thumbnail
- Display thumbnails in dream list
- Allow custom frame selection

**Files to modify**:
- `src/DreamJournalApp.tsx` - Add thumbnail extraction after video recording

---

### 6. Dream Collage / Mood Board
**Status**: Not implemented

**Required**:
- Create visual collage from multiple dream images
- Grid layout with dream metadata
- Shareable as single image
- Save to device home screen

**Files to create**:
- `src/components/DreamCollage.tsx` - Collage generator component
- `src/utils/collageGenerator.ts` - Canvas-based image composition

---

### 7. Facial Analysis & Prosody Detection
**Status**: Video capture exists but no analysis

**Required**:
- **Facial Analysis**: Use face-api.js (free, client-side) for emotion detection
- **Prosody/Voice Analysis**: Use Web Audio API for tone/mood detection
- Analyze facial expressions during video dream recording
- Detect voice pitch, tempo, and emotional tone
- Include analysis results in dream metadata

**Dependencies to add**:
- `face-api.js` - Client-side facial recognition
- Custom Web Audio API implementation

**Files to create**:
- `src/lib/facialAnalysis.ts` - Face emotion detection
- `src/lib/prosodyAnalysis.ts` - Voice mood analysis

---

### 8. Sketch/Drawing Input
**Status**: Not implemented

**Required**:
- Canvas-based drawing interface
- Multiple brush colors/sizes
- Save sketches as images
- Upload modal with options: Text / Image Upload / Sketch

**Files to create**:
- `src/components/SketchCanvas.tsx` - Drawing interface
- Modify upload button to show modal with 3 options

---

### 9. Home Screen Widgets
**Status**: Not implemented

**Required**:
- PWA widget for daily quote/reflection
- Widget showing last dream's generated image
- Quick capture button widget
- Instructions for adding to home screen (iOS/Android)

**Files to create**:
- `public/widget-quote.html` - Quote widget
- `public/widget-quick-capture.html` - Quick entry widget
- Update PWA manifest for widget support

---

### 10. Performance & Polish
**Status**: Not implemented

**Required**:
- **Skeleton loading states** - Add skeleton screens for all async content
- **Optimistic UI updates** - Update UI before server confirmation
- **Image lazy loading** - Use Intersection Observer
- **Pull-to-refresh** - For dream list
- **Infinite scroll** - Paginate dream history
- **Framer Motion animations** - Smooth transitions

**Dependencies to add**:
- `framer-motion` - Animation library

**Files to modify**:
- All list components - Add skeletons and infinite scroll
- `src/DreamJournalApp.tsx` - Add optimistic updates

---

### 11. Testing & Quality Assurance
**Status**: Not implemented

**Required**:
- **Unit Tests**: Jest/Vitest for utility functions
- **E2E Tests**: Playwright or Cypress
- **Error Tracking**: Sentry integration
- **Analytics**: Mixpanel or Plausible (privacy-focused)

**Dependencies to add**:
- `vitest` + `@testing-library/react` - Unit testing
- `@sentry/react` - Error tracking
- `plausible-tracker` - Analytics

**Files to create**:
- `src/__tests__/` - Test directory
- `vite.config.ts` - Add test configuration
- `src/lib/analytics.ts` - Analytics service
- `src/lib/errorTracking.ts` - Sentry setup

---

### 12. Security & Compliance
**Status**: GDPR export/delete partially implemented

**Required**:
- **Encrypted local storage** - Use `crypto-js` for sensitive data
- **Rate limiting** - API call throttling
- **Audit logs** - Track data access/modifications
- **Terms acceptance tracking** - Already implemented ✓
- **Secure session management** - Review Supabase config

**Dependencies to add**:
- `crypto-js` - Client-side encryption

**Files to modify**:
- `src/lib/storage.ts` - Add encryption layer
- `src/DreamJournalApp.tsx` - Add audit logging

---

### 13. Content Library
**Status**: Quotes hardcoded, no audio content

**Required**:
- **Quote database** - JSON file with 100+ quotes, categorized
- **Guided meditations** - Link to free meditation audio (YouTube/Spotify embeds or host MP3s)
- **Ambient soundscapes** - Free sounds from Freesound.org or similar
- **Educational content** - Articles about dream interpretation, sleep science

**Files to create**:
- `src/data/quotes.json` - Quote database
- `src/data/meditations.json` - Meditation library
- `src/data/educational.json` - Educational articles
- `src/components/MeditationPlayer.tsx` - Audio player

---

### 14. Wearable Integrations
**Status**: Simulated data only

**Required**:
- **Apple HealthKit** - React Native Health package (for Expo)
- **Google Fit** - React Native Google Fit
- **Oura API** - REST API integration (requires OAuth)
- **Fitbit API** - REST API integration
- **Whoop API** - REST API integration

**Implementation approach**:
- Start with manual CSV import from wearables
- Add OAuth flows for each service
- Normalize data to common schema

**Files to create**:
- `src/lib/wearables/appleHealth.ts`
- `src/lib/wearables/googleFit.ts`
- `src/lib/wearables/oura.ts`
- `src/lib/wearables/fitbit.ts`
- `src/lib/wearables/whoop.ts`

---

### 15. AI Enhancements
**Status**: Basic analysis implemented

**Required**:
- **Follow-up clarification questions** - Interactive verification after initial analysis
- **Multi-turn conversation** - Chat interface about dream meaning
- **Personal model learning** - Store user feedback to improve suggestions
- **Archetype pattern recognition** - Jungian archetype detection
- **Cross-cultural symbol interpretation** - Multi-cultural symbol database
- **Dream series detection** - Identify recurring themes across weeks/months

**Files to modify**:
- `src/DreamJournalApp.tsx` - Add interactive AI chat
- Create `src/lib/aiConversations.ts` - Multi-turn conversation manager
- Create `src/data/archetypes.json` - Jungian archetype database
- Create `src/data/symbols-cross-cultural.json` - Symbol interpretations

---

### 16. Monetization Infrastructure
**Status**: Not implemented

**Required**:
- **RevenueCat integration** (for mobile) OR **Stripe** (for web)
- **Subscription tiers**:
  - Free: Basic journaling, limited AI analysis (3/day)
  - Premium ($4.99/mo): Unlimited AI, advanced analytics, all integrations
  - Lifetime ($49.99): One-time purchase option
- **Usage tracking** - Count AI calls per day
- **Feature gating** - Lock premium features
- **Trial period** - 7-day free trial

**Files to create**:
- `src/lib/payments.ts` - Payment processing
- `src/components/PricingModal.tsx` - Subscription UI
- `src/hooks/useSubscription.ts` - Subscription state management

---

### 17. Discord Integration (Social/Community)
**Status**: Not implemented

**Required**:
- Discord bot for community sharing
- Optional: Share dreams to Discord channel
- Discord login as auth option (Supabase supports this)
- Community dream interpretation channels

**Note**: You mentioned "this is meant to be in discord" - clarify if you want:
- Just Discord community link in app?
- Full Discord integration for sharing?
- Discord bot that interacts with dream data?

**Files to create** (if full integration):
- `src/lib/discord.ts` - Discord API integration
- Discord bot code (separate repo)

---

## 📋 Implementation Priority

### Phase 1: Core Experience (Week 1-2)
1. ✅ Onboarding flow
2. ✅ Enhanced authentication
3. Push notifications
4. Real image generation (DALL-E 3 or Stable Diffusion)
5. Video thumbnails
6. Performance polish (skeletons, lazy loading)

### Phase 2: Rich Media (Week 3-4)
7. Dream collage/mood board
8. Sketch input
9. Facial analysis
10. Prosody/voice analysis
11. Home screen widgets
12. Content library (quotes, meditations)

### Phase 3: Intelligence (Week 5-6)
13. AI enhancements (multi-turn, archetypes)
14. Wearable integrations (start with manual import)
15. Advanced analytics visualizations

### Phase 4: Production Ready (Week 7-8)
16. Testing suite
17. Error tracking & analytics
18. Security hardening
19. Monetization infrastructure
20. Discord integration

---

## 🔧 Dependencies to Add

```json
{
  "dependencies": {
    "framer-motion": "^11.x",
    "face-api.js": "^0.22.x",
    "crypto-js": "^4.x",
    "@sentry/react": "^7.x",
    "plausible-tracker": "^0.x",
    "react-intersection-observer": "^9.x"
  },
  "devDependencies": {
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "@playwright/test": "^1.x"
  }
}
```

---

## 📝 Notes

- **Empty State**: This refers to UI shown when there's no content (e.g., "No dreams yet - start by recording your first dream!"). Should be added to all list views.
- **Progressive Disclosure**: Showing features gradually as users need them (implemented in onboarding).
- **Lock Screen Widgets**: You said you don't want lock screen quick capture, but DO want ability to save dream assets AS lock screen wallpaper - this is handled by device OS, we just provide "Save to Photos" functionality.
- **TouchID/FaceID**: You said it shouldn't need unlock - fair point for a journal app focused on ease of use.

---

## Next Immediate Actions

1. **Install new dependencies**
2. **Integrate push notifications**
3. **Set up real image generation API**
4. **Add video thumbnail extraction**
5. **Create sketch canvas component**
6. **Add facial analysis with face-api.js**
