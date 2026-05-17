/**
 * Unified Wearable Integration Service
 *
 * Supports: Oura Ring, Apple HealthKit, Fitbit, Google Fit,
 *           Samsung Health, Huawei Health, Xiaomi Mi Fitness,
 *           Garmin Connect, Withings, Amazfit, Polar, Sony
 *
 * All APIs return normalized WearableSleepRecord format
 *
 * API Documentation:
 * - Oura: https://cloud.ouraring.com/v2/usercollection/daily_sleep
 * - Fitbit: https://dev.fitbit.com/build/reference/web-api/sleep/
 * - Google Fit: https://developers.google.com/fit/rest/v1/users/dataSources/datasets
 * - Apple HealthKit: https://developer.apple.com/documentation/healthkit
 * - Samsung Health: https://developer.samsung.com/health/server/server-guide.html
 * - Huawei Health: https://developer.huawei.com/consumer/en/hms/healthkit/
 * - Xiaomi Mi Fitness: https://dev.mi.com/documentation?page_id=4477
 * - Garmin Connect: https://developer.garmin.com/health-api/
 * - Withings: https://developer.withings.com/api-reference/
 * - Amazfit (Zepp): https://docs.huami.com/
 * - Polar: https://www.polar.com/accesslink-api/
 * - Sony (Wena): No public API — placeholder for future
 */

export type WearableProvider =
  | 'oura'
  | 'fitbit'
  | 'google_fit'
  | 'apple_health'
  | 'samsung_health'
  | 'huawei_health'
  | 'xiaomi_mi_fitness'
  | 'garmin_connect'
  | 'withings'
  | 'amazfit'
  | 'polar'
  | 'sony';

export interface WearableAuth {
  provider: WearableProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface WearableSleepRecord {
  date: string;
  bedtime: string;  // ISO timestamp
  wakeTime: string; // ISO timestamp
  durationMinutes: number;
  remMinutes: number;
  deepMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
  efficiency: number; // 0-100
  score: number; // 0-100 (provider-specific)
  heartRateAvg?: number;
  heartRateMin?: number;
  heartRateMax?: number;
  hrv?: number;
  respiratoryRate?: number;
  skinTempCelsius?: number;
  source: string;
}

// ============================================================
// OURA RING API
// ============================================================

const OURA_API_BASE = 'https://api.ouraring.com/v2';

export async function fetchOuraSleep(auth: WearableAuth, startDate: string, endDate: string): Promise<WearableSleepRecord[]> {
  const records: WearableSleepRecord[] = [];

  try {
    const sleepRes = await fetch(
      `${OURA_API_BASE}/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`,
      { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
    );

    if (!sleepRes.ok) {
      throw new Error(`Oura API error: ${sleepRes.status}`);
    }

    const sleepData = await sleepRes.json();

    const sessionsRes = await fetch(
      `${OURA_API_BASE}/usercollection/sleep?start_date=${startDate}&end_date=${endDate}`,
      { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
    );

    const sessionsData = await sessionsRes.json();

    if (sleepData.data) {
      for (const day of sleepData.data) {
        const session = sessionsData.data?.find((s: any) => s.day === day.day);

        records.push({
          date: day.day,
          bedtime: session?.bedtime_start || day.day + 'T22:00:00',
          wakeTime: session?.bedtime_end || day.day + 'T06:00:00',
          durationMinutes: session?.total || day.total_sleep_duration ? Math.round(day.total_sleep_duration / 60) : 420,
          remMinutes: session?.rem || day.rem_sleep_duration ? Math.round(day.rem_sleep_duration / 60) : 90,
          deepMinutes: session?.deep || day.deep_sleep_duration ? Math.round(day.deep_sleep_duration / 60) : 70,
          lightMinutes: session?.light || day.light_sleep_duration ? Math.round(day.light_sleep_duration / 60) : 240,
          awakeMinutes: session?.awake || 20,
          efficiency: session?.efficiency || day.efficiency || 85,
          score: day.score || 75,
          heartRateAvg: session?.hr_average,
          heartRateMin: session?.hr_lowest,
          hrv: session?.rmssd,
          respiratoryRate: session?.breath_average,
          skinTempCelsius: session?.temperature_delta ? 36.5 + session.temperature_delta : undefined,
          source: 'oura',
        });
      }
    }
  } catch (error) {
    console.error('Oura fetch error:', error);
    throw error;
  }

  return records;
}

// ============================================================
// FITBIT API
// ============================================================

const FITBIT_API_BASE = 'https://api.fitbit.com/1.2';

export async function fetchFitbitSleep(auth: WearableAuth, startDate: string, endDate: string): Promise<WearableSleepRecord[]> {
  const records: WearableSleepRecord[] = [];

  try {
    const res = await fetch(
      `${FITBIT_API_BASE}/user/-/sleep/date/${startDate}/${endDate}.json`,
      { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Fitbit API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.sleep) {
      for (const sleep of data.sleep) {
        const levels = sleep.levels?.summary || {};

        const remMinutes = levels.rem?.minutes || levels.data?.find((d: any) => d.level === 'rem')?.minutes || 0;
        const deepMinutes = levels.deep?.minutes || levels.data?.find((d: any) => d.level === 'deep')?.minutes || 0;
        const lightMinutes = levels.light?.minutes || levels.data?.find((d: any) => d.level === 'light')?.minutes || 0;
        const awakeMinutes = levels.wake?.minutes || levels.data?.find((d: any) => d.level === 'wake')?.minutes || 0;

        records.push({
          date: sleep.dateOfSleep,
          bedtime: sleep.startTime,
          wakeTime: new Date(new Date(sleep.startTime).getTime() + sleep.duration / 60000).toISOString(),
          durationMinutes: Math.round(sleep.timeInBed / 60),
          remMinutes,
          deepMinutes,
          lightMinutes,
          awakeMinutes,
          efficiency: sleep.efficiency || Math.round((sleep.timeInBed - awakeMinutes * 60) / sleep.timeInBed * 100),
          score: sleep.isMainSleep ? 75 : 50,
          heartRateAvg: sleep.restingHeartRate,
          source: 'fitbit',
        });
      }
    }
  } catch (error) {
    console.error('Fitbit fetch error:', error);
    throw error;
  }

  return records;
}

// ============================================================
// GOOGLE FIT API
// ============================================================

const GOOGLE_FIT_API_BASE = 'https://www.googleapis.com/fitness/v1';

const GOOGLE_SLEEP_STAGES: Record<number, string> = {
  1: 'awake',
  2: 'light',
  3: 'deep',
  4: 'rem',
  6: 'awake',
};

export async function fetchGoogleFitSleep(auth: WearableAuth, startDate: string, endDate: string): Promise<WearableSleepRecord[]> {
  const records: WearableSleepRecord[] = [];

  try {
    const res = await fetch(
      `${GOOGLE_FIT_API_BASE}/users/me/sessions?startTime=${startDate}T00:00:00.000Z&endTime=${endDate}T23:59:59.000Z&activityType=72`,
      { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Google Fit API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.session) {
      for (const session of data.session) {
        const startMs = parseInt(session.startTimeMillis);
        const endMs = parseInt(session.endTimeMillis);
        const durationMinutes = Math.round((endMs - startMs) / 60000);

        const datasetRes = await fetch(
          `${GOOGLE_FIT_API_BASE}/users/me/dataSources/derived:com.google.sleep.segment:com.google.android.gms:merged_sleep_segments/datasets/${session.startTimeMillis}000000-${session.endTimeMillis}000000`,
          { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
        );

        let remMinutes = 0, deepMinutes = 0, lightMinutes = 0, awakeMinutes = 0;

        if (datasetRes.ok) {
          const dataset = await datasetRes.json();
          if (dataset.point) {
            for (const point of dataset.point) {
              const stageMinutes = Math.round((parseInt(point.endTimeMillis) - parseInt(point.startTimeMillis)) / 60000);
              const stage = GOOGLE_SLEEP_STAGES[point.value?.[0]?.intVal || 0];

              switch (stage) {
                case 'rem': remMinutes += stageMinutes; break;
                case 'deep': deepMinutes += stageMinutes; break;
                case 'light': lightMinutes += stageMinutes; break;
                case 'awake': awakeMinutes += stageMinutes; break;
              }
            }
          }
        }

        if (remMinutes + deepMinutes + lightMinutes + awakeMinutes === 0) {
          remMinutes = Math.round(durationMinutes * 0.20);
          deepMinutes = Math.round(durationMinutes * 0.15);
          lightMinutes = Math.round(durationMinutes * 0.55);
          awakeMinutes = Math.round(durationMinutes * 0.10);
        }

        const sleepDate = new Date(startMs);
        const dateStr = sleepDate.toISOString().split('T')[0];

        records.push({
          date: dateStr,
          bedtime: new Date(startMs).toISOString(),
          wakeTime: new Date(endMs).toISOString(),
          durationMinutes,
          remMinutes,
          deepMinutes,
          lightMinutes,
          awakeMinutes,
          efficiency: Math.round(((durationMinutes - awakeMinutes) / durationMinutes) * 100),
          score: 70,
          source: 'google_fit',
        });
      }
    }
  } catch (error) {
    console.error('Google Fit fetch error:', error);
    throw error;
  }

  return records;
}

// ============================================================
// APPLE HEALTHKIT (via HealthKit Web / bridge)
// ============================================================

// Apple HealthKit doesn't have a direct web API. Options:
// 1. Use a native bridge (Capacitor/Cordova plugin) in a mobile app
// 2. Use Apple's HealthKit REST API (requires Apple Developer account + server)
// 3. Use a third-party bridge like SyncSolver or Health Auto Export

const APPLE_HEALTH_BASE = 'https://api.apple-health.example.com/v1'; // Placeholder

export async function fetchAppleHealthSleep(auth: WearableAuth, startDate: string, endDate: string): Promise<WearableSleepRecord[]> {
  const records: WearableSleepRecord[] = [];

  try {
    const res = await fetch(
      `${APPLE_HEALTH_BASE}/sleep?start=${startDate}&end=${endDate}`,
      { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Apple Health API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.sleepAnalysis) {
      for (const entry of data.sleepAnalysis) {
        const start = new Date(entry.startDate);
        const end = new Date(entry.endDate);
        const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

        let remMinutes = 0, deepMinutes = 0, lightMinutes = 0, awakeMinutes = 0;

        if (entry.stages) {
          for (const stage of entry.stages) {
            const stageMinutes = Math.round(stage.duration / 60);
            switch (stage.value) {
              case 'asleepREM': remMinutes += stageMinutes; break;
              case 'asleepDeep': deepMinutes += stageMinutes; break;
              case 'asleepCore': lightMinutes += stageMinutes; break;
              case 'awake': awakeMinutes += stageMinutes; break;
            }
          }
        } else {
          remMinutes = Math.round(durationMinutes * 0.20);
          deepMinutes = Math.round(durationMinutes * 0.15);
          lightMinutes = Math.round(durationMinutes * 0.55);
          awakeMinutes = Math.round(durationMinutes * 0.10);
        }

        records.push({
          date: start.toISOString().split('T')[0],
          bedtime: entry.startDate,
          wakeTime: entry.endDate,
          durationMinutes,
          remMinutes,
          deepMinutes,
          lightMinutes,
          awakeMinutes,
          efficiency: Math.round(((durationMinutes - awakeMinutes) / durationMinutes) * 100),
          score: 75,
          source: 'apple_health',
        });
      }
    }
  } catch (error) {
    console.error('Apple Health fetch error:', error);
    throw error;
  }

  return records;
}

// ============================================================
// SAMSUNG HEALTH API
// ============================================================

// Samsung Health SDK — requires Samsung Developer partner approval
// REST API available for approved partners via Samsung Health Platform
// Docs: https://developer.samsung.com/health/server/server-guide.html

const SAMSUNG_HEALTH_BASE = 'https://api.samsunghealth.com/v1'; // Partner API endpoint

export async function fetchSamsungHealthSleep(auth: WearableAuth, startDate: string, endDate: string): Promise<WearableSleepRecord[]> {
  const records: WearableSleepRecord[] = [];

  try {
    // Samsung Health sleep endpoint (partner API)
    const res = await fetch(
      `${SAMSUNG_HEALTH_BASE}/sleep?start_date=${startDate}&end_date=${endDate}`,
      { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Samsung Health API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.sleep_data) {
      for (const entry of data.sleep_data) {
        const stages = entry.sleep_stages || {};
        const remMinutes = stages.rem_duration ? Math.round(stages.rem_duration / 60) : 0;
        const deepMinutes = stages.deep_duration ? Math.round(stages.deep_duration / 60) : 0;
        const lightMinutes = stages.light_duration ? Math.round(stages.light_duration / 60) : 0;
        const awakeMinutes = stages.awake_duration ? Math.round(stages.awake_duration / 60) : 0;

        const totalDuration = remMinutes + deepMinutes + lightMinutes + awakeMinutes;

        records.push({
          date: entry.date,
          bedtime: entry.start_time,
          wakeTime: entry.end_time,
          durationMinutes: totalDuration || 420,
          remMinutes: remMinutes || Math.round((totalDuration || 420) * 0.20),
          deepMinutes: deepMinutes || Math.round((totalDuration || 420) * 0.15),
          lightMinutes: lightMinutes || Math.round((totalDuration || 420) * 0.55),
          awakeMinutes: awakeMinutes || Math.round((totalDuration || 420) * 0.10),
          efficiency: entry.efficiency || Math.round(((totalDuration - awakeMinutes) / (totalDuration || 1)) * 100),
          score: entry.sleep_score || 70,
          heartRateAvg: entry.avg_heart_rate,
          heartRateMin: entry.min_heart_rate,
          heartRateMax: entry.max_heart_rate,
          hrv: entry.hrv,
          respiratoryRate: entry.respiratory_rate,
          source: 'samsung_health',
        });
      }
    }
  } catch (error) {
    console.error('Samsung Health fetch error:', error);
    throw error;
  }

  return records;
}

// ============================================================
// HUAWEI HEALTH API
// ============================================================

// Huawei Health Kit — part of Huawei Mobile Services (HMS)
// Docs: https://developer.huawei.com/consumer/en/hms/healthkit/
// Requires HMS Core integration and Huawei Developer account

const HUAWEI_HEALTH_BASE = 'https://health-api.cloud.huawei.com/v1';

export async function fetchHuaweiHealthSleep(auth: WearableAuth, startDate: string, endDate: string): Promise<WearableSleepRecord[]> {
  const records: WearableSleepRecord[] = [];

  try {
    // Huawei Health Kit sleep data endpoint
    const res = await fetch(
      `${HUAWEI_HEALTH_BASE}/sleep?startTime=${startDate}&endTime=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Huawei Health API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.sleepRecords) {
      for (const entry of data.sleepRecords) {
        const stages = entry.sleepStageList || [];
        let remMinutes = 0, deepMinutes = 0, lightMinutes = 0, awakeMinutes = 0;

        for (const stage of stages) {
          const minutes = Math.round((stage.endTime - stage.startTime) / 60000);
          // Huawei sleep stage codes: 1=deep, 2=light, 3=REM, 4=awake
          switch (stage.stageCode) {
            case 1: deepMinutes += minutes; break;
            case 2: lightMinutes += minutes; break;
            case 3: remMinutes += minutes; break;
            case 4: awakeMinutes += minutes; break;
          }
        }

        const totalDuration = remMinutes + deepMinutes + lightMinutes + awakeMinutes;

        records.push({
          date: entry.date,
          bedtime: new Date(entry.startTime).toISOString(),
          wakeTime: new Date(entry.endTime).toISOString(),
          durationMinutes: totalDuration || 420,
          remMinutes: remMinutes || Math.round((totalDuration || 420) * 0.20),
          deepMinutes: deepMinutes || Math.round((totalDuration || 420) * 0.15),
          lightMinutes: lightMinutes || Math.round((totalDuration || 420) * 0.55),
          awakeMinutes: awakeMinutes || Math.round((totalDuration || 420) * 0.10),
          efficiency: entry.sleepScore ? Math.round(entry.sleepScore * 0.85) : 80,
          score: entry.sleepScore || 72,
          heartRateAvg: entry.avgHeartRate,
          heartRateMin: entry.minHeartRate,
          heartRateMax: entry.maxHeartRate,
          hrv: entry.hrv,
          respiratoryRate: entry.respiratoryRate,
          skinTempCelsius: entry.skinTemperature,
          source: 'huawei_health',
        });
      }
    }
  } catch (error) {
    console.error('Huawei Health fetch error:', error);
    throw error;
  }

  return records;
}

// ============================================================
// XIAOMI MI FITNESS API
// ============================================================

// Xiaomi Mi Fitness (Zepp Life / Mi Fit) — uses Huami Zepp API
// Docs: https://dev.mi.com/documentation?page_id=4477
// Note: Xiaomi's official API is limited; many integrations use
// the Huami/Zepp backend or third-party bridges

const XIAOMI_API_BASE = 'https://api-mifit.huami.com/v1';

export async function fetchXiaomiSleep(auth: WearableAuth, startDate: string, endDate: string): Promise<WearableSleepRecord[]> {
  const records: WearableSleepRecord[] = [];

  try {
    // Xiaomi/Huami sleep data endpoint
    const res = await fetch(
      `${XIAOMI_API_BASE}/sleep?from_date=${startDate}&to_date=${endDate}`,
      { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Xiaomi Mi Fitness API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.sleep) {
      for (const entry of data.sleep) {
        const stages = entry.sleep_details || [];
        let remMinutes = 0, deepMinutes = 0, lightMinutes = 0, awakeMinutes = 0;

        for (const stage of stages) {
          const minutes = Math.round(stage.length / 60);
          // Huami stage codes: 1=deep, 2=light, 3=REM, 4=awake
          switch (stage.type) {
            case 1: deepMinutes += minutes; break;
            case 2: lightMinutes += minutes; break;
            case 3: remMinutes += minutes; break;
            case 4: awakeMinutes += minutes; break;
          }
        }

        const totalDuration = remMinutes + deepMinutes + lightMinutes + awakeMinutes;

        records.push({
          date: entry.date,
          bedtime: entry.start,
          wakeTime: entry.stop,
          durationMinutes: totalDuration || 420,
          remMinutes: remMinutes || Math.round((totalDuration || 420) * 0.20),
          deepMinutes: deepMinutes || Math.round((totalDuration || 420) * 0.15),
          lightMinutes: lightMinutes || Math.round((totalDuration || 420) * 0.55),
          awakeMinutes: awakeMinutes || Math.round((totalDuration || 420) * 0.10),
          efficiency: entry.efficiency || Math.round(((totalDuration - awakeMinutes) / (totalDuration || 1)) * 100),
          score: entry.sleep_score || 68,
          heartRateAvg: entry.heart_rate_avg,
          source: 'xiaomi_mi_fitness',
        });
      }
    }
  } catch (error) {
    console.error('Xiaomi Mi Fitness fetch error:', error);
    throw error;
  }

  return records;
}

// ============================================================
// GARMIN CONNECT API
// ============================================================

// Garmin Connect Health API
// Docs: https://developer.garmin.com/health-api/
// Requires Garmin developer account and OAuth 1.0a

const GARMIN_API_BASE = 'https://connectapi.garmin.com/wellness-api/rest';

export async function fetchGarminSleep(auth: WearableAuth, startDate: string, endDate: string): Promise<WearableSleepRecord[]> {
  const records: WearableSleepRecord[] = [];

  try {
    const res = await fetch(
      `${GARMIN_API_BASE}/sleep?startDate=${startDate}&endDate=${endDate}`,
      { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Garmin Connect API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.sleepDTOs || data.sleep) {
      const sleepList = data.sleepDTOs || data.sleep || [];

      for (const entry of sleepList) {
        const remMinutes = entry.remSleepSeconds ? Math.round(entry.remSleepSeconds / 60) : 0;
        const deepMinutes = entry.deepSleepSeconds ? Math.round(entry.deepSleepSeconds / 60) : 0;
        const lightMinutes = entry.lightSleepSeconds ? Math.round(entry.lightSleepSeconds / 60) : 0;
        const awakeMinutes = entry.awakeSleepSeconds ? Math.round(entry.awakeSleepSeconds / 60) : 0;

        const totalDuration = remMinutes + deepMinutes + lightMinutes + awakeMinutes;

        records.push({
          date: entry.calendarDate || entry.sleepDate,
          bedtime: entry.sleepStartTimestampGMT ? new Date(entry.sleepStartTimestampGMT).toISOString() : entry.calendarDate + 'T22:00:00',
          wakeTime: entry.sleepEndTimestampGMT ? new Date(entry.sleepEndTimestampGMT).toISOString() : entry.calendarDate + 'T06:00:00',
          durationMinutes: totalDuration || 420,
          remMinutes: remMinutes || Math.round((totalDuration || 420) * 0.20),
          deepMinutes: deepMinutes || Math.round((totalDuration || 420) * 0.15),
          lightMinutes: lightMinutes || Math.round((totalDuration || 420) * 0.55),
          awakeMinutes: awakeMinutes || Math.round((totalDuration || 420) * 0.10),
          efficiency: entry.sleepScores?.overall?.value || Math.round(((totalDuration - awakeMinutes) / (totalDuration || 1)) * 100),
          score: entry.sleepScores?.overall?.value || 72,
          heartRateAvg: entry.averageSpO2Value ? undefined : entry.averageHR,
          heartRateMin: entry.lowestRespirationValue ? undefined : entry.minHR,
          heartRateMax: entry.maxHR,
          hrv: entry.averageHRSS,
          respiratoryRate: entry.averageRespirationValue,
          source: 'garmin_connect',
        });
      }
    }
  } catch (error) {
    console.error('Garmin Connect fetch error:', error);
    throw error;
  }

  return records;
}

// ============================================================
// WITHINGS API
// ============================================================

// Withings Health Mate API
// Docs: https://developer.withings.com/api-reference/
// OAuth 2.0, well-documented sleep API

const WITHINGS_API_BASE = 'https://wbsapi.withings.net/v2';

export async function fetchWithingsSleep(auth: WearableAuth, startDate: string, endDate: string): Promise<WearableSleepRecord[]> {
  const records: WearableSleepRecord[] = [];

  try {
    const startEpoch = Math.floor(new Date(startDate).getTime() / 1000);
    const endEpoch = Math.floor(new Date(endDate).getTime() / 1000);

    const res = await fetch(
      `${WITHINGS_API_BASE}/sleep?action=get&startdate=${startEpoch}&enddate=${endEpoch}`,
      { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Withings API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.body?.series) {
      for (const entry of data.body.series) {
        const stages = entry.data || {};
        const remMinutes = stages.remsleepduration ? Math.round(stages.remsleepduration / 60) : 0;
        const deepMinutes = stages.deepsleepduration ? Math.round(stages.deepsleepduration / 60) : 0;
        const lightMinutes = stages.lightsleepduration ? Math.round(stages.lightsleepduration / 60) : 0;
        const awakeMinutes = stages.wakeupduration ? Math.round(stages.wakeupduration / 60) : 0;

        const totalDuration = remMinutes + deepMinutes + lightMinutes + awakeMinutes;
        const startDateStr = new Date(entry.startdate * 1000).toISOString().split('T')[0];

        records.push({
          date: startDateStr,
          bedtime: new Date(entry.startdate * 1000).toISOString(),
          wakeTime: new Date(entry.enddate * 1000).toISOString(),
          durationMinutes: totalDuration || 420,
          remMinutes: remMinutes || Math.round((totalDuration || 420) * 0.20),
          deepMinutes: deepMinutes || Math.round((totalDuration || 420) * 0.15),
          lightMinutes: lightMinutes || Math.round((totalDuration || 420) * 0.55),
          awakeMinutes: awakeMinutes || Math.round((totalDuration || 420) * 0.10),
          efficiency: entry.sleep_score || Math.round(((totalDuration - awakeMinutes) / (totalDuration || 1)) * 100),
          score: entry.sleep_score || 70,
          heartRateAvg: stages.hr_average,
          heartRateMin: stages.hr_min,
          heartRateMax: stages.hr_max,
          respiratoryRate: stages.rr_average,
          source: 'withings',
        });
      }
    }
  } catch (error) {
    console.error('Withings fetch error:', error);
    throw error;
  }

  return records;
}

// ============================================================
// AMAZFIT (ZEPP) API
// ============================================================

// Amazfit uses the Huami Zepp backend
// Docs: https://docs.huami.com/
// Note: Official API access is limited; uses OAuth 2.0

const AMAZFIT_API_BASE = 'https://api-mifit-us2.huami.com/v1';

export async function fetchAmazfitSleep(auth: WearableAuth, startDate: string, endDate: string): Promise<WearableSleepRecord[]> {
  const records: WearableSleepRecord[] = [];

  try {
    const res = await fetch(
      `${AMAZFIT_API_BASE}/sleep?from_date=${startDate}&to_date=${endDate}`,
      { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Amazfit API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.items || data.sleep) {
      const sleepList = data.items || data.sleep || [];

      for (const entry of sleepList) {
        const stages = entry.sleep_details || entry.details || [];
        let remMinutes = 0, deepMinutes = 0, lightMinutes = 0, awakeMinutes = 0;

        for (const stage of stages) {
          const minutes = Math.round((stage.end_time - stage.start_time) / 60);
          switch (stage.type || stage.stage) {
            case 1: case 'deep': deepMinutes += minutes; break;
            case 2: case 'light': lightMinutes += minutes; break;
            case 3: case 'rem': remMinutes += minutes; break;
            case 4: case 'awake': awakeMinutes += minutes; break;
          }
        }

        const totalDuration = remMinutes + deepMinutes + lightMinutes + awakeMinutes;

        records.push({
          date: entry.date || entry.day,
          bedtime: entry.start_time || entry.bedtime,
          wakeTime: entry.end_time || entry.wake_time,
          durationMinutes: totalDuration || 420,
          remMinutes: remMinutes || Math.round((totalDuration || 420) * 0.20),
          deepMinutes: deepMinutes || Math.round((totalDuration || 420) * 0.15),
          lightMinutes: lightMinutes || Math.round((totalDuration || 420) * 0.55),
          awakeMinutes: awakeMinutes || Math.round((totalDuration || 420) * 0.10),
          efficiency: entry.efficiency || Math.round(((totalDuration - awakeMinutes) / (totalDuration || 1)) * 100),
          score: entry.sleep_score || 68,
          heartRateAvg: entry.avg_hr,
          source: 'amazfit',
        });
      }
    }
  } catch (error) {
    console.error('Amazfit fetch error:', error);
    throw error;
  }

  return records;
}

// ============================================================
// POLAR ACCESSLINK API
// ============================================================

// Polar AccessLink API
// Docs: https://www.polar.com/accesslink-api/
// OAuth 2.0, provides sleep data from Polar watches

const POLAR_API_BASE = 'https://www.polaraccesslink.com/v3';

export async function fetchPolarSleep(auth: WearableAuth, startDate: string, endDate: string): Promise<WearableSleepRecord[]> {
  const records: WearableSleepRecord[] = [];

  try {
    // Polar uses a two-step process: register user, then fetch data
    const res = await fetch(
      `${POLAR_API_BASE}/users/nightly-recovery?from_date=${startDate}&to_date=${endDate}`,
      { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Polar API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.nightly_recovery || data.sleep_results) {
      const sleepList = data.nightly_recovery || data.sleep_results || [];

      for (const entry of sleep_list || [entry]) {
        const remMinutes = entry.rem_sleep ? Math.round(entry.rem_sleep / 60) : 0;
        const deepMinutes = entry.deep_sleep ? Math.round(entry.deep_sleep / 60) : 0;
        const lightMinutes = entry.light_sleep ? Math.round(entry.light_sleep / 60) : 0;
        const awakeMinutes = entry.awake ? Math.round(entry.awake / 60) : 0;

        const totalDuration = remMinutes + deepMinutes + lightMinutes + awakeMinutes;

        records.push({
          date: entry.date || entry.night,
          bedtime: entry.sleep_start || entry.date + 'T22:00:00',
          wakeTime: entry.sleep_end || entry.date + 'T06:00:00',
          durationMinutes: totalDuration || 420,
          remMinutes: remMinutes || Math.round((totalDuration || 420) * 0.20),
          deepMinutes: deepMinutes || Math.round((totalDuration || 420) * 0.15),
          lightMinutes: lightMinutes || Math.round((totalDuration || 420) * 0.55),
          awakeMinutes: awakeMinutes || Math.round((totalDuration || 420) * 0.10),
          efficiency: entry.sleep_score || Math.round(((totalDuration - awakeMinutes) / (totalDuration || 1)) * 100),
          score: entry.sleep_score || entry.recovery_score || 70,
          heartRateAvg: entry.avg_hr,
          heartRateMin: entry.min_hr,
          hrv: entry.hrv,
          source: 'polar',
        });
      }
    }
  } catch (error) {
    console.error('Polar fetch error:', error);
    throw error;
  }

  return records;
}

// ============================================================
// SONY (WENA WRIST) API — Placeholder
// ============================================================

// Sony Wena Wrist has no public API as of 2024.
// This is a placeholder for future integration.
// Sony has not opened their wearable API to third-party developers.

const SONY_API_BASE = 'https://api.sony-wena.example.com/v1'; // Placeholder

export async function fetchSonySleep(auth: WearableAuth, startDate: string, endDate: string): Promise<WearableSleepRecord[]> {
  const records: WearableSleepRecord[] = [];

  try {
    const res = await fetch(
      `${SONY_API_BASE}/sleep?start=${startDate}&end=${endDate}`,
      { headers: { 'Authorization': `Bearer ${auth.accessToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Sony Wena API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.sleep) {
      for (const entry of data.sleep) {
        records.push({
          date: entry.date,
          bedtime: entry.start_time,
          wakeTime: entry.end_time,
          durationMinutes: entry.duration_minutes || 420,
          remMinutes: entry.rem_minutes || 90,
          deepMinutes: entry.deep_minutes || 70,
          lightMinutes: entry.light_minutes || 240,
          awakeMinutes: entry.awake_minutes || 20,
          efficiency: entry.efficiency || 80,
          score: entry.sleep_score || 70,
          source: 'sony',
        });
      }
    }
  } catch (error) {
    console.error('Sony Wena fetch error:', error);
    throw error;
  }

  return records;
}

// ============================================================
// UNIFIED WEARABLE SERVICE
// ============================================================

export interface WearableConfig {
  provider: WearableProvider;
  auth: WearableAuth;
  enabled: boolean;
}

/**
 * Fetch sleep data from all enabled wearable providers
 */
export async function fetchAllWearableSleep(
  configs: WearableConfig[],
  startDate: string,
  endDate: string,
): Promise<WearableSleepRecord[]> {
  const allRecords: WearableSleepRecord[] = [];
  const errors: { provider: string; error: string }[] = [];

  const enabledConfigs = configs.filter(c => c.enabled && c.auth.accessToken);

  const promises = enabledConfigs.map(async (config) => {
    try {
      let records: WearableSleepRecord[] = [];

      switch (config.provider) {
        case 'oura':
          records = await fetchOuraSleep(config.auth, startDate, endDate);
          break;
        case 'fitbit':
          records = await fetchFitbitSleep(config.auth, startDate, endDate);
          break;
        case 'google_fit':
          records = await fetchGoogleFitSleep(config.auth, startDate, endDate);
          break;
        case 'apple_health':
          records = await fetchAppleHealthSleep(config.auth, startDate, endDate);
          break;
        case 'samsung_health':
          records = await fetchSamsungHealthSleep(config.auth, startDate, endDate);
          break;
        case 'huawei_health':
          records = await fetchHuaweiHealthSleep(config.auth, startDate, endDate);
          break;
        case 'xiaomi_mi_fitness':
          records = await fetchXiaomiSleep(config.auth, startDate, endDate);
          break;
        case 'garmin_connect':
          records = await fetchGarminSleep(config.auth, startDate, endDate);
          break;
        case 'withings':
          records = await fetchWithingsSleep(config.auth, startDate, endDate);
          break;
        case 'amazfit':
          records = await fetchAmazfitSleep(config.auth, startDate, endDate);
          break;
        case 'polar':
          records = await fetchPolarSleep(config.auth, startDate, endDate);
          break;
        case 'sony':
          records = await fetchSonySleep(config.auth, startDate, endDate);
          break;
      }

      return records;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ provider: config.provider, error: message });
      return [];
    }
  });

  const results = await Promise.all(promises);

  for (const records of results) {
    allRecords.push(...records);
  }

  if (errors.length > 0) {
    console.warn('Wearable fetch errors:', errors);
  }

  // Deduplicate by date, preferring higher-quality data
  const byDate = new Map<string, WearableSleepRecord>();
  const sourcePriority: Record<string, number> = {
    oura: 12,
    apple_health: 11,
    garmin_connect: 10,
    withings: 9,
    samsung_health: 8,
    huawei_health: 7,
    polar: 6,
    fitbit: 5,
    google_fit: 4,
    amazfit: 3,
    xiaomi_mi_fitness: 2,
    sony: 1,
  };

  for (const record of allRecords) {
    const existing = byDate.get(record.date);
    if (!existing || (sourcePriority[record.source] || 0) > (sourcePriority[existing.source] || 0)) {
      byDate.set(record.date, record);
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get OAuth authorization URL for each provider
 */
export function getOAuthUrl(provider: WearableProvider, clientId: string, redirectUri: string, state: string): string {
  switch (provider) {
    case 'oura':
      return `https://cloud.ouraring.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=daily_read&state=${state}`;

    case 'fitbit':
      return `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=sleep+heartrate&expires_in=604800&state=${state}`;

    case 'google_fit':
      return `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/fitness.sleep.read+https://www.googleapis.com/auth/fitness.heart_rate.read&access_type=offline&state=${state}`;

    case 'apple_health':
      return '';

    case 'samsung_health':
      return `https://account.samsung.com/mobile/account/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=shealth.sleep+shealth.heartrate&state=${state}`;

    case 'huawei_health':
      return `https://oauth-login.cloud.huawei.com/oauth2/v3/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.huawei.com/health/sleep.read&state=${state}`;

    case 'xiaomi_mi_fitness':
      return `https://account.xiaomi.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=miot/sleep.read&state=${state}`;

    case 'garmin_connect':
      // Garmin uses OAuth 1.0a — redirect to a server-side flow
      return `https://connect.garmin.com/oauthConfirm?oauth_callback=${encodeURIComponent(redirectUri)}&state=${state}`;

    case 'withings':
      return `https://account.withings.com/oauth2_user/authorize2?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=user.sleep&state=${state}`;

    case 'amazfit':
      return `https://api-mifit.huami.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=sleep&state=${state}`;

    case 'polar':
      return `https://flow.polar.com/oauth2/authorization?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=accesslink.read_all&state=${state}`;

    case 'sony':
      // No public API available
      return '';

    default:
      return '';
  }
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeOAuthToken(
  provider: WearableProvider,
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<WearableAuth> {
  let tokenUrl = '';
  let body: Record<string, string> = {};

  switch (provider) {
    case 'oura':
      tokenUrl = 'https://api.ouraring.com/oauth/token';
      body = { grant_type: 'authorization_code', code, redirect_uri: redirectUri };
      break;

    case 'fitbit':
      tokenUrl = 'https://api.fitbit.com/oauth2/token';
      body = { grant_type: 'authorization_code', code, redirect_uri: redirectUri };
      break;

    case 'google_fit':
      tokenUrl = 'https://oauth2.googleapis.com/token';
      body = { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret };
      break;

    case 'samsung_health':
      tokenUrl = 'https://auth.samsunghealth.com/oauth2/token';
      body = { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret };
      break;

    case 'huawei_health':
      tokenUrl = 'https://oauth-login.cloud.huawei.com/oauth2/v3/token';
      body = { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret };
      break;

    case 'xiaomi_mi_fitness':
      tokenUrl = 'https://account.xiaomi.com/oauth2/token';
      body = { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret };
      break;

    case 'garmin_connect':
      // Garmin uses OAuth 1.0a — token exchange is server-side
      throw new Error('Garmin Connect uses OAuth 1.0a. Server-side token exchange required.');

    case 'withings':
      tokenUrl = 'https://wbsapi.withings.net/v2/oauth2';
      body = { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret };
      break;

    case 'amazfit':
      tokenUrl = 'https://api-mifit.huami.com/oauth2/token';
      body = { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret };
      break;

    case 'polar':
      tokenUrl = 'https://polarremote.com/v2/oauth2/token';
      body = { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret };
      break;

    default:
      throw new Error(`Token exchange not supported for ${provider}`);
  }

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(provider === 'fitbit' ? { 'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}` } : {}),
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status}`);
  }

  const data = await res.json();

  return {
    provider,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };
}
