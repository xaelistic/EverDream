/**
 * useMediaPlayback - React Hook for Media Playback Management
 * 
 * Provides state management and operations for audio/video playback
 * in the EverDream application. Handles loading, filtering, cloud backup,
 * and storage monitoring.
 * 
 * @module useMediaPlayback
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { mediaStorageManager, MediaMetadata, StorageStats } from '../lib/mediaStorage';

export interface UseMediaPlaybackOptions {
  /** Filter by dream ID */
  dreamId?: string;
  /** Filter by media type */
  type?: 'audio' | 'video';
  /** Auto-load media on mount */
  autoLoad?: boolean;
  /** Enable cloud backup integration */
  enableCloudBackup?: boolean;
}

export interface CloudBackupProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
}

export interface MediaPlaybackState {
  /** List of available media metadata */
  mediaList: MediaMetadata[];
  /** Currently selected media ID */
  selectedMediaId: string | null;
  /** Currently playing media ID */
  playingMediaId: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Storage statistics */
  stats: StorageStats | null;
  /** Available cloud backup providers */
  cloudProviders: CloudBackupProvider[];
  /** Whether backup is in progress */
  isBackingUp: boolean;
}

export interface MediaPlaybackActions {
  /** Load media list with optional filters */
  loadMedia: (options?: UseMediaPlaybackOptions) => Promise<void>;
  /** Select media for playback */
  selectMedia: (id: string) => void;
  /** Get media blob for playback */
  getMediaBlob: (id: string) => Promise<Blob | null>;
  /** Delete media */
  deleteMedia: (id: string) => Promise<void>;
  /** Backup media to cloud provider */
  backupToCloud: (mediaId: string, providerId: string) => Promise<void>;
  /** Refresh storage stats */
  refreshStats: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

const DEFAULT_CLOUD_PROVIDERS: CloudBackupProvider[] = [
  {
    id: 'google-drive',
    name: 'Google Drive',
    icon: '📁',
    color: '#4285F4',
    connected: false,
  },
  {
    id: 'icloud',
    name: 'iCloud',
    icon: '☁️',
    color: '#007AFF',
    connected: false,
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    icon: '💠',
    color: '#0078D4',
    connected: false,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: '📦',
    color: '#0061FF',
    connected: false,
  },
];

/**
 * Custom hook for managing media playback state and operations
 */
export function useMediaPlayback(options: UseMediaPlaybackOptions = {}): MediaPlaybackState & MediaPlaybackActions {
  const {
    dreamId,
    type,
    autoLoad = true,
    enableCloudBackup = true,
  } = options;

  // State
  const [mediaList, setMediaList] = useState<MediaMetadata[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [playingMediaId, setPlayingMediaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [cloudProviders, setCloudProviders] = useState<CloudBackupProvider[]>(DEFAULT_CLOUD_PROVIDERS);
  const [isBackingUp, setIsBackingUp] = useState(false);

  /**
   * Load media list from storage
   */
  const loadMedia = useCallback(async (loadOptions?: UseMediaPlaybackOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const filterOptions = {
        dreamId: loadOptions?.dreamId || dreamId,
        type: loadOptions?.type || type,
      };

      const media = await mediaStorageManager.listMedia(filterOptions);
      setMediaList(media);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load media';
      setError(errorMessage);
      console.error('[useMediaPlayback] Error loading media:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dreamId, type]);

  /**
   * Load storage statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      const storageStats = await mediaStorageManager.getStats();
      setStats(storageStats);
    } catch (err) {
      console.error('[useMediaPlayback] Error loading stats:', err);
    }
  }, []);

  /**
   * Select media for playback
   */
  const selectMedia = useCallback((id: string) => {
    setSelectedMediaId(id);
    setError(null);
  }, []);

  /**
   * Get media blob for playback
   */
  const getMediaBlob = useCallback(async (id: string): Promise<Blob | null> => {
    try {
      const result = await mediaStorageManager.getMedia(id);
      return result?.blob || null;
    } catch (err) {
      console.error('[useMediaPlayback] Error getting media blob:', err);
      return null;
    }
  }, []);

  /**
   * Delete media
   */
  const deleteMedia = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await mediaStorageManager.deleteMedia(id);
      
      // Remove from local list
      setMediaList(prev => prev.filter(m => m.id !== id));
      
      // Clear selection if deleted media was selected
      if (selectedMediaId === id) {
        setSelectedMediaId(null);
      }
      
      // Refresh stats
      await refreshStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete media';
      setError(errorMessage);
      console.error('[useMediaPlayback] Error deleting media:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMediaId, refreshStats]);

  /**
   * Backup media to cloud provider
   * Note: This is a mock implementation - real integration requires OAuth flows
   */
  const backupToCloud = useCallback(async (mediaId: string, providerId: string) => {
    setIsBackingUp(true);
    setError(null);

    try {
      // Get media for export
      const mediaData = await mediaStorageManager.exportForBackup(mediaId);
      
      if (!mediaData) {
        throw new Error('Media not found');
      }

      // Mock cloud backup - in production, this would:
      // 1. Check if provider is authenticated
      // 2. Upload blob to provider's API
      // 3. Store backup reference
      // 4. Update metadata with backup status
      
      console.log(`[useMediaPlayback] Backing up ${mediaId} to ${providerId}`);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mark as backed up
      await mediaStorageManager.markAsBackedUp(mediaId, providerId);
      
      // Update provider connection status (mock)
      setCloudProviders(prev => prev.map(p => 
        p.id === providerId ? { ...p, connected: true } : p
      ));
      
      // Refresh media list to get updated metadata
      await loadMedia();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Cloud backup failed';
      setError(errorMessage);
      console.error('[useMediaPlayback] Error backing up to cloud:', err);
    } finally {
      setIsBackingUp(false);
    }
  }, [loadMedia]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Auto-load media on mount
   */
  useEffect(() => {
    if (autoLoad) {
      loadMedia();
      refreshStats();
    }
  }, [autoLoad, loadMedia, refreshStats]);

  /**
   * Cleanup expired recordings on mount
   */
  useEffect(() => {
    // Run cleanup once when component mounts
    mediaStorageManager.cleanupExpired().catch(console.error);
  }, []);

  return {
    // State
    mediaList,
    selectedMediaId,
    playingMediaId,
    isLoading,
    error,
    stats,
    cloudProviders,
    isBackingUp,
    // Actions
    loadMedia,
    selectMedia,
    getMediaBlob,
    deleteMedia,
    backupToCloud,
    refreshStats,
    clearError,
  };
}

export default useMediaPlayback;
