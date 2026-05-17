/**
 * EverDream Analytics & A/B Testing System
 * 
 * Lightweight, privacy-first analytics that runs entirely client-side.
 * No external tracking scripts, no data leaves the device unless user opts in.
 * 
 * Features:
 * - Event logging with timestamps and context
 * - Funnel tracking (define steps, track completion)
 * - A/B test assignment and result tracking
 * - Session tracking (start, end, duration, screens visited)
 * - Exit point tracking
 * - Engagement metrics (streaks, frequency, retention)
 * - Heatmap data collection (screen coordinates, tap/click locations)
 * - Pain point detection (rage clicks, rapid back navigation, form abandonment)
 * - Export to JSON for analysis
 * 
 * Storage: localStorage with configurable retention (default 90 days)
 */

// ============================================================
// TYPES
// ============================================================

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  name: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  properties?: Record<string, any>;
  screen?: string;
  abTestVariant?: string;
}

export type AnalyticsEventType =
  | 'screen_view'
  | 'tap' | 'click'
  | 'swipe'
  | 'input_focus' | 'input_blur' | 'input_change'
  | 'scroll'
  | 'rage_click'        // 3+ rapid clicks in same area
  | 'back_navigation'
  | 'form_abandon'
  | 'session_start' | 'session_end'
  | 'funnel_step'
  | 'funnel_complete' | 'funnel_drop'
  | 'ab_test_exposure'
  | 'ab_test_conversion'
  | 'notification_shown' | 'notification_tapped' | 'notification_dismissed'
  | 'error'
  | 'custom';

export interface Funnel {
  id: string;
  name: string;
  steps: string[];  // Event names in order
  createdAt: number;
}

export interface FunnelProgress {
  funnelId: string;
  sessionId: string;
  currentStep: number;
  completed: boolean;
  droppedAt?: number;
  startedAt: number;
  completedAt?: number;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  targetEvent: string;      // Event that counts as conversion
  startDate: number;
  endDate?: number;
  active: boolean;
  audiencePercentage: number; // 0-100, what % of users see this test
}

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number;  // Relative weight for random assignment
  config: Record<string, any>;  // Variant-specific configuration
}

export interface ABTestAssignment {
  testId: string;
  variantId: string;
  assignedAt: number;
  converted: boolean;
  convertedAt?: number;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  duration?: number;
  screens: string[];
  events: number;
  exitScreen?: string;
  abTests: string[];  // Test IDs active during this session
}

export interface HeatmapPoint {
  x: number;
  y: number;
  screen: string;
  timestamp: number;
  type: 'tap' | 'long_press';
}

export interface PainPoint {
  type: 'rage_click' | 'rapid_back' | 'form_abandon' | 'error_streak' | 'long_pause';
  screen: string;
  timestamp: number;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
}

export interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: number;
  trackHeatmap: boolean;
  trackPainPoints: boolean;
  trackFunnels: boolean;
  trackABTests: boolean;
  anonymizeIp: boolean;
  optInRequired: boolean;
}

export interface AnalyticsSummary {
  totalEvents: number;
  totalSessions: number;
  avgSessionDuration: number;
  topScreens: { screen: string; views: number }[];
  funnelCompletionRates: { funnelId: string; name: string; rate: number }[];
  abTestResults: { testId: string; name: string; variantResults: { variantId: string; exposures: number; conversions: number; rate: number }[] }[];
  painPoints: { type: string; count: number; topScreen: string }[];
  retention: { day: number; users: number }[];
}

// ============================================================
// STORAGE KEYS
// ============================================================

const STORAGE_PREFIX = 'ed_analytics_';
const EVENTS_KEY = `${STORAGE_PREFIX}events`;
const SESSIONS_KEY = `${STORAGE_PREFIX}sessions`;
const FUNNELS_KEY = `${STORAGE_PREFIX}funnels`;
const FUNNEL_PROGRESS_KEY = `${STORAGE_PREFIX}funnel_progress`;
const AB_TESTS_KEY = `${STORAGE_PREFIX}ab_tests`;
const AB_ASSIGNMENTS_KEY = `${STORAGE_PREFIX}ab_assignments`;
const HEATMAP_KEY = `${STORAGE_PREFIX}heatmap`;
const PAIN_POINTS_KEY = `${STORAGE_PREFIX}pain_points`;
const CONFIG_KEY = `${STORAGE_PREFIX}config`;

// ============================================================
// CONFIG
// ============================================================

const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  retentionDays: 90,
  trackHeatmap: true,
  trackPainPoints: true,
  trackFunnels: true,
  trackABTests: true,
  anonymizeIp: true,
  optInRequired: false,
};

export function getAnalyticsConfig(): AnalyticsConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

export function setAnalyticsConfig(config: Partial<AnalyticsConfig>): void {
  const current = getAnalyticsConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

let currentSession: Session | null = null;
let lastClickTime = 0;
let lastClickPos = { x: 0, y: 0 };
let rageClickCount = 0;

export function startSession(): Session {
  const session: Session = {
    id: generateId(),
    startedAt: Date.now(),
    screens: [],
    events: 0,
    abTests: [],
  };
  currentSession = session;
  trackEvent('session_start', 'session_start');
  return session;
}

export function endSession(): void {
  if (!currentSession) return;
  currentSession.endedAt = Date.now();
  currentSession.duration = currentSession.endedAt - currentSession.startedAt;
  trackEvent('session_end', 'session_end', { duration: currentSession.duration });
  
  try {
    const sessions = getStoredSessions();
    sessions.push(currentSession);
    // Keep only last 100 sessions
    const trimmed = sessions.slice(-100);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
  
  currentSession = null;
}

function getStoredSessions(): Session[] {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function getCurrentSession(): Session {
  if (!currentSession) {
    currentSession = startSession();
  }
  return currentSession;
}

// ============================================================
// EVENT TRACKING
// ============================================================

export function trackEvent(
  type: AnalyticsEventType,
  name: string,
  properties?: Record<string, any>,
  screen?: string,
): AnalyticsEvent | null {
  const config = getAnalyticsConfig();
  if (!config.enabled) return null;

  const session = getCurrentSession();
  session.events++;

  const event: AnalyticsEvent = {
    id: generateId(),
    type,
    name,
    timestamp: Date.now(),
    sessionId: session.id,
    properties,
    screen: screen || window.location.hash || 'unknown',
  };

  // Store event
  try {
    const events = getStoredEvents();
    events.push(event);
    // Prune old events
    const cutoff = Date.now() - config.retentionDays * 86400000;
    const pruned = events.filter(e => e.timestamp > cutoff);
    // Keep max 10000 events
    const trimmed = pruned.slice(-10000);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }

  // Check for pain points
  if (config.trackPainPoints) {
    detectPainPoint(event);
  }

  // Track heatmap
  if (config.trackHeatmap && (type === 'tap' || type === 'click')) {
    recordHeatmapPoint(event);
  }

  return event;
}

function getStoredEvents(): AnalyticsEvent[] {
  try {
    const stored = localStorage.getItem(EVENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

// ============================================================
// SCREEN TRACKING
// ============================================================

export function trackScreenView(screenName: string, properties?: Record<string, any>): void {
  const session = getCurrentSession();
  if (!session.screens.includes(screenName)) {
    session.screens.push(screenName);
  }
  session.exitScreen = screenName;
  trackEvent('screen_view', `screen_${screenName}`, properties);
}

// ============================================================
// HEATMAP
// ============================================================

function recordHeatmapPoint(event: AnalyticsEvent): void {
  if (!event.properties?.x || !event.properties?.y) return;

  try {
    const points: HeatmapPoint[] = JSON.parse(localStorage.getItem(HEATMAP_KEY) || '[]');
    points.push({
      x: event.properties.x,
      y: event.properties.y,
      screen: event.screen || 'unknown',
      timestamp: event.timestamp,
      type: event.properties.type || 'tap',
    });
    // Keep last 5000 points
    localStorage.setItem(HEATMAP_KEY, JSON.stringify(points.slice(-5000)));
  } catch { /* ignore */ }
}

export function getHeatmapData(screen?: string): HeatmapPoint[] {
  try {
    const points: HeatmapPoint[] = JSON.parse(localStorage.getItem(HEATMAP_KEY) || '[]');
    return screen ? points.filter(p => p.screen === screen) : points;
  } catch { return []; }
}

// ============================================================
// PAIN POINT DETECTION
// ============================================================

function detectPainPoint(event: AnalyticsEvent): void {
  const now = Date.now();

  // Rage click detection: 3+ clicks within 500ms in same 50px area
  if (event.type === 'click' || event.type === 'tap') {
    const dx = Math.abs((event.properties?.x || 0) - lastClickPos.x);
    const dy = Math.abs((event.properties?.y || 0) - lastClickPos.y);
    const dt = now - lastClickTime;

    if (dt < 500 && dx < 50 && dy < 50) {
      rageClickCount++;
      if (rageClickCount >= 3) {
        recordPainPoint({
          type: 'rage_click',
          screen: event.screen || 'unknown',
          timestamp: now,
          details: { x: event.properties?.x, y: event.properties?.y, count: rageClickCount },
          severity: rageClickCount >= 5 ? 'high' : 'medium',
        });
      }
    } else {
      rageClickCount = 0;
    }

    lastClickTime = now;
    lastClickPos = { x: event.properties?.x || 0, y: event.properties?.y || 0 };
  }

  // Rapid back navigation
  if (event.type === 'back_navigation') {
    const recent = getStoredEvents().filter(
      e => e.type === 'back_navigation' && e.sessionId === event.sessionId && now - e.timestamp < 10000
    );
    if (recent.length >= 3) {
      recordPainPoint({
        type: 'rapid_back',
        screen: event.screen || 'unknown',
        timestamp: now,
        details: { count: recent.length },
        severity: 'medium',
      });
    }
  }
}

function recordPainPoint(point: PainPoint): void {
  try {
    const points: PainPoint[] = JSON.parse(localStorage.getItem(PAIN_POINTS_KEY) || '[]');
    points.push(point);
    localStorage.setItem(PAIN_POINTS_KEY, JSON.stringify(points.slice(-500)));
  } catch { /* ignore */ }
}

export function getPainPoints(screen?: string): PainPoint[] {
  try {
    const points: PainPoint[] = JSON.parse(localStorage.getItem(PAIN_POINTS_KEY) || '[]');
    return screen ? points.filter(p => p.screen === screen) : points;
  } catch { return []; }
}

// ============================================================
// FUNNEL TRACKING
// ============================================================

export function defineFunnel(id: string, name: string, steps: string[]): Funnel {
  const funnel: Funnel = { id, name, steps, createdAt: Date.now() };
  
  try {
    const funnels = getStoredFunnels();
    const idx = funnels.findIndex(f => f.id === id);
    if (idx >= 0) {
      funnels[idx] = funnel;
    } else {
      funnels.push(funnel);
    }
    localStorage.setItem(FUNNELS_KEY, JSON.stringify(funnels));
  } catch { /* ignore */ }
  
  return funnel;
}

function getStoredFunnels(): Funnel[] {
  try {
    return JSON.parse(localStorage.getItem(FUNNELS_KEY) || '[]');
  } catch { return []; }
}

export function trackFunnelStep(funnelId: string, stepName: string): void {
  const config = getAnalyticsConfig();
  if (!config.enabled || !config.trackFunnels) return;

  const session = getCurrentSession();
  const funnels = getStoredFunnels();
  const funnel = funnels.find(f => f.id === funnelId);
  if (!funnel) return;

  const stepIndex = funnel.steps.indexOf(stepName);
  if (stepIndex < 0) return;

  try {
    const progress = getStoredFunnelProgress();
    let fp = progress.find(p => p.funnelId === funnelId && p.sessionId === session.id);

    if (!fp) {
      fp = {
        funnelId,
        sessionId: session.id,
        currentStep: 0,
        completed: false,
        startedAt: Date.now(),
      };
      progress.push(fp);
    }

    // Only advance if this is the next expected step
    if (stepIndex === fp.currentStep) {
      fp.currentStep = stepIndex + 1;
      
      if (fp.currentStep >= funnel.steps.length) {
        fp.completed = true;
        fp.completedAt = Date.now();
        trackEvent('funnel_complete', `funnel_${funnelId}_complete`, {
          funnelName: funnel.name,
          duration: fp.completedAt - fp.startedAt,
        });
      }
    }

    localStorage.setItem(FUNNEL_PROGRESS_KEY, JSON.stringify(progress));
  } catch { /* ignore */ }

  trackEvent('funnel_step', `funnel_${funnelId}_step_${stepIndex}`, { stepName });
}

function getStoredFunnelProgress(): FunnelProgress[] {
  try {
    return JSON.parse(localStorage.getItem(FUNNEL_PROGRESS_KEY) || '[]');
  } catch { return []; }
}

// ============================================================
// A/B TESTING
// ============================================================

export function createABTest(test: Omit<ABTest, 'startDate'>): ABTest {
  const full: ABTest = { ...test, startDate: Date.now() };
  
  try {
    const tests = getStoredABTests();
    const idx = tests.findIndex(t => t.id === test.id);
    if (idx >= 0) {
      tests[idx] = full;
    } else {
      tests.push(full);
    }
    localStorage.setItem(AB_TESTS_KEY, JSON.stringify(tests));
  } catch { /* ignore */ }
  
  return full;
}

function getStoredABTests(): ABTest[] {
  try {
    return JSON.parse(localStorage.getItem(AB_TESTS_KEY) || '[]');
  } catch { return []; }
}

export function getABTestVariant(testId: string): ABTestVariant | null {
  const config = getAnalyticsConfig();
  if (!config.enabled || !config.trackABTests) return null;

  const tests = getStoredABTests();
  const test = tests.find(t => t.id === testId && t.active);
  if (!test) return null;

  // Check if user is in audience
  const hash = simpleHash(getCurrentSession().id + testId);
  const audienceThreshold = (test.audiencePercentage / 100) * 2147483647;
  if (Math.abs(hash) > audienceThreshold) return null;

  // Check existing assignment
  const assignments = getStoredABAssignments();
  let assignment = assignments.find(a => a.testId === testId);
  
  if (!assignment) {
    // Assign variant based on weighted random
    const variant = assignVariant(test.variants, hash);
    assignment = {
      testId,
      variantId: variant.id,
      assignedAt: Date.now(),
      converted: false,
    };
    assignments.push(assignment);
    localStorage.setItem(AB_ASSIGNMENTS_KEY, JSON.stringify(assignments));

    trackEvent('ab_test_exposure', `ab_${testId}_${variant.id}`, { testName: test.name });
  }

  return test.variants.find(v => v.id === assignment!.variantId) || null;
}

export function trackABTestConversion(testId: string): void {
  const assignments = getStoredABAssignments();
  const assignment = assignments.find(a => a.testId === testId && !assignment.converted);
  if (assignment) {
    assignment.converted = true;
    assignment.convertedAt = Date.now();
    localStorage.setItem(AB_ASSIGNMENTS_KEY, JSON.stringify(assignments));
    trackEvent('ab_test_conversion', `ab_${testId}_conversion`);
  }
}

function getStoredABAssignments(): ABTestAssignment[] {
  try {
    return JSON.parse(localStorage.getItem(AB_ASSIGNMENTS_KEY) || '[]');
  } catch { return []; }
}

function assignVariant(variants: ABTestVariant[], hash: number): ABTestVariant {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.abs(hash) % totalWeight;
  
  for (const variant of variants) {
    random -= variant.weight;
    if (random <= 0) return variant;
  }
  
  return variants[0];
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// ============================================================
// ANALYTICS DASHBOARD DATA
// ============================================================

export function getAnalyticsSummary(): AnalyticsSummary {
  const events = getStoredEvents();
  const sessions = getStoredSessions();
  const funnels = getStoredFunnels();
  const abTests = getStoredABTests();
  const painPoints = getStoredPainPoints();

  // Screen views
  const screenViews = new Map<string, number>();
  for (const e of events.filter(e => e.type === 'screen_view')) {
    const screen = e.screen || 'unknown';
    screenViews.set(screen, (screenViews.get(screen) || 0) + 1);
  }

  // Funnel completion rates
  const funnelProgress = getStoredFunnelProgress();
  const funnelCompletionRates = funnels.map(f => {
    const attempts = funnelProgress.filter(p => p.funnelId === f.id);
    const completed = attempts.filter(p => p.completed);
    return {
      funnelId: f.id,
      name: f.name,
      rate: attempts.length > 0 ? completed.length / attempts.length : 0,
    };
  });

  // A/B test results
  const abAssignments = getStoredABAssignments();
  const abTestResults = abTests.map(test => {
    const testAssignments = abAssignments.filter(a => a.testId === test.id);
    const variantResults = test.variants.map(v => {
      const va = testAssignments.filter(a => a.variantId === v.id);
      const conversions = va.filter(a => a.converted);
      return {
        variantId: v.id,
        exposures: va.length,
        conversions: conversions.length,
        rate: va.length > 0 ? conversions.length / va.length : 0,
      };
    });
    return { testId: test.id, name: test.name, variantResults };
  });

  // Pain points summary
  const painPointCounts = new Map<string, { count: number; screens: Map<string, number> }>();
  for (const pp of painPoints) {
    const existing = painPointCounts.get(pp.type) || { count: 0, screens: new Map() };
    existing.count++;
    existing.screens.set(pp.screen, (existing.screens.get(pp.screen) || 0) + 1);
    painPointCounts.set(pp.type, existing);
  }

  const painPointSummary = Array.from(painPointCounts.entries()).map(([type, data]) => {
    const topScreen = Array.from(data.screens.entries()).sort((a, b) => b[1] - a[1])[0];
    return { type, count: data.count, topScreen: topScreen?.[0] || 'unknown' };
  });

  // Retention (simplified - unique sessions per day)
  const dayMap = new Map<string, number>();
  for (const s of sessions) {
    const day = new Date(s.startedAt).toISOString().split('T')[0];
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }
  const retention = Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([day, users]) => ({ day: new Date(day).getDate(), users }));

  return {
    totalEvents: events.length,
    totalSessions: sessions.length,
    avgSessionDuration: sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
      : 0,
    topScreens: Array.from(screenViews.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([screen, views]) => ({ screen, views })),
    funnelCompletionRates,
    abTestResults,
    painPoints: painPointSummary,
    retention,
  };
}

function getStoredPainPoints(): PainPoint[] {
  try {
    return JSON.parse(localStorage.getItem(PAIN_POINTS_KEY) || '[]');
  } catch { return []; }
}

// ============================================================
// EXPORT
// ============================================================

export function exportAnalytics(): string {
  return JSON.stringify({
    events: getStoredEvents(),
    sessions: getStoredSessions(),
    funnels: getStoredFunnels(),
    funnelProgress: getStoredFunnelProgress(),
    abTests: getStoredABTests(),
    abAssignments: getStoredABAssignments(),
    heatmap: getHeatmapData(),
    painPoints: getStoredPainPoints(),
    summary: getAnalyticsSummary(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function clearAnalytics(): void {
  const keys = [
    EVENTS_KEY, SESSIONS_KEY, FUNNELS_KEY, FUNNEL_PROGRESS_KEY,
    AB_TESTS_KEY, AB_ASSIGNMENTS_KEY, HEATMAP_KEY, PAIN_POINTS_KEY,
  ];
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}
