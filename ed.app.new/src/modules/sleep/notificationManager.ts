/**
 * Wake Notification Manager
 * Handles progressive wake notifications and dream capture integration
 */

import { WakeTrigger, WakeNotification, SleepData, MorningCheckIn } from './types';
import { SmartWakeManager } from './smartWakeManager';

export interface NotificationSchedule {
  gentleWakeDelay: number; // seconds after trigger
  dreamPromptDelay: number; // seconds after gentle wake
  confirmationDelay: number; // seconds after dream prompt
}

export class WakeNotificationManager {
  private static readonly DEFAULT_SCHEDULE: NotificationSchedule = {
    gentleWakeDelay: 0,
    dreamPromptDelay: 3,
    confirmationDelay: 2,
  };

  private activeNotifications: Map<string, WakeNotification> = new Map();
  private notificationSchedule: NotificationSchedule = WakeNotificationManager.DEFAULT_SCHEDULE;

  /**
   * Schedule wake notifications based on wake trigger
   */
  scheduleWakeNotifications(trigger: WakeTrigger): WakeNotification[] {
    const notifications: WakeNotification[] = [];

    // Phase 1: Gentle wake
    const gentleWakeNotification: WakeNotification = {
      id: `wake-${trigger.timestamp}-gentle`,
      phase: 'gentle-wake',
      timestamp: trigger.timestamp + (this.notificationSchedule.gentleWakeDelay * 1000),
      trigger,
      interacted: false,
      content: {
        title: 'Good morning 🌅',
        body: 'How did you sleep?',
        soundscape: 'gentle-ocean',
        haptics: true,
      },
    };

    // Phase 2: Dream prompt
    const dreamPromptNotification: WakeNotification = {
      id: `wake-${trigger.timestamp}-dream`,
      phase: 'dream-prompt',
      timestamp: trigger.timestamp + ((this.notificationSchedule.gentleWakeDelay + this.notificationSchedule.dreamPromptDelay) * 1000),
      trigger,
      interacted: false,
      content: {
        title: 'Dream Capture',
        body: 'Share your dream or skip for now',
        soundscape: 'soft-bells',
        haptics: false,
      },
    };

    // Phase 3: Confirmation
    const confirmationNotification: WakeNotification = {
      id: `wake-${trigger.timestamp}-confirm`,
      phase: 'confirmation',
      timestamp: trigger.timestamp + ((this.notificationSchedule.gentleWakeDelay + this.notificationSchedule.dreamPromptDelay + this.notificationSchedule.confirmationDelay) * 1000),
      trigger,
      interacted: false,
      content: {
        title: 'Morning Complete ✨',
        body: 'Your dream will be processed into an asset',
        soundscape: 'completion-chime',
        haptics: true,
      },
    };

    notifications.push(gentleWakeNotification, dreamPromptNotification, confirmationNotification);

    // Store active notifications
    notifications.forEach(notification => {
      this.activeNotifications.set(notification.id, notification);
    });

    return notifications;
  }

  /**
   * Get pending notifications for current time
   */
  getPendingNotifications(currentTime: number): WakeNotification[] {
    return Array.from(this.activeNotifications.values())
      .filter(notification => !notification.interacted && notification.timestamp <= currentTime)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Mark notification as interacted
   */
  markInteracted(notificationId: string): void {
    const notification = this.activeNotifications.get(notificationId);
    if (notification) {
      notification.interacted = true;
      this.activeNotifications.set(notificationId, notification);
    }
  }

  /**
   * Cancel all notifications for a wake trigger
   */
  cancelNotifications(triggerId: string): void {
    const toRemove: string[] = [];
    this.activeNotifications.forEach((notification, id) => {
      if (notification.trigger.timestamp.toString().includes(triggerId)) {
        toRemove.push(id);
      }
    });
    toRemove.forEach(id => this.activeNotifications.delete(id));
  }

  /**
   * Get notification content based on phase and user preferences
   */
  getNotificationContent(
    phase: WakeNotification['phase'],
    userPreferences: {
      soundEnabled: boolean;
      hapticsEnabled: boolean;
      preferredSounds?: string[];
    }
  ): WakeNotification['content'] {
    const baseContent = this.getBaseContent(phase);

    return {
      ...baseContent,
      soundscape: userPreferences.soundEnabled ? baseContent.soundscape : undefined,
      haptics: userPreferences.hapticsEnabled && baseContent.haptics,
    };
  }

  private getBaseContent(phase: WakeNotification['phase']): WakeNotification['content'] {
    switch (phase) {
      case 'gentle-wake':
        return {
          title: 'Good morning 🌅',
          body: 'How did you sleep?',
          soundscape: 'ocean-waves',
          haptics: true,
        };

      case 'dream-prompt':
        return {
          title: 'Dream Capture',
          body: 'Share your dream or skip for now',
          soundscape: 'gentle-bells',
          haptics: false,
        };

      case 'confirmation':
        return {
          title: 'Morning Complete ✨',
          body: 'Your dream will be processed into an asset',
          soundscape: 'completion-chime',
          haptics: true,
        };

      default:
        return {
          title: 'Wake Up',
          body: 'Time to start your day',
        };
    }
  }

  /**
   * Process morning check-in and dream data
   */
  processMorningCheckIn(
    checkIn: MorningCheckIn,
    dreamVideoUri?: string
  ): {
    processedData: MorningCheckIn;
    assetReady: boolean;
    provenanceLayers: string[];
  } {
    const processedData: MorningCheckIn = {
      ...checkIn,
      dreamVideoUri,
    };

    const assetReady = !!(dreamVideoUri && checkIn.restednessScore >= 3);
    const provenanceLayers = [
      'layer1-biosignature',
      'layer2-source-verification',
      'layer3-narrative-consistency',
      'layer4-resonance-network'
    ];

    return {
      processedData,
      assetReady,
      provenanceLayers,
    };
  }

  /**
   * Update notification schedule based on user feedback
   */
  updateSchedule(feedback: {
    tooEarly?: boolean;
    tooLate?: boolean;
    preferredTiming?: number;
  }): void {
    if (feedback.tooEarly) {
      this.notificationSchedule.gentleWakeDelay = Math.max(0, this.notificationSchedule.gentleWakeDelay - 30);
    }

    if (feedback.tooLate) {
      this.notificationSchedule.gentleWakeDelay = Math.min(300, this.notificationSchedule.gentleWakeDelay + 30);
    }

    if (feedback.preferredTiming !== undefined) {
      this.notificationSchedule.gentleWakeDelay = Math.max(0, Math.min(300, feedback.preferredTiming));
    }
  }

  /**
   * Get analytics for wake notification effectiveness
   */
  getAnalytics(): {
    totalNotifications: number;
    interactionRate: number;
    averageResponseTime: number;
    dreamCaptureRate: number;
  } {
    const notifications = Array.from(this.activeNotifications.values());
    const interacted = notifications.filter(n => n.interacted);

    return {
      totalNotifications: notifications.length,
      interactionRate: notifications.length > 0 ? interacted.length / notifications.length : 0,
      averageResponseTime: 0, // Would calculate from interaction timestamps
      dreamCaptureRate: 0, // Would track dream video captures
    };
  }
}

// Singleton instance
export const wakeNotificationManager = new WakeNotificationManager();
