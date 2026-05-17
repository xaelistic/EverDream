/**
 * Motion Sensor Integration
 * Captures accelerometer & gyroscope data for sleep stage detection
 * Uses Web DeviceMotionEvent API + Expo Sensors (fallback for mobile)
 */

import { sleepSessionManager } from './sleepSession';

export interface MotionSensorConfig {
  /** Sampling interval (ms) */
  samplingInterval: number;
  /** Motion threshold for detecting movement (0-1) */
  movementThreshold: number;
  /** Apply low-pass filter to smooth noise */
  enableFiltering: boolean;
}

class MotionSensorManager {
  private isActive = false;
  private config: MotionSensorConfig = {
    samplingInterval: 5000, // 5 seconds
    movementThreshold: 0.15,
    enableFiltering: true,
  };
  private accelerometerBuffer: number[] = [];
  private rotationBuffer: number[] = [];
  private lastPermissionRequest = 0;

  /**
   * Request motion sensor permissions (iOS 13+)
   */
  async requestPermissions(): Promise<boolean> {
    // Prevent permission spam
    if (Date.now() - this.lastPermissionRequest < 1000) return false;
    this.lastPermissionRequest = Date.now();

    if (typeof DeviceMotionEvent === 'undefined') {
      console.warn('[MotionSensor] DeviceMotionEvent not available');
      return false;
    }

    // iOS 13+ requires explicit permission
    if (
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        console.log('[MotionSensor] Permission response:', permission);
        return permission === 'granted';
      } catch (err) {
        console.error('[MotionSensor] Permission request error:', err);
        return false;
      }
    }

    // Android/other: implied permission
    return true;
  }

  /**
   * Start collecting motion data
   */
  async start(customConfig?: Partial<MotionSensorConfig>): Promise<boolean> {
    if (this.isActive) return true;

    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Request permission if needed
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('[MotionSensor] Permission denied or unavailable');
      // Continue anyway - some browsers allow motion without explicit permission
    }

    this.isActive = true;
    this.setupMotionListener();
    console.log('[MotionSensor] Started collecting motion data');
    return true;
  }

  /**
   * Stop collecting motion data
   */
  stop(): void {
    this.isActive = false;
    window.removeEventListener('devicemotion', this.onDeviceMotion);
    console.log('[MotionSensor] Stopped collecting motion data');
  }

  /**
   * Get current motion status (is user moving?)
   */
  isMoving(): boolean {
    if (this.accelerometerBuffer.length === 0) return false;

    const avgAccel =
      this.accelerometerBuffer.reduce((a, b) => a + b, 0) /
      this.accelerometerBuffer.length;

    return avgAccel > this.config.movementThreshold;
  }

  /**
   * Get motion statistics for current buffer
   */
  getMotionStats(): {
    avgAcceleration: number;
    maxAcceleration: number;
    movementDetected: boolean;
  } {
    if (this.accelerometerBuffer.length === 0) {
      return { avgAcceleration: 0, maxAcceleration: 0, movementDetected: false };
    }

    const avgAccel =
      this.accelerometerBuffer.reduce((a, b) => a + b, 0) /
      this.accelerometerBuffer.length;
    const maxAccel = Math.max(...this.accelerometerBuffer);

    return {
      avgAcceleration: avgAccel,
      maxAcceleration: maxAccel,
      movementDetected: avgAccel > this.config.movementThreshold,
    };
  }

  private setupMotionListener = (): void => {
    window.addEventListener('devicemotion', this.onDeviceMotion);
  };

  private onDeviceMotion = (event: DeviceMotionEvent): void => {
    if (!this.isActive) return;

    const acc = event.acceleration;
    const rot = event.rotationRate;

    if (!acc || !rot) return;

    // Compute acceleration magnitude
    const accelMagnitude = Math.sqrt(
      (acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2
    );
    const rotMagnitude = Math.sqrt(
      (rot.alpha || 0) ** 2 + (rot.beta || 0) ** 2 + (rot.gamma || 0) ** 2
    );

    // Normalize to 0-1 range (tunable)
    const normalizedAccel = Math.min(accelMagnitude / 50, 1);
    const normalizedRot = Math.min(rotMagnitude / 360, 1);

    this.accelerometerBuffer.push(normalizedAccel);
    this.rotationBuffer.push(normalizedRot);

    // Keep buffer size reasonable
    const maxBufferSize = 100;
    if (this.accelerometerBuffer.length > maxBufferSize) {
      this.accelerometerBuffer.shift();
      this.rotationBuffer.shift();
    }

    // Periodically flush to session manager
    if (this.accelerometerBuffer.length % 10 === 0) {
      this.flushToSession();
    }
  };

  private flushToSession = (): void => {
    if (this.accelerometerBuffer.length === 0) return;

    const avgAccel =
      this.accelerometerBuffer.reduce((a, b) => a + b, 0) /
      this.accelerometerBuffer.length;
    const avgRot =
      this.rotationBuffer.reduce((a, b) => a + b, 0) /
      this.rotationBuffer.length;

    sleepSessionManager.addMotionEvent({
      acceleration: avgAccel,
      rotation: avgRot,
    });

    // Keep last few samples for smoothing
    const keepSize = 10;
    this.accelerometerBuffer = this.accelerometerBuffer.slice(-keepSize);
    this.rotationBuffer = this.rotationBuffer.slice(-keepSize);
  };
}

export const motionSensorManager = new MotionSensorManager();
