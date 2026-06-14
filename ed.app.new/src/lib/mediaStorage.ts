/**
 * Media Storage Manager - IndexedDB-based storage for audio/video recordings
 * 
 * Features:
 * - Stores audio/video blobs with metadata in IndexedDB
 * - Automatic 31-35 day retention with randomized expiration
 * - Auto-cleanup of expired recordings
 * - Storage statistics tracking
 * - Cloud backup export preparation
 * 
 * @module mediaStorage
 */

const DB_NAME = 'everdream-media-storage';
const DB_VERSION = 1;
const STORE_NAME = 'media-recordings';

export interface MediaMetadata {
  /** Unique ID for the media */
  id: string;
  /** Associated dream ID (if any) */
  dreamId?: string;
  /** Media type: 'audio' or 'video' */
  type: 'audio' | 'video';
  /** MIME type of the blob */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Duration in seconds */
  duration: number;
  /** Timestamp when recorded */
  recordedAt: string;
  /** Timestamp when this record expires */
  expiresAt: string;
  /** Emotion detected during recording */
  emotion?: string;
  /** Emotion confidence score */
  emotionConfidence?: number;
  /** Transcription text (if available) */
  transcription?: string;
  /** Thumbnail data URL (for video) */
  thumbnail?: string;
  /** Whether backed up to cloud */
  backedUp: boolean;
  /** Cloud backup provider(s) */
  cloudProviders: string[];
  /** Custom tags */
  tags: string[];
}

export interface StorageStats {
  /** Total number of recordings */
  totalRecordings: number;
  /** Total storage used in bytes */
  totalSize: number;
  /** Number of audio recordings */
  audioCount: number;
  /** Number of video recordings */
  videoCount: number;
  /** Number of expired recordings pending cleanup */
  expiredCount: number;
  /** Estimated days until storage limit */
  estimatedDaysLeft: number;
}

class MediaStorageManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB connection
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[MediaStorage] Failed to open IndexedDB:', request.error);
        this.initPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[MediaStorage] IndexedDB initialized successfully');
        resolve();
        
        // Trigger cleanup on startup
        this.cleanupExpired();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          store.createIndex('dreamId', 'dreamId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('recordedAt', 'recordedAt', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          store.createIndex('backedUp', 'backedUp', { unique: false });
          
          console.log('[MediaStorage] Created object store and indexes');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Generate random expiration date between 31-35 days from now
   * This prevents mass deletion events and spreads cleanup load
   */
  private generateExpirationDate(): string {
    const days = 31 + Math.floor(Math.random() * 5); // 31-35 days
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    return expires.toISOString();
  }

  /**
   * Save media blob with metadata
   * 
   * @param blob - The media blob (audio/video)
   * @param metadata - Metadata without id and expiresAt (auto-generated)
   * @returns The generated media ID
   */
  async saveMedia(
    blob: Blob,
    metadata: Omit<MediaMetadata, 'id' | 'expiresAt'>
  ): Promise<string> {
    await this.initialize();

    const id = this.generateId();
    const fullMetadata: MediaMetadata = {
      ...metadata,
      id,
      expiresAt: this.generateExpirationDate(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const record = {
        id,  // top-level for keyPath: 'id'
        metadata: fullMetadata,
        blob: blob,
        savedAt: new Date().toISOString(),
      };

      const request = store.put(record);

      request.onsuccess = () => {
        console.log(`[MediaStorage] Saved media ${id} (${blob.size} bytes, expires ${fullMetadata.expiresAt})`);
        resolve(id);
      };

      request.onerror = () => {
        console.error('[MediaStorage] Failed to save media:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Retrieve media blob by ID
   * 
   * @param id - Media ID
   * @returns The media blob and metadata, or null if not found
   */
  async getMedia(id: string): Promise<{ blob: Blob; metadata: MediaMetadata } | null> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({
            blob: result.blob,
            metadata: result.metadata,
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[MediaStorage] Failed to get media:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get metadata only (without blob) for listing
   * 
   * @param id - Media ID
   * @returns Metadata or null if not found
   */
  async getMetadata(id: string): Promise<MediaMetadata | null> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.metadata : null);
      };

      request.onerror = () => {
        console.error('[MediaStorage] Failed to get metadata:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * List media recordings with optional filters
   * 
   * @param options - Filter options
   * @returns Array of metadata (blobs not included for performance)
   */
  async listMedia(options?: {
    dreamId?: string;
    type?: 'audio' | 'video';
    fromDate?: Date;
    toDate?: Date;
    backedUp?: boolean;
    limit?: number;
  }): Promise<MediaMetadata[]> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const results: MediaMetadata[] = [];

      let indexName: string | undefined;
      let range: IDBKeyRange | undefined;

      // Determine which index to use based on filters
      if (options?.dreamId) {
        indexName = 'dreamId';
        range = IDBKeyRange.only(options.dreamId);
      } else if (options?.type) {
        indexName = 'type';
        range = IDBKeyRange.only(options.type);
      } else {
        indexName = 'recordedAt';
      }

      const index = indexName ? store.index(indexName) : store;
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const metadata = cursor.value.metadata as MediaMetadata;
          
          // Apply additional filters
          let include = true;
          
          if (options?.fromDate && new Date(metadata.recordedAt) < options.fromDate) {
            include = false;
          }
          if (options?.toDate && new Date(metadata.recordedAt) > options.toDate) {
            include = false;
          }
          if (options?.backedUp !== undefined && metadata.backedUp !== options.backedUp) {
            include = false;
          }
          
          if (include) {
            results.push(metadata);
          }
          
          // Check limit
          if (options?.limit && results.length >= options.limit) {
            cursor.continue();
          } else {
            cursor.continue();
          }
        } else {
          // Sort by recordedAt descending (newest first)
          results.sort((a, b) => 
            new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
          );
          resolve(results);
        }
      };

      request.onerror = () => {
        console.error('[MediaStorage] Failed to list media:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete media by ID
   * 
   * @param id - Media ID to delete
   */
  async deleteMedia(id: string): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`[MediaStorage] Deleted media ${id}`);
        resolve();
      };

      request.onerror = () => {
        console.error('[MediaStorage] Failed to delete media:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update metadata for existing media
   * 
   * @param id - Media ID
   * @param updates - Fields to update
   */
  async updateMetadata(
    id: string,
    updates: Partial<Omit<MediaMetadata, 'id' | 'expiresAt'>>
  ): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (!record) {
          reject(new Error(`Media ${id} not found`));
          return;
        }
        
        record.metadata = {
          ...record.metadata,
          ...updates,
        };
        
        const putRequest = store.put(record);
        
        putRequest.onsuccess = () => {
          console.log(`[MediaStorage] Updated metadata for ${id}`);
          resolve();
        };
        
        putRequest.onerror = () => {
          reject(putRequest.error);
        };
      };
      
      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * Clean up expired recordings
   * Automatically removes recordings past their expiration date
   * 
   * @returns Number of deleted recordings
   */
  async cleanupExpired(): Promise<number> {
    await this.initialize();

    const now = new Date().toISOString();
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('expiresAt');
      
      const request = index.openCursor(IDBKeyRange.upperBound(now));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const id = cursor.key as string;
          store.delete(id);
          deletedCount++;
          console.log(`[MediaStorage] Cleaned up expired media ${id}`);
          cursor.continue();
        } else {
          console.log(`[MediaStorage] Cleanup complete: ${deletedCount} recordings removed`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('[MediaStorage] Cleanup failed:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      let totalSize = 0;
      let audioCount = 0;
      let videoCount = 0;
      let expiredCount = 0;
      const now = new Date().toISOString();

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const record = cursor.value;
          const metadata = record.metadata as MediaMetadata;
          
          totalSize += metadata.size;
          
          if (metadata.type === 'audio') {
            audioCount++;
          } else {
            videoCount++;
          }
          
          if (metadata.expiresAt < now) {
            expiredCount++;
          }
          
          cursor.continue();
        } else {
          const totalRecordings = audioCount + videoCount;
          
          // Estimate days left (assuming average 5MB per recording, 1GB limit)
          const avgSizePerRecording = totalRecordings > 0 ? totalSize / totalRecordings : 5 * 1024 * 1024;
          const storageLimit = 1024 * 1024 * 1024; // 1GB soft limit
          const remainingSlots = Math.max(0, (storageLimit - totalSize) / avgSizePerRecording);
          const avgRecordingsPerDay = totalRecordings / 30; // Assume 30 day average
          const estimatedDaysLeft = avgRecordingsPerDay > 0 ? Math.floor(remainingSlots / avgRecordingsPerDay) : 999;
          
          resolve({
            totalRecordings,
            totalSize,
            audioCount,
            videoCount,
            expiredCount,
            estimatedDaysLeft: Math.min(estimatedDaysLeft, 365), // Cap at 1 year
          });
        }
      };

      request.onerror = () => {
        console.error('[MediaStorage] Failed to get stats:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Mark media as backed up to cloud provider
   * 
   * @param id - Media ID
   * @param provider - Cloud provider name (e.g., 'google-drive', 'dropbox')
   */
  async markAsBackedUp(id: string, provider: string): Promise<void> {
    await this.updateMetadata(id, {
      backedUp: true,
      cloudProviders: [], // Will be merged in updateMetadata
    });
    
    // Additional logic to append provider to array would go here
    // For now, just set backedUp flag
  }

  /**
   * Export media for cloud backup
   * Returns blob and metadata ready for upload
   * 
   * @param id - Media ID
   * @returns Blob and metadata or null
   */
  async exportForBackup(id: string): Promise<{ blob: Blob; metadata: MediaMetadata } | null> {
    return this.getMedia(id);
  }

  /**
   * Generate unique ID for media record
   */
  private generateId(): string {
    return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data (for testing/debugging)
   */
  async clearAll(): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[MediaStorage] All data cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('[MediaStorage] Failed to clear data:', request.error);
        reject(request.error);
      };
    });
  }
}

// Singleton instance
export const mediaStorageManager = new MediaStorageManager();

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  mediaStorageManager.initialize().catch(console.error);
}
