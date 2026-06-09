# Voice/Video Memo Playback Implementation

## Overview

This document provides a complete technical reference for the Voice/Video Memo Playback feature implementation in the EverDream dream journal application. The feature enables users to record, save, playback, and backup their dream recordings (both audio and video) with automatic retention management.

## Core Capabilities

- **Record & Save**: All audio/video automatically saved locally in IndexedDB
- **Playback**: Users can hear emotion, pauses, and breathlessness in their voice
- **31-35 Day Retention**: Randomized expiration per recording to avoid mass deletion
- **Cloud Backup Ready**: Integration hooks for Google Drive, iCloud, OneDrive, Dropbox
- **Privacy-First**: Everything stored locally by default, explicit opt-in for cloud
- **Auto-Cleanup**: Expired recordings automatically deleted

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EverDream Application                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐         ┌──────────────────┐                  │
│  │ VideoCaptureFlow │         │ AudioRecorder    │                  │
│  │ (Video Record)   │         │ (Audio Record)   │                  │
│  └────────┬─────────┘         └────────┬─────────┘                  │
│           │                             │                             │
│           │ video blob                  │ audio blob                  │
│           ▼                             ▼                             │
│  ┌─────────────────────────────────────────────────┐                 │
│  │          mediaStorageManager                     │                 │
│  │  ┌───────────────────────────────────────────┐  │                 │
│  │  │           IndexedDB                        │  │                 │
│  │  │  ┌─────────────────────────────────────┐  │  │                 │
│  │  │  │  media-recordings (object store)    │  │  │                 │
│  │  │  │  - id (key)                         │  │  │                 │
│  │  │  │  - metadata                         │  │  │                 │
│  │  │  │  - blob                             │  │  │                 │
│  │  │  │  - savedAt                          │  │  │                 │
│  │  │  └─────────────────────────────────────┘  │  │                 │
│  │  │                                            │  │                 │
│  │  │  Indexes:                                  │  │                 │
│  │  │  - dreamId                                │  │                 │
│  │  │  - type                                   │  │                 │
│  │  │  - recordedAt                             │  │                 │
│  │  │  - expiresAt                              │  │                 │
│  │  │  - backedUp                               │  │                 │
│  │  └───────────────────────────────────────────┘  │                 │
│  └─────────────────────────────────────────────────┘                 │
│           │                                                           │
│           │ load/list/delete                                          │
│           ▼                                                           │
│  ┌──────────────────┐         ┌──────────────────┐                  │
│  │ useMediaPlayback │◄────────│ MediaPlayback    │                  │
│  │ (React Hook)     │         │ (UI Component)   │                  │
│  └──────────────────┘         └──────────────────┘                  │
│           │                             │                             │
│           │                             │ playback                    │
│           │                             ▼                             │
│           │                    ┌──────────────────┐                  │
│           │                    │ Cloud Backup     │                  │
│           │                    │ Providers        │                  │
│           │                    │ - Google Drive   │                  │
│           │                    │ - iCloud         │                  │
│           │                    │ - OneDrive       │                  │
│           │                    │ - Dropbox        │                  │
│           │                    └──────────────────┘                  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Data Flow

### 1. Recording Flow

#### Video Recording
```typescript
// User starts recording in VideoCaptureFlow
VideoCaptureFlow.startRecording()
  ├─> Request camera/microphone permissions
  ├─> Create MediaRecorder with stream
  ├─> Collect chunks every 1000ms
  └─> Update UI timer

// User stops recording
VideoCaptureFlow.stopRecording()
  ├─> Stop MediaRecorder
  ├─> onstop event fires
  │   ├─> Create Blob from chunks
  │   ├─> Generate thumbnail from video
  │   ├─> Call mediaStorageManager.saveMedia()
  │   │   ├─> Generate unique ID
  │   │   ├─> Set random expiration (31-35 days)
  │   │   ├─> Store in IndexedDB
  │   │   └─> Return media ID
  │   └─> Call onComplete() with video data
  └─> Processing UI shown during save
```

#### Audio Recording
```typescript
// User starts recording via AudioRecorder
audioRecorderManager.start()
  ├─> Request microphone permission
  ├─> Setup Web Audio API context
  ├─> Create analyser and processor nodes
  └─> Begin feature extraction

// User stops recording
audioRecorderManager.stop(dreamId, emotion, confidence)
  ├─> Stop audio processing
  ├─> Get raw audio buffer
  ├─> Release microphone stream
  ├─> If storeRawAudio enabled:
  │   ├─> Encode as WAV
  │   ├─> Call mediaStorageManager.saveMedia()
  │   └─> Return media ID
  └─> Clear buffer
```

### 2. Storage Flow

```typescript
mediaStorageManager.saveMedia(blob, metadata)
  ├─> Ensure IndexedDB initialized
  ├─> Generate unique ID: `media_${timestamp}_${random}`
  ├─> Generate expiration date (31-35 days random)
  ├─> Create record object:
  │   {
  │     metadata: { id, type, mimeType, size, duration, 
  │                 recordedAt, expiresAt, emotion, ... },
  │     blob: Blob,
  │     savedAt: ISO timestamp
  │   }
  ├─> Open readwrite transaction
  ├─> Put record in object store
  └─> Return media ID

// Automatic cleanup on initialization
mediaStorageManager.initialize()
  └─> Trigger cleanupExpired()
      ├─> Query all records where expiresAt < now
      ├─> Delete each expired record
      └─> Log count of removed recordings
```

### 3. Playback Flow

```typescript
// Component mounts with useMediaPlayback hook
useMediaPlayback({ dreamId?, type? })
  ├─> Auto-load media list on mount
  │   └─> mediaStorageManager.listMedia(filters)
  ├─> Load storage stats
  │   └─> mediaStorageManager.getStats()
  └─> Run cleanup on mount

// User selects media for playback
selectMedia(mediaId)
  ├─> Set selectedMediaId state
  └─> MediaPlayback component loads blob

MediaPlayback component
  ├─> Call getBlob(mediaId)
  │   └─> mediaStorageManager.getMedia(id)
  │       └─> Return { blob, metadata }
  ├─> Create object URL from blob
  ├─> Render AudioPlayer or VideoPlayer
  │   ├─> Play/pause controls
  │   ├─> Progress bar with seek
  │   ├─> Volume controls (audio only)
  │   └─> Time display
  └─> Show emotion badge, transcription, actions

// Cleanup on unmount
useEffect cleanup
  └─> Revoke object URL to free memory
```

### 4. Cleanup Flow

```typescript
// Automatic cleanup on app startup
mediaStorageManager.cleanupExpired()
  ├─> Open cursor on expiresAt index
  ├─> Query range: IDBKeyRange.upperBound(now)
  ├─> For each expired record:
  │   ├─> Delete from store
  │   └─> Increment counter
  └─> Log total deleted count

// Randomized expiration prevents mass deletion
generateExpirationDate()
  ├─> days = 31 + Math.floor(Math.random() * 5)
  ├─> expires = now + days
  └─> Return ISO string
```

### 5. Cloud Backup Flow

```typescript
// User initiates backup
MediaPlayback.onBackup(mediaId, providerId)
  ├─> Set isBackingUp state
  ├─> Export media for backup
  │   └─> mediaStorageManager.exportForBackup(id)
  │       └─> Return { blob, metadata }
  ├─> Mock upload process (1.5s delay)
  ├─> Mark as backed up
  │   └─> mediaStorageManager.markAsBackedUp(id, provider)
  │       └─> Update metadata.backedUp = true
  ├─> Update provider connection status
  └─> Refresh media list

// Production implementation would:
// 1. Check OAuth token for provider
// 2. Upload blob to provider API
// 3. Store remote file ID/reference
// 4. Update metadata with backup info
```

---

## Implementation Details

### File: `/src/lib/mediaStorage.ts`

**Purpose**: IndexedDB-based media storage manager

**Key Classes & Interfaces**:
- `MediaMetadata`: Complete metadata schema for recordings
- `StorageStats`: Storage statistics interface
- `MediaStorageManager`: Main storage class

**Core Methods**:

| Method | Purpose | Returns |
|--------|---------|---------|
| `initialize()` | Open IndexedDB connection | `Promise<void>` |
| `saveMedia(blob, metadata)` | Store media with metadata | `Promise<string>` (media ID) |
| `getMedia(id)` | Retrieve blob and metadata | `Promise<{blob, metadata} \| null>` |
| `listMedia(options?)` | List with filters | `Promise<MediaMetadata[]>` |
| `deleteMedia(id)` | Remove recording | `Promise<void>` |
| `updateMetadata(id, updates)` | Update metadata fields | `Promise<void>` |
| `cleanupExpired()` | Remove expired recordings | `Promise<number>` (count) |
| `getStats()` | Get storage statistics | `Promise<StorageStats>` |
| `markAsBackedUp(id, provider)` | Mark as backed up | `Promise<void>` |
| `exportForBackup(id)` | Export for cloud backup | `Promise<{blob, metadata} \| null>` |

**IndexedDB Schema**:
```javascript
Database: 'everdream-media-storage'
Version: 1

Object Store: 'media-recordings'
  Key Path: 'id'
  
Indexes:
  - dreamId (multiEntry: false)
  - type (multiEntry: false)
  - recordedAt (multiEntry: false)
  - expiresAt (multiEntry: false)
  - backedUp (multiEntry: false)

Record Structure:
{
  metadata: MediaMetadata,
  blob: Blob,
  savedAt: ISO timestamp
}
```

**Retention Algorithm**:
```typescript
private generateExpirationDate(): string {
  const days = 31 + Math.floor(Math.random() * 5); // 31-35 days
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires.toISOString();
}
```

### File: `/src/hooks/useMediaPlayback.ts`

**Purpose**: React hook for media state management

**Interfaces**:
- `UseMediaPlaybackOptions`: Configuration options
- `CloudBackupProvider`: Cloud provider definition
- `MediaPlaybackState`: State shape
- `MediaPlaybackActions`: Action methods

**State Management**:
```typescript
const [mediaList, setMediaList] = useState<MediaMetadata[]>([]);
const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
const [playingMediaId, setPlayingMediaId] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [stats, setStats] = useState<StorageStats | null>(null);
const [cloudProviders, setCloudProviders] = useState<CloudBackupProvider[]>(...);
const [isBackingUp, setIsBackingUp] = useState(false);
```

**Default Cloud Providers**:
```typescript
[
  { id: 'google-drive', name: 'Google Drive', icon: '📁', color: '#4285F4' },
  { id: 'icloud', name: 'iCloud', icon: '☁️', color: '#007AFF' },
  { id: 'onedrive', name: 'OneDrive', icon: '💠', color: '#0078D4' },
  { id: 'dropbox', name: 'Dropbox', icon: '📦', color: '#0061FF' },
]
```

### File: `/src/components/media/MediaPlayback.tsx`

**Purpose**: Beautiful media player UI component

**Sub-components**:
1. `AudioPlayer`: Audio playback with controls
2. `VideoPlayer`: Video playback with overlay controls
3. `CloudBackupSelector`: Provider selection dropdown
4. `MediaPlayback`: Main component

**Features**:
- Glassmorphism design matching app aesthetic
- Emotion badge with color coding
- Progress bar with seek functionality
- Volume controls (audio)
- Auto-hiding controls (video)
- Transcription preview
- Cloud backup button
- Delete confirmation

**Emotion Colors**:
```typescript
{
  neutral: 'bg-gray-500/30 text-gray-200',
  sleepy: 'bg-indigo-500/30 text-indigo-200',
  calm: 'bg-emerald-500/30 text-emerald-200',
  anxious: 'bg-amber-500/30 text-amber-200',
  excited: 'bg-rose-500/30 text-rose-200',
  happy: 'bg-yellow-500/30 text-yellow-200',
  sad: 'bg-blue-500/30 text-blue-200',
  fearful: 'bg-purple-500/30 text-purple-200',
}
```

### Modified Files

#### `/src/modules/sleep/audioRecorder.ts`

**Changes**:
1. Added import for `mediaStorageManager`
2. Changed `stop()` to async method returning media ID
3. Added auto-save to IndexedDB when recording stops
4. Pass emotion metadata with recording

**New Signature**:
```typescript
async stop(
  dreamId?: string,
  emotion?: string,
  emotionConfidence?: number
): Promise<string | null>
```

#### `/src/components/capture/VideoCaptureFlow.tsx`

**Changes**:
1. Added import for `mediaStorageManager`
2. Added `savedMediaId` state
3. Auto-save video to IndexedDB in `recorder.onstop`
4. Include emotion metadata with video

---

## Security & Privacy

### Local-First Approach
- All media stored locally in IndexedDB by default
- No automatic cloud uploads without explicit consent
- User controls retention and deletion

### Data Isolation
- Each recording has unique ID
- No cross-contamination between users (single-user app)
- IndexedDB sandboxed per origin

### Consent Requirements
```typescript
// Audio recording requires explicit consent
config.storeRawAudio = false; // Default off

// Must be enabled explicitly:
await audioRecorderManager.start({ storeRawAudio: true });
```

### Cleanup Transparency
- Users informed of 31-35 day retention
- Expired recordings automatically deleted
- Manual delete always available

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| MediaRecorder | ✅ | ✅ | ✅ | ✅ |
| Web Audio API | ✅ | ✅ | ✅ | ✅ |
| Object URLs | ✅ | ✅ | ✅ | ✅ |
| Video Thumbnails | ✅ | ✅ | ✅ | ✅ |

**Minimum Versions**:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

---

## Future Enhancements

### Planned Features
1. **Real Cloud Integration**: OAuth flows for actual cloud providers
2. **Background Sync**: Queue backups for when online
3. **Compression**: Optional compression before storage
4. **Search Transcriptions**: Full-text search of transcribed content
5. **Sharing**: Secure sharing links for specific recordings
6. **Playlists**: Group recordings into themed collections
7. **Analytics**: Listening patterns, most-played dreams

### Performance Optimizations
1. **Lazy Loading**: Load blobs only when needed for playback
2. **Thumbnail Caching**: Cache generated thumbnails
3. **Batch Operations**: Bulk delete/export operations
4. **Storage Quotas**: Warn when approaching browser limits

---

## Troubleshooting

### Common Issues

#### "IndexedDB open failed"
**Cause**: Browser privacy settings blocking IndexedDB
**Solution**: Check browser settings, ensure not in incognito mode

#### "Media not found"
**Cause**: Recording expired or was deleted
**Solution**: Check expiration date, verify media still exists

#### "Playback fails"
**Cause**: Blob URL revoked or corrupted
**Solution**: Reload component, check console for errors

#### "Cleanup not running"
**Cause**: App never initializes media storage
**Solution**: Ensure `mediaStorageManager.initialize()` is called

### Debug Mode

Enable verbose logging:
```typescript
// In browser console
localStorage.setItem('everdream-debug', 'true');
```

### Storage Inspection

View stored recordings:
```typescript
// In browser console
const stats = await mediaStorageManager.getStats();
console.log(stats);

const media = await mediaStorageManager.listMedia();
console.log(media);
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('mediaStorageManager', () => {
  it('should save and retrieve media', async () => {
    const blob = new Blob(['test'], { type: 'audio/wav' });
    const id = await mediaStorageManager.saveMedia(blob, {...});
    const result = await mediaStorageManager.getMedia(id);
    expect(result).toBeDefined();
    expect(result?.blob).toEqual(blob);
  });
  
  it('should cleanup expired recordings', async () => {
    // Create expired recording
    // Run cleanup
    // Verify deletion
  });
});
```

### Integration Tests
- End-to-end recording flow
- Playback across components
- Cloud backup mock integration

### Manual Testing Checklist
- [ ] Record audio successfully
- [ ] Record video successfully
- [ ] Playback audio
- [ ] Playback video
- [ ] Seek through media
- [ ] Adjust volume
- [ ] Delete recording
- [ ] Verify expiration (mock time)
- [ ] Cloud backup UI flow

---

## Usage Examples

### Basic Recording & Playback

```typescript
import { audioRecorderManager } from './modules/sleep/audioRecorder';
import { mediaStorageManager } from './lib/mediaStorage';
import { useMediaPlayback } from './hooks/useMediaPlayback';
import { MediaPlayback } from './components/media/MediaPlayback';

// Record audio
async function recordDream() {
  await audioRecorderManager.start({ storeRawAudio: true });
  
  // ... user speaks ...
  
  const mediaId = await audioRecorderManager.stop(
    dreamId,
    'sleepy',
    0.85
  );
  
  return mediaId;
}

// Use in component
function DreamJournal() {
  const {
    mediaList,
    selectedMediaId,
    selectMedia,
    getBlob,
    deleteMedia,
    backupToCloud,
    cloudProviders,
    isBackingUp,
  } = useMediaPlayback({ type: 'audio' });
  
  return (
    <div>
      {mediaList.map(media => (
        <div key={media.id} onClick={() => selectMedia(media.id)}>
          {media.emotion} - {new Date(media.recordedAt).toLocaleDateString()}
        </div>
      ))}
      
      {selectedMediaId && (
        <MediaPlayback
          metadata={mediaList.find(m => m.id === selectedMediaId)!}
          getBlob={getBlob}
          onDelete={deleteMedia}
          onBackup={backupToCloud}
          cloudProviders={cloudProviders}
          isBackingUp={isBackingUp}
        />
      )}
    </div>
  );
}
```

### Advanced Filtering

```typescript
// Get videos from last 7 days
const weekAgo = new Date();
weekAgo.setDate(weekAgo.getDate() - 7);

const recentVideos = await mediaStorageManager.listMedia({
  type: 'video',
  fromDate: weekAgo,
});

// Get unbacked up recordings
const needsBackup = await mediaStorageManager.listMedia({
  backedUp: false,
});

// Get by dream ID
const dreamMedia = await mediaStorageManager.listMedia({
  dreamId: 'dream_12345',
});
```

---

## Conclusion

The Voice/Video Memo Playback implementation provides a robust, privacy-first solution for dream recording storage and playback. The modular architecture allows for easy extension while maintaining clean separation of concerns between storage, state management, and UI components.

**Key Strengths**:
- ✅ Automatic local storage with no configuration
- ✅ Intelligent retention management
- ✅ Beautiful, accessible UI
- ✅ Cloud-ready architecture
- ✅ Comprehensive error handling
- ✅ TypeScript type safety throughout

**Next Steps**:
1. Implement real OAuth flows for cloud providers
2. Add compression for storage optimization
3. Build background sync for offline scenarios
4. Create admin dashboard for storage management
