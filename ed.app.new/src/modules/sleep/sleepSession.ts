/**
 * Sleep Session Manager
 * Handles creation, management, and persistence of sleep tracking sessions
 */

import { SleepSession, MotionEvent, AudioFeaturePoint, SleepData, SleepStage } from './types';

class SleepSessionManager {
  private sessions: Map<string, SleepSession> = new Map();
  private currentSessionId: string | null = null;
  private storagePrefix = 'sleep_sessions_';

  constructor() {
    this.loadSessionsFromStorage();
  }

  /**
   * Create a new sleep session
   */
  createSession(): SleepSession {
    const id = this.generateSessionId();
    const session: SleepSession = {
      id,
      startTime: Date.now(),
      endTime: null,
      isActive: true,
      motionEvents: [],
      audioFeatures: [],
      sleepData: null,
    };

    this.sessions.set(id, session);
    this.currentSessionId = id;
    this.saveSessionToStorage(session);

    console.log('[SleepSession] Created new session:', id);
    return session;
  }

  /**
   * Get current active session
   */
  getCurrentSession(): SleepSession | null {
    if (!this.currentSessionId) return null;
    return this.sessions.get(this.currentSessionId) || null;
  }

  /**
   * Get session by ID
   */
  getSession(id: string): SleepSession | null {
    return this.sessions.get(id) || null;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): SleepSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Add motion event to current session
   */
  addMotionEvent(event: Omit<MotionEvent, 'timestamp'>): void {
    const session = this.getCurrentSession();
    if (!session || !session.isActive) return;

    session.motionEvents.push({
      ...event,
      timestamp: Date.now(),
    });
  }

  /**
   * Add audio feature to current session
   */
  addAudioFeature(feature: Omit<AudioFeaturePoint, 'timestamp'>): void {
    const session = this.getCurrentSession();
    if (!session || !session.isActive) return;

    session.audioFeatures.push({
      ...feature,
      timestamp: Date.now(),
    });
  }

  /**
   * End current session and compute sleep data
   * @param computeSleepData Function to compute sleep metrics from raw data
   */
  endSession(
    computeSleepData: (session: SleepSession) => SleepData
  ): SleepData | null {
    const session = this.getCurrentSession();
    if (!session) return null;

    session.isActive = false;
    session.endTime = Date.now();

    // Compute final sleep data
    const sleepData = computeSleepData(session);
    session.sleepData = sleepData;

    this.saveSessionToStorage(session);
    this.currentSessionId = null;

    console.log('[SleepSession] Ended session:', session.id, sleepData);
    return sleepData;
  }

  /**
   * Delete session
   */
  deleteSession(id: string): void {
    this.sessions.delete(id);
    if (this.currentSessionId === id) {
      this.currentSessionId = null;
    }
    localStorage.removeItem(`${this.storagePrefix}${id}`);
  }

  /**
   * Get all completed sleep data (for averaging, circadian detection)
   */
  getCompletedSessions(): SleepSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => !s.isActive && s.sleepData
    );
  }

  /**
   * Get sessions from the last N days
   */
  getSessionsFromLastDays(days: number): SleepSession[] {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.getCompletedSessions().filter((s) => s.startTime > cutoffTime);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveSessionToStorage(session: SleepSession): void {
    try {
      localStorage.setItem(
        `${this.storagePrefix}${session.id}`,
        JSON.stringify(session)
      );
    } catch (err) {
      console.error('[SleepSession] Storage error:', err);
    }
  }

  private loadSessionsFromStorage(): void {
    try {
      if (typeof localStorage === 'undefined') {
        console.info('[SleepSession] localStorage unavailable — starting with 0 sessions');
        return;
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(this.storagePrefix)) continue;

        const raw = localStorage.getItem(key);
        if (!raw) continue;

        try {
          const data = JSON.parse(raw) as SleepSession;
          if (!data?.id) continue;
          this.sessions.set(data.id, data);
          // Restore in-progress tracking after refresh
          if (data.isActive) {
            this.currentSessionId = data.id;
          }
        } catch {
          // Skip corrupt entries without failing the whole load
          console.warn('[SleepSession] Skipping corrupt session key:', key);
        }
      }

      // 0 is normal on a fresh browser / private mode / never tracked overnight.
      // Tracker UI also reads `sleep_completed_sessions` separately — not a server outage.
      if (this.sessions.size === 0) {
        console.info(
          '[SleepSession] No local raw sessions yet (expected until first overnight track on this device)'
        );
      } else {
        console.info(
          '[SleepSession] Loaded',
          this.sessions.size,
          'sessions from storage',
          this.currentSessionId ? `(active: ${this.currentSessionId})` : ''
        );
      }
    } catch (err) {
      console.error('[SleepSession] Load error:', err);
    }
  }

  /**
   * Export all sessions for backup
   */
  exportSessions(): string {
    return JSON.stringify(Array.from(this.sessions.values()), null, 2);
  }

  /**
   * Clear all sessions (dangerous)
   */
  clearAllSessions(): void {
    for (const id of this.sessions.keys()) {
      this.deleteSession(id);
    }
    this.currentSessionId = null;
  }
}

// Singleton instance
export const sleepSessionManager = new SleepSessionManager();
