/**
 * Wearables Sorting & Priority Algorithm
 * 
 * Provides intelligent sorting and prioritization of wearable devices based on:
 * - Data quality and completeness
 * - Recency of sync
 * - User preferences
 * - Device capabilities
 * - Historical reliability
 * 
 * Features:
 * - Multi-factor scoring algorithm
 * - Automatic provider ranking
 * - Smart conflict resolution
 * - Visual priority indicators
 */

import type { WearableProvider, WearableConfig, WearableSleepRecord } from '../lib/wearables';

export interface WearablePriority {
  /** The wearable provider */
  provider: WearableProvider;
  /** Overall priority score (0-100) */
  priorityScore: number;
  /** Data quality score (0-100) */
  dataQuality: number;
  /** Recency score (0-100) */
  recency: number;
  /** Completeness score (0-100) */
  completeness: number;
  /** Reliability score based on historical syncs (0-100) */
  reliability: number;
  /** Priority tier */
  tier: 'premium' | 'standard' | 'basic' | 'low';
  /** Visual indicator color */
  indicatorColor: string;
  /** Sort order position */
  sortOrder: number;
}

export interface SortedWearable extends WearableConfig {
  /** Extended with priority information */
  priority: WearablePriority;
}

/**
 * Provider baseline rankings (based on market reputation and data quality)
 */
const PROVIDER_BASELINE: Record<WearableProvider, number> = {
  oura: 95,           // Industry leader in sleep tracking
  apple_health: 90,   // Excellent integration and accuracy
  garmin_connect: 88, // Great for athletes, comprehensive data
  withings: 85,       // Medical-grade sensors
  polar: 83,          // Precision tracking
  fitbit: 80,         // Popular, good sleep staging
  samsung_health: 78, // Solid Android option
  huawei_health: 75,  // Good TruSleep technology
  xiaomi_mi_fitness: 72, // Budget-friendly, decent accuracy
  amazfit: 72,        // Similar to Xiaomi
  google_fit: 68,     // Aggregator, variable quality
  sony: 65,           // Limited API, niche device
};

/**
 * Data completeness weights by provider
 * Higher = more data fields typically available
 */
const DATA_COMPLETENESS_WEIGHTS: Record<WearableProvider, number> = {
  oura: 1.0,
  apple_health: 0.95,
  garmin_connect: 0.95,
  withings: 0.90,
  polar: 0.88,
  fitbit: 0.85,
  samsung_health: 0.82,
  huawei_health: 0.80,
  xiaomi_mi_fitness: 0.75,
  amazfit: 0.75,
  google_fit: 0.70,
  sony: 0.65,
};

/**
 * Get visual indicator color based on priority tier
 */
function getIndicatorColor(tier: WearablePriority['tier']): string {
  switch (tier) {
    case 'premium': return '#5ec4a8'; // Sage green
    case 'standard': return '#7fb3d5'; // Blue
    case 'basic': return '#f5a623'; // Amber
    case 'low': return '#9b96b0'; // Gray
  }
}

/**
 * Get priority tier from score
 */
function getPriorityTier(score: number): WearablePriority['tier'] {
  if (score >= 85) return 'premium';
  if (score >= 65) return 'standard';
  if (score >= 45) return 'basic';
  return 'low';
}

/**
 * Calculate data quality score based on available fields
 */
function calculateDataQuality(
  records: WearableSleepRecord[],
  provider: WearableProvider
): number {
  if (records.length === 0) return 0;
  
  const recentRecords = records.slice(-7); // Last 7 days
  let totalScore = 0;
  
  recentRecords.forEach(record => {
    let recordScore = 0;
    
    // Base points for having a record
    recordScore += 30;
    
    // Sleep stages availability (max 25)
    if (record.sleepStages) {
      const stagesCount = Object.keys(record.sleepStages).length;
      recordScore += Math.min(25, stagesCount * 5);
    }
    
    // HRV data (max 15)
    if (record.hrv !== undefined && record.hrv !== null) {
      recordScore += 15;
    }
    
    // Heart rate (max 10)
    if (record.avgHeartRate !== undefined && record.avgHeartRate !== null) {
      recordScore += 10;
    }
    
    // Respiratory rate (max 10)
    if (record.respiratoryRate !== undefined && record.respiratoryRate !== null) {
      recordScore += 10;
    }
    
    // Temperature (max 5)
    if (record.temperature !== undefined && record.temperature !== null) {
      recordScore += 5;
    }
    
    // Sleep score (max 5)
    if (record.sleepScore !== undefined && record.sleepScore !== null) {
      recordScore += 5;
    }
    
    totalScore += Math.min(100, recordScore);
  });
  
  const avgScore = totalScore / recentRecords.length;
  
  // Apply provider weight
  const weight = DATA_COMPLETENESS_WEIGHTS[provider];
  return Math.round(avgScore * weight);
}

/**
 * Calculate recency score based on last sync time
 */
function calculateRecency(lastSyncDate?: string): number {
  if (!lastSyncDate) return 0;
  
  const lastSync = new Date(lastSyncDate);
  const now = new Date();
  const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceSync < 1) return 100; // Within last hour
  if (hoursSinceSync < 6) return 95;  // Within 6 hours
  if (hoursSinceSync < 12) return 85; // Within 12 hours
  if (hoursSinceSync < 24) return 75; // Within 24 hours
  if (hoursSinceSync < 48) return 60; // Within 2 days
  if (hoursSinceSync < 72) return 45; // Within 3 days
  if (hoursSinceSync < 168) return 30; // Within week
  return 15; // Older than a week
}

/**
 * Calculate completeness score based on config and historical data
 */
function calculateCompleteness(
  config: WearableConfig,
  historicalSyncs?: number
): number {
  let score = 0;
  
  // Enabled status (max 20)
  if (config.enabled) score += 20;
  
  // Has valid auth token (max 30)
  if (config.auth.accessToken && config.auth.accessToken.length > 10) {
    score += 30;
  }
  
  // Historical sync count (max 50)
  if (historicalSyncs !== undefined) {
    if (historicalSyncs >= 30) score += 50; // Daily for a month
    else if (historicalSyncs >= 14) score += 40; // Two weeks
    else if (historicalSyncs >= 7) score += 30; // One week
    else if (historicalSyncs >= 3) score += 20;
    else if (historicalSyncs >= 1) score += 10;
  } else {
    // Assume moderate if unknown
    score += 25;
  }
  
  return Math.min(100, score);
}

/**
 * Calculate reliability score (would use historical success rate in production)
 */
function calculateReliability(
  provider: WearableProvider,
  successRate?: number,
  avgResponseTime?: number
): number {
  let score = PROVIDER_BASELINE[provider] * 0.6; // Start with baseline
  
  // Adjust by actual success rate if available
  if (successRate !== undefined) {
    score += successRate * 0.4;
  }
  
  // Bonus for fast response times
  if (avgResponseTime !== undefined) {
    if (avgResponseTime < 1000) score += 10; // Under 1 second
    else if (avgResponseTime < 3000) score += 5; // Under 3 seconds
    else if (avgResponseTime > 10000) score -= 10; // Over 10 seconds
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Main function: Calculate priority for a single wearable
 */
export function calculateWearablePriority(
  config: WearableConfig,
  options: {
    records?: WearableSleepRecord[];
    lastSyncDate?: string;
    historicalSyncs?: number;
    successRate?: number;
    avgResponseTime?: number;
  } = {}
): WearablePriority {
  const {
    records = [],
    lastSyncDate,
    historicalSyncs,
    successRate,
    avgResponseTime,
  } = options;
  
  // Calculate individual scores
  const dataQuality = calculateDataQuality(records, config.provider);
  const recency = calculateRecency(lastSyncDate);
  const completeness = calculateCompleteness(config, historicalSyncs);
  const reliability = calculateReliability(
    config.provider,
    successRate,
    avgResponseTime
  );
  
  // Weighted average for overall priority
  // Weights: dataQuality 35%, recency 25%, completeness 20%, reliability 20%
  const priorityScore = Math.round(
    (dataQuality * 0.35) +
    (recency * 0.25) +
    (completeness * 0.20) +
    (reliability * 0.20)
  );
  
  const tier = getPriorityTier(priorityScore);
  const indicatorColor = getIndicatorColor(tier);
  
  return {
    provider: config.provider,
    priorityScore,
    dataQuality,
    recency,
    completeness,
    reliability,
    tier,
    indicatorColor,
    sortOrder: 0, // Will be set after sorting
  };
}

/**
 * Sort multiple wearables by priority
 */
export function sortWearablesByPriority(
  configs: WearableConfig[],
  options: {
    recordsMap?: Record<WearableProvider, WearableSleepRecord[]>;
    lastSyncMap?: Record<WearableProvider, string>;
    historicalSyncsMap?: Record<WearableProvider, number>;
    successRateMap?: Record<WearableProvider, number>;
    avgResponseTimeMap?: Record<WearableProvider, number>;
  } = {}
): SortedWearable[] {
  const {
    recordsMap = {},
    lastSyncMap = {},
    historicalSyncsMap = {},
    successRateMap = {},
    avgResponseTimeMap = {},
  } = options;
  
  // Calculate priorities for all wearables
  const wearablesWithPriority = configs.map(config => {
    const priority = calculateWearablePriority(config, {
      records: recordsMap[config.provider] || [],
      lastSyncDate: lastSyncMap[config.provider],
      historicalSyncs: historicalSyncsMap[config.provider],
      successRate: successRateMap[config.provider],
      avgResponseTime: avgResponseTimeMap[config.provider],
    });
    
    return {
      ...config,
      priority,
    };
  });
  
  // Sort by priority score (descending)
  const sorted = wearablesWithPriority.sort((a, b) => {
    // First by enabled status
    if (a.enabled !== b.enabled) {
      return a.enabled ? -1 : 1;
    }
    
    // Then by priority score
    return b.priority.priorityScore - a.priority.priorityScore;
  });
  
  // Assign sort order
  return sorted.map((wearable, index) => ({
    ...wearable,
    priority: {
      ...wearable.priority,
      sortOrder: index + 1,
    },
  }));
}

/**
 * Get recommended primary wearable from a list
 */
export function getRecommendedPrimaryWearable(
  configs: WearableConfig[],
  options?: Parameters<typeof sortWearablesByPriority>[1]
): WearableConfig | null {
  const sorted = sortWearablesByPriority(configs, options);
  
  // Return first enabled wearable with premium or standard tier
  const recommended = sorted.find(
    w => w.enabled && (w.priority.tier === 'premium' || w.priority.tier === 'standard')
  );
  
  return recommended || sorted.find(w => w.enabled) || null;
}

/**
 * Generate display text for priority indicator
 */
export function getPriorityDisplayText(priority: WearablePriority): string {
  const { tier, priorityScore, recency } = priority;
  
  if (recency < 30) {
    return 'Sync needed';
  }
  
  switch (tier) {
    case 'premium':
      return 'Primary Source';
    case 'standard':
      return 'Reliable';
    case 'basic':
      return 'Limited Data';
    case 'low':
      return 'Minimal';
  }
}

/**
 * Generate tooltip with detailed priority breakdown
 */
export function generatePriorityTooltip(priority: WearablePriority): string {
  const lines = [
    `Overall Score: ${priority.priorityScore}/100`,
    `─────────────────────`,
    `📊 Data Quality: ${priority.dataQuality}%`,
    `⏰ Recency: ${priority.recency}%`,
    `✓ Completeness: ${priority.completeness}%`,
    `⭐ Reliability: ${priority.reliability}%`,
    `─────────────────────`,
    `Tier: ${priority.tier.toUpperCase()}`,
  ];
  
  return lines.join('\n');
}

/**
 * React component props for wearable priority badge
 */
export interface WearablePriorityBadgeProps {
  priority: WearablePriority;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default {
  calculateWearablePriority,
  sortWearablesByPriority,
  getRecommendedPrimaryWearable,
  getPriorityDisplayText,
  generatePriorityTooltip,
  PROVIDER_BASELINE,
  DATA_COMPLETENESS_WEIGHTS,
};
