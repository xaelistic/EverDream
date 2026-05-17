/**
 * Sleep Education Content & Wind-Down System
 * 
 * Content modules:
 * - Sleep hygiene education (blue light, device use, meditation, routines)
 * - Circadian rhythm education
 * - Dream science & history
 * - Nootropic & supplement info (affiliate-ready)
 * 
 * Wind-down system:
 * - Circadian-based bedtime calculation
 * - Notification scheduling
 * - Bedtime mood check-in
 * - Ambient audio player
 * - Guided meditations
 */

// ============================================================
// SLEEP EDUCATION CONTENT
// ============================================================

export interface EducationModule {
  id: string;
  category: 'sleep_hygiene' | 'circadian' | 'dreams' | 'supplements' | 'environment';
  title: string;
  content: string;
  tips: string[];
  readTimeMinutes: number;
  icon: string;
}

export const SLEEP_EDUCATION_CONTENT: EducationModule[] = [
  {
    id: 'blue-light',
    category: 'sleep_hygiene',
    title: 'Blue Light & Sleep',
    content: `Blue light from screens suppresses melatonin production by up to 50%. 
Your brain interprets blue light as daylight, delaying your natural sleep signal.
The most impactful change you can make is reducing screen exposure 60-90 minutes before bed.
If you must use screens, enable night mode/blue light filters and reduce brightness to minimum.`,
    tips: [
      'Enable night mode on all devices after sunset',
      'Use blue light blocking glasses in the evening',
      'Keep screens out of the bedroom entirely',
      'Replace evening scrolling with reading or journaling',
      'Use dim, warm lighting in your bedroom',
    ],
    readTimeMinutes: 2,
    icon: '📱',
  },
  {
    id: 'sleep-routine',
    category: 'sleep_hygiene',
    title: 'Building a Sleep Routine',
    content: `A consistent sleep routine trains your circadian clock. Going to bed and waking at the same time 
every day (even weekends) is the single most effective sleep improvement strategy.
Your body thrives on predictability. A wind-down routine signals to your brain that sleep is coming.`,
    tips: [
      'Set a fixed wake time and stick to it 7 days a week',
      'Start winding down 60-90 minutes before target bedtime',
      'Create a consistent pre-sleep sequence (e.g. shower, read, meditate)',
      'Avoid caffeine after 2pm (it has a 6-8 hour half-life)',
      'Avoid alcohol within 3 hours of bed (it fragments sleep)',
      'Exercise earlier in the day, not within 4 hours of bedtime',
    ],
    readTimeMinutes: 3,
    icon: '🕐',
  },
  {
    id: 'sleep-environment',
    category: 'environment',
    title: 'Optimizing Your Sleep Environment',
    content: `Your bedroom environment has a profound impact on sleep quality.
The ideal sleep environment is cool (65-68°F / 18-20°C), dark, and quiet.
Even small improvements to your environment can significantly increase deep sleep and REM.`,
    tips: [
      'Keep your bedroom cool: 65-68°F (18-20°C) is optimal',
      'Use blackout curtains or a sleep mask for complete darkness',
      'Use earplugs or white noise to mask sound disruptions',
      'Reserve your bed for sleep and intimacy only',
      'Invest in a comfortable mattress and pillows',
      'Remove clocks from view to reduce sleep anxiety',
    ],
    readTimeMinutes: 2,
    icon: '🛏️',
  },
  {
    id: 'circadian-rhythm',
    category: 'circadian',
    title: 'Understanding Your Circadian Rhythm',
    content: `Your circadian rhythm is a 24-hour internal clock that regulates sleep, hormones, and metabolism.
It\'s primarily set by light exposure. Morning light advances your clock (earlier bedtime), 
while evening light delays it (later bedtime).
Your chronotype (early bird vs night owl) is genetically determined but can be shifted gradually.`,
    tips: [
      'Get 10-30 minutes of bright light within 30 minutes of waking',
      'Avoid bright/blue light 2-3 hours before bed',
      'Eat meals at consistent times to reinforce your rhythm',
      'If shifting your schedule, move bedtime by 15 min per day',
      'Track your energy levels to find your natural peak times',
    ],
    readTimeMinutes: 3,
    icon: '🌅',
  },
  {
    id: 'dream-science',
    category: 'dreams',
    title: 'The Science of Dreams',
    content: `Dreams occur primarily during REM (Rapid Eye Movement) sleep, which makes up about 20-25% of adult sleep.
REM sleep is crucial for memory consolidation, emotional processing, and creativity.
You have 4-6 REM periods per night, with later ones being longer and more vivid.
Lucid dreaming - being aware you\'re dreaming - can be trained with practice.`,
    tips: [
      'Keep a dream journal to improve dream recall',
      'Reality checks during the day increase lucid dreaming chances',
      'MILD technique: As you fall asleep, repeat "I will remember I\'m dreaming"',
      'Wake-back-to-bed: Wake after 5 hours, stay awake 30 min, go back to sleep',
      'Vitamin B6 before bed may increase dream vividness',
    ],
    readTimeMinutes: 3,
    icon: '🧠',
  },
  {
    id: 'meditation-sleep',
    category: 'sleep_hygiene',
    title: 'Meditation for Better Sleep',
    content: `Meditation activates your parasympathetic nervous system, reducing cortisol and preparing your body for sleep.
Even 10 minutes of meditation before bed can improve sleep quality.
Body scan meditation is particularly effective for sleep as it releases physical tension.`,
    tips: [
      'Start with just 5 minutes of guided meditation before bed',
      'Try body scan meditation to release physical tension',
      'Focus on slow, deep breathing (4-7-8 technique)',
      'Use a meditation app with sleep-specific content',
      'Practice consistently - benefits compound over time',
    ],
    readTimeMinutes: 2,
    icon: '🧘',
  },
  {
    id: 'food-sleep',
    category: 'sleep_hygiene',
    title: 'Food, Drink & Sleep',
    content: `What you eat and drink significantly impacts sleep quality.
Heavy meals close to bedtime can cause discomfort and disrupt sleep.
Certain foods contain sleep-promoting nutrients like tryptophan, magnesium, and melatonin.`,
    tips: [
      'Avoid large meals within 3 hours of bedtime',
      'Limit caffeine to before 2pm (coffee, tea, chocolate, some medications)',
      'Alcohol may help you fall asleep but fragments sleep later in the night',
      'Tart cherry juice is a natural source of melatonin',
      'Magnesium-rich foods (nuts, seeds, leafy greens) support sleep',
      'A light snack with complex carbs + protein can promote sleepiness',
    ],
    readTimeMinutes: 2,
    icon: '🍽️',
  },
  {
    id: 'exercise-sleep',
    category: 'sleep_hygiene',
    title: 'Exercise & Sleep Quality',
    content: `Regular exercise is one of the best things you can do for sleep.
It increases deep sleep, reduces sleep onset latency, and improves sleep efficiency.
However, timing matters - vigorous exercise too close to bedtime can be stimulating.`,
    tips: [
      'Aim for at least 30 minutes of moderate exercise most days',
      'Morning or afternoon exercise is ideal for sleep',
      'If exercising evening, finish at least 3 hours before bed',
      'Yoga and stretching are great for evening wind-down',
      'Even a 10-minute walk improves sleep quality',
    ],
    readTimeMinutes: 2,
    icon: '🏃',
  },
  {
    id: 'nootropics',
    category: 'supplements',
    title: 'Supplements for Sleep & Dreams',
    content: `Certain supplements can support sleep quality and dream vividness.
Always consult a healthcare provider before starting any supplement regimen.
Start with the lowest effective dose and track your response.`,
    tips: [
      'Magnesium glycinate (200-400mg) - promotes relaxation and deep sleep',
      'L-theanine (100-200mg) - promotes calm focus, reduces anxiety',
      'Melatonin (0.5-3mg) - helps regulate sleep timing, not a sedative',
      'Ashwagandha (300-600mg) - adaptogen that reduces cortisol',
      'Vitamin B6 (100mg) - may increase dream vividness and recall',
      'Glycine (3g) - amino acid that improves sleep quality',
      'Tart cherry juice - natural melatonin source',
    ],
    readTimeMinutes: 3,
    icon: '💊',
  },
];

// ============================================================
// GUIDED MEDITATIONS
// ============================================================

export interface GuidedMeditation {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  category: 'sleep' | 'relaxation' | 'body_scan' | 'breathing' | 'visualization';
  script: string[];  // Spoken word script, paragraph by paragraph
  backgroundSound: 'rain' | 'ocean' | 'forest' | 'white_noise' | 'pink_noise' | 'none';
}

export const GUIDED_MEDITATIONS: GuidedMeditation[] = [
  {
    id: 'body-scan-sleep',
    title: 'Body Scan for Sleep',
    description: 'A progressive relaxation technique that releases tension from head to toe',
    durationMinutes: 15,
    category: 'body_scan',
    backgroundSound: 'pink_noise',
    script: [
      'Welcome to this body scan meditation for sleep. Find a comfortable position, lying down if possible. Close your eyes and take three deep breaths...',
      'Breathing in calm... breathing out tension. With each exhale, feel yourself sinking deeper into relaxation.',
      'Now bring your attention to the top of your head. Notice any sensations there. Soften the muscles of your forehead, your temples, your scalp.',
      'Let your eyes relax deeply in their sockets. Release any tension in your jaw - let your teeth part slightly. Feel your tongue rest gently in your mouth.',
      'Move your attention down to your neck and shoulders. These areas often hold stress. Imagine warmth flowing into them, melting away all tightness.',
      'Feel your arms becoming heavy. Let them rest wherever they are. Relax your hands, your fingers. Feel a warm, heavy sensation spreading through them.',
      'Now your chest. Feel it rise and fall with each breath. There is nothing to do here but breathe. Let each breath be easy and natural.',
      'Soften your stomach. Let go of any holding or tension there. Feel your back releasing into the surface beneath you.',
      'Move your attention to your hips and pelvis. Let them be heavy and relaxed. Feel your thighs softening, your knees unlocking.',
      'Your calves, your ankles, your feet. Feel them becoming warm and heavy. Let your toes spread and relax completely.',
      'Now your entire body is relaxed. Feel yourself sinking into a place of deep rest. There is nowhere to go, nothing to do.',
      'If your mind wanders, gently bring it back to the sensation of relaxation. You are safe. You are at rest.',
      'Allow yourself to drift now... into peaceful, restorative sleep...',
    ],
  },
  {
    id: '4-7-8-breathing',
    title: '4-7-8 Breathing',
    description: 'A natural tranquilizer for the nervous system',
    durationMinutes: 5,
    category: 'breathing',
    backgroundSound: 'ocean',
    script: [
      'This is the 4-7-8 breathing technique, developed by Dr. Andrew Weil. It acts as a natural tranquilizer for the nervous system.',
      'Sit or lie comfortably. Place the tip of your tongue against the ridge behind your upper front teeth.',
      'Now exhale completely through your mouth, making a whoosh sound.',
      'Close your mouth and inhale quietly through your nose for 4 counts... 1... 2... 3... 4...',
      'Hold your breath for 7 counts... 1... 2... 3... 4... 5... 6... 7...',
      'Exhale completely through your mouth for 8 counts... 1... 2... 3... 4... 5... 6... 7... 8...',
      'That\'s one cycle. Let\'s do three more.',
      'Inhale for 4... hold for 7... exhale for 8...',
      'Again. Inhale for 4... hold for 7... exhale for 8...',
      'One more time. Inhale for 4... hold for 7... exhale for 8...',
      'Notice how your body feels. Calmer, heavier, more relaxed. Let this feeling carry you toward sleep.',
    ],
  },
  {
    id: 'dream-visualization',
    title: 'Dream Garden Visualization',
    description: 'A peaceful visualization to guide your dreams',
    durationMinutes: 10,
    category: 'visualization',
    backgroundSound: 'forest',
    script: [
      'Close your eyes and imagine yourself standing at the entrance to a beautiful garden at twilight.',
      'The air is warm and gentle. You can hear birds settling in for the night and leaves rustling softly.',
      'As you walk along a winding path, you notice the flowers are glowing softly in the fading light. Each one represents a dream you\'ve had.',
      'You come to a still, clear pond. Looking into it, you see reflections of your memories, your hopes, your imagination.',
      'Sit beside the pond. Feel the earth beneath you, solid and supportive. The sky above is deepening to indigo.',
      'Stars begin to appear. Each one is a possibility, a story waiting to unfold in your dreams tonight.',
      'Feel yourself becoming lighter, as if you could float among the stars. You are safe, you are free.',
      'As you drift, know that your dreams tonight will be vivid, meaningful, and that you will remember them.',
      'Let the garden hold you as you drift into peaceful, dream-filled sleep...',
    ],
  },
  {
    id: 'progressive-relaxation',
    title: 'Progressive Muscle Relaxation',
    description: 'Systematically tense and release each muscle group',
    durationMinutes: 12,
    category: 'body_scan',
    backgroundSound: 'rain',
    script: [
      'Welcome to progressive muscle relaxation. This technique involves tensing and then releasing each muscle group.',
      'Start with your feet. Curl your toes tightly, hold for 5 seconds... and release. Notice the difference between tension and relaxation.',
      'Now your calves. Point your toes toward you, tightening the muscles... hold... and release.',
      'Your thighs. Squeeze your leg muscles tight... hold... and let go completely.',
      'Your hands. Make tight fists... hold... and release. Feel the warmth flowing into your fingers.',
      'Your arms. Bend your elbows and tense your biceps... hold... and let them drop heavily.',
      'Your shoulders. Raise them up toward your ears... hold... and let them drop. Feel the weight release.',
      'Your face. Scrunch all your facial muscles together... hold... and smooth everything out.',
      'Finally, tense your entire body at once... hold... and release everything.',
      'Your whole body is now deeply relaxed. Let yourself drift into sleep...',
    ],
  },
];

// ============================================================
// AMBIENT SOUNDS
// ============================================================

export interface AmbientSound {
  id: string;
  name: string;
  category: 'nature' | 'white_noise' | 'music' | 'binaural';
  description: string;
  icon: string;
  // In a real app, these would be audio file URLs or generated via Web Audio API
  frequency?: number;  // For binaural beats
  baseFrequency?: number;
}

export const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: 'rain-heavy', name: 'Heavy Rain', category: 'nature', description: 'Steady rainfall on a roof', icon: '🌧️' },
  { id: 'rain-light', name: 'Light Rain', category: 'nature', description: 'Gentle raindrops', icon: '🌦️' },
  { id: 'ocean-waves', name: 'Ocean Waves', category: 'nature', description: 'Rhythmic ocean waves', icon: '🌊' },
  { id: 'forest-night', name: 'Forest at Night', category: 'nature', description: 'Crickets and gentle wind', icon: '🌲' },
  { id: 'stream', name: 'Mountain Stream', category: 'nature', description: 'Flowing water over rocks', icon: '🏞️' },
  { id: 'thunder', name: 'Distant Thunder', category: 'nature', description: 'Gentle thunder and rain', icon: '⛈️' },
  { id: 'white-noise', name: 'White Noise', category: 'white_noise', description: 'Consistent broadband noise', icon: '📻' },
  { id: 'pink-noise', name: 'Pink Noise', category: 'white_noise', description: 'Softer, deeper white noise', icon: '🎵' },
  { id: 'brown-noise', name: 'Brown Noise', category: 'white_noise', description: 'Deep, rumbling noise', icon: '🔊' },
  { id: 'fan', name: 'Fan Sound', category: 'white_noise', description: 'Consistent fan hum', icon: '🌀' },
  { id: 'binaural-delta', name: 'Delta Binaural (0.5-4Hz)', category: 'binaural', description: 'Deep sleep promotion', icon: '🧠', frequency: 200, baseFrequency: 204 },
  { id: 'binaural-theta', name: 'Theta Binaural (4-8Hz)', category: 'binaural', description: 'Relaxation and meditation', icon: '🧠', frequency: 200, baseFrequency: 206 },
  { id: 'drone-c', name: 'C Drone (130Hz)', category: 'music', description: 'Deep, calming drone', icon: '🎶' },
  { id: 'singing-bowls', name: 'Singing Bowls', category: 'music', description: 'Tibetan singing bowls', icon: '🔔' },
];

// ============================================================
// CIRCADIAN & BEDTIME CALCULATIONS
// ============================================================

export interface CircadianProfile {
  chronotype: 'extreme_early' | 'moderate_early' | 'intermediate' | 'moderate_late' | 'extreme_late';
  naturalSleepTime: string;  // HH:MM in 24h format
  naturalWakeTime: string;   // HH:MM in 24h format
  targetSleepHours: number;
  windDownMinutes: number;
}

/**
 * Calculate optimal bedtime based on wake time and sleep need
 */
export function calculateBedtime(wakeTime: string, targetHours: number): string {
  const [hours, minutes] = wakeTime.split(':').map(Number);
  const wakeMinutes = hours * 60 + minutes;
  const bedMinutes = wakeMinutes - targetHours * 60;
  
  // Handle wrap-around (bedtime is previous day)
  const normalized = ((bedMinutes % 1440) + 1440) % 1440;
  const bedHours = Math.floor(normalized / 60);
  const bedMins = normalized % 60;
  
  return `${bedHours.toString().padStart(2, '0')}:${bedMins.toString().padStart(2, '0')}`;
}

/**
 * Calculate wind-down notification time
 */
export function calculateWindDownTime(bedtime: string, windDownMinutes: number): string {
  const [hours, minutes] = bedtime.split(':').map(Number);
  const bedMinutes = hours * 60 + minutes;
  const windDown = bedMinutes - windDownMinutes;
  
  const normalized = ((windDown % 1440) + 1440) % 1440;
  const wdHours = Math.floor(normalized / 60);
  const wdMins = normalized % 60;
  
  return `${wdHours.toString().padStart(2, '0')}:${wdMins.toString().padStart(2, '0')}`;
}

/**
 * Estimate chronotype from sleep data
 */
export function estimateChronotype(sleepHistory: Array<{ bedtime: string; wakeTime: string }>): CircadianProfile {
  if (sleepHistory.length < 3) {
    return {
      chronotype: 'intermediate',
      naturalSleepTime: '22:30',
      naturalWakeTime: '06:30',
      targetSleepHours: 8,
      windDownMinutes: 60,
    };
  }

  // Calculate average midpoint of sleep
  let totalMidpointMinutes = 0;
  for (const entry of sleepHistory) {
    const [bedH, bedM] = entry.bedtime.split(':').map(Number);
    const [wakeH, wakeM] = entry.wakeTime.split(':').map(Number);
    
    const bedMinutes = bedH * 60 + bedM;
    let wakeMinutes = wakeH * 60 + wakeM;
    if (wakeMinutes < bedMinutes) wakeMinutes += 1440; // Crossed midnight
    
    const duration = wakeMinutes - bedMinutes;
    const midpoint = bedMinutes + duration / 2;
    totalMidpointMinutes += midpoint % 1440;
  }

  const avgMidpoint = totalMidpointMinutes / sleepHistory.length;
  const midpointHours = Math.floor(avgMidpoint / 60);
  const midpointMins = Math.round(avgMidpoint % 60);

  // Classify chronotype based on sleep midpoint
  // Early bird: midpoint before 2:30am
  // Intermediate: 2:30am - 5:00am
  // Night owl: after 5:00am
  let chronotype: CircadianProfile['chronotype'];
  if (midpointHours < 2 || (midpointHours === 2 && midpointMins < 30)) {
    chronotype = 'extreme_early';
  } else if (midpointHours < 3) {
    chronotype = 'moderate_early';
  } else if (midpointHours < 5) {
    chronotype = 'intermediate';
  } else if (midpointHours < 6) {
    chronotype = 'moderate_late';
  } else {
    chronotype = 'extreme_late';
  }

  // Calculate average duration
  let totalDuration = 0;
  for (const entry of sleepHistory) {
    const [bedH, bedM] = entry.bedtime.split(':').map(Number);
    const [wakeH, wakeM] = entry.wakeTime.split(':').map(Number);
    const bedMinutes = bedH * 60 + bedM;
    let wakeMinutes = wakeH * 60 + wakeM;
    if (wakeMinutes < bedMinutes) wakeMinutes += 1440;
    totalDuration += (wakeMinutes - bedMinutes) / 60;
  }
  const avgDuration = totalDuration / sleepHistory.length;

  // Calculate natural sleep/wake times
  let totalBedMinutes = 0;
  let totalWakeMinutes = 0;
  for (const entry of sleepHistory) {
    const [bedH, bedM] = entry.bedtime.split(':').map(Number);
    const [wakeH, wakeM] = entry.wakeTime.split(':').map(Number);
    totalBedMinutes += bedH * 60 + bedM;
    totalWakeMinutes += wakeH * 60 + wakeM;
  }

  const avgBed = Math.round(totalBedMinutes / sleepHistory.length) % 1440;
  const avgWake = Math.round(totalWakeMinutes / sleepHistory.length) % 1440;

  const bedH = Math.floor(avgBed / 60).toString().padStart(2, '0');
  const bedM = (avgBed % 60).toString().padStart(2, '0');
  const wakeH = Math.floor(avgWake / 60).toString().padStart(2, '0');
  const wakeM = (avgWake % 60).toString().padStart(2, '0');

  return {
    chronotype,
    naturalSleepTime: `${bedH}:${bedM}`,
    naturalWakeTime: `${wakeH}:${wakeM}`,
    targetSleepHours: Math.round(avgDuration * 2) / 2, // Round to nearest 0.5
    windDownMinutes: 60,
  };
}

/**
 * Get chronotype description
 */
export function getChronotypeDescription(chronotype: CircadianProfile['chronotype']): string {
  const descriptions: Record<string, string> = {
    extreme_early: 'Extreme Early Bird - You naturally wake before 5am and feel best going to bed by 9pm',
    moderate_early: 'Moderate Early Bird - You prefer waking around 5:30-6:30am and bedtime around 9:30-10:30pm',
    intermediate: 'Intermediate - Your natural rhythm aligns with conventional schedules',
    moderate_late: 'Moderate Night Owl - You prefer waking around 7:30-8:30am and bedtime around 11pm-midnight',
    extreme_late: 'Extreme Night Owl - You naturally wake after 9am and feel best going to bed after midnight',
  };
  return descriptions[chronotype] || descriptions.intermediate;
}

// ============================================================
// NOTIFICATION SCHEDULING
// ============================================================

export interface NotificationSchedule {
  id: string;
  type: 'wind_down' | 'bedtime' | 'morning' | 'mood_check';
  time: string;  // HH:MM
  enabled: boolean;
  message: string;
  abTestVariant?: string;
}

/**
 * Generate default notification schedule based on circadian profile
 */
export function generateNotificationSchedule(profile: CircadianProfile): NotificationSchedule[] {
  const windDownTime = calculateWindDownTime(profile.naturalSleepTime, profile.windDownMinutes);
  const [windH, windM] = windDownTime.split(':').map(Number);
  
  // Morning notification = wake time
  const [wakeH, wakeM] = profile.naturalWakeTime.split(':').map(Number);

  return [
    {
      id: 'wind-down',
      type: 'wind_down',
      time: windDownTime,
      enabled: true,
      message: 'Time to start winding down for sleep. Check out tonight\'s sleep hygiene tips.',
    },
    {
      id: 'bedtime',
      type: 'bedtime',
      time: profile.naturalSleepTime,
      enabled: true,
      message: 'It\'s your optimal bedtime. Sweet dreams!',
    },
    {
      id: 'morning',
      type: 'morning',
      time: profile.naturalWakeTime,
      enabled: true,
      message: 'Good morning! How did you sleep? Did you dream?',
    },
    {
      id: 'mood-check',
      type: 'mood_check',
      time: `${(windH + 1).toString().padStart(2, '0')}:${windM.toString().padStart(2, '0')}`,
      enabled: true,
      message: 'How are you feeling right now? Check in before sleep.',
    },
  ];
}

/**
 * Request notification permission and schedule
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') return true;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Show a notification (works when app is in background via Service Worker)
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  new Notification(title, {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    ...options,
  });
}
