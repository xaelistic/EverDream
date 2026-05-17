/**
 * Interactive Dream Element System
 *
 * Each dream symbol/object becomes a gamified interactive element in VR.
 * Users can manipulate objects to explore deeper layers of interpretation.
 *
 * Interactions:
 * - Scale (bigger/smaller)  -- "What if this was more/less prominent in your dream?"
 * - Rotate/Move             -- "Change your perspective on this"
 * - Light (change lighting) -- "How does the mood change with different light?"
 * - Break/Shatter           -- "What happens when you break this symbol?"
 * - Combine (merge two)      -- "What do these symbols mean together?"
 * - Paint/Recolor           -- "What color does this feel like?"
 * - Float/Sink              -- "Does this feel heavy or light?"
 * - Duplicate               -- "What if there were more of these?"
 * - Freeze/Animate          -- "Is this static or dynamic?"
 * - Interpret (AI overlay)  -- "What might this symbol mean?"
 *
 * Each interaction generates an "insight" that gets saved to the dream journal.
 */

import React, { useState, useCallback } from 'react';

// ============================================================
// TYPES
// ============================================================

export type InteractionType =
  | 'select'
  | 'deselect'
  | 'scale_up'
  | 'scale_down'
  | 'rotate_x'
  | 'rotate_y'
  | 'rotate_z'
  | 'move'
  | 'light'
  | 'break'
  | 'combine'
  | 'paint'
  | 'float'
  | 'sink'
  | 'duplicate'
  | 'freeze'
  | 'animate'
  | 'interpret';

export interface DreamElement {
  id: string;
  symbol: string;              // e.g., "dolphin", "ocean", "flying"
  label: string;               // Display name
  description?: string;        // AI-generated description
  modelUrl?: string;           // 3D model URL
  thumbnailUrl?: string;       // Thumbnail for UI
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
  emissive: string;
  opacity: number;
  isFloating: boolean;
  isFrozen: boolean;
  isBroken: boolean;
  isSelected: boolean;
  metadata: {
    emotionalWeight: number;   // 0-1, how emotionally significant
    lucidityRelevance: number; // 0-1, relevance to lucidity
    recurrence: number;        // How often this symbol appears across dreams
    personalMeaning?: string;  // User's own interpretation
    aiInterpretation?: string; // AI-generated interpretation
  };
  interactionHistory: InteractionRecord[];
  insights: Insight[];
}

export interface InteractionRecord {
  id: string;
  type: InteractionType;
  timestamp: string;
  duration?: number;           // How long the interaction lasted
  value?: number;              // Numeric value if applicable (e.g., scale factor)
  metadata?: Record<string, unknown>;
}

export interface Insight {
  id: string;
  elementId: string;
  type: 'interpretation' | 'pattern' | 'emotion' | 'suggestion';
  title: string;
  content: string;
  source: 'user' | 'ai' | 'system';
  interactionType: InteractionType;
  timestamp: string;
  isBookmarked: boolean;
}

export interface DreamInterpretationSession {
  id: string;
  dreamId: string;
  elements: DreamElement[];
  insights: Insight[];
  startedAt: string;
  lastInteractionAt: string;
  totalInteractions: number;
  depth: number;               // How deep the user has gone (0-100)
  mood: 'exploring' | 'reflecting' | 'breaking' | 'creating' | 'completing';
}

// ============================================================
// INTERACTION ENGINE
// ============================================================

/**
 * Process an interaction and generate insights.
 */
export function processInteraction(
  element: DreamElement,
  interactionType: InteractionType,
  context: {
    dreamEmotion?: string;
    dreamCategory?: string;
    dreamThemes?: string[];
    lucidityLevel?: number;
    previousInteractions?: InteractionRecord[];
  }
): { element: DreamElement; insight?: Insight } {
  const now = new Date().toISOString();
  const record: InteractionRecord = {
    id: crypto.randomUUID(),
    type: interactionType,
    timestamp: now,
  };

  const updatedElement: DreamElement = {
    ...element,
    interactionHistory: [...element.interactionHistory, record],
  };

  let insight: Insight | undefined;

  switch (interactionType) {
    case 'scale_up': {
      updatedElement.scale = Math.min(3, element.scale * 1.3);
      insight = generateScaleInsight(element, 'up', context);
      break;
    }
    case 'scale_down': {
      updatedElement.scale = Math.max(0.2, element.scale / 1.3);
      insight = generateScaleInsight(element, 'down', context);
      break;
    }
    case 'rotate_y':
    case 'rotate_x':
    case 'rotate_z': {
      const axis = interactionType.split('_')[1] as 'x' | 'y' | 'z';
      const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
      updatedElement.rotation = [...element.rotation];
      updatedElement.rotation[idx] += Math.PI / 4;
      insight = generateRotationInsight(element, axis, context);
      break;
    }
    case 'light': {
      // Cycle through lighting moods
      const lightMoods = ['#ffffff', '#fbbf24', '#60a5fa', '#a78bfa', '#34d399', '#f87171'];
      const currentIdx = lightMoods.indexOf(element.color);
      updatedElement.color = lightMoods[(currentIdx + 1) % lightMoods.length];
      updatedElement.emissive = updatedElement.color;
      insight = generateLightInsight(element, updatedElement.color, context);
      break;
    }
    case 'break': {
      updatedElement.isBroken = true;
      updatedElement.opacity = 0.5;
      insight = generateBreakInsight(element, context);
      break;
    }
    case 'float': {
      updatedElement.isFloating = true;
      insight = generateFloatInsight(element, 'up', context);
      break;
    }
    case 'sink': {
      updatedElement.isFloating = false;
      updatedElement.position = [
        element.position[0],
        Math.max(0.1, element.position[1] - 0.5),
        element.position[2],
      ];
      insight = generateFloatInsight(element, 'down', context);
      break;
    }
    case 'paint': {
      const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#ec4899'];
      const currentIdx = colors.indexOf(element.color);
      updatedElement.color = colors[(currentIdx + 1) % colors.length];
      insight = generatePaintInsight(element, updatedElement.color, context);
      break;
    }
    case 'duplicate': {
      // This would create a new element in the scene
      insight = generateDuplicateInsight(element, context);
      break;
    }
    case 'freeze': {
      updatedElement.isFrozen = !element.isFrozen;
      insight = generateFreezeInsight(element, updatedElement.isFrozen, context);
      break;
    }
    case 'interpret': {
      insight = generateInterpretationInsight(element, context);
      break;
    }
    default:
      break;
  }

  if (insight) {
    updatedElement.insights = [...element.insights, insight];
  }

  return { element: updatedElement, insight };
}

// ============================================================
// INSIGHT GENERATORS
// ============================================================

function generateScaleInsight(
  element: DreamElement,
  direction: 'up' | 'down',
  context: { dreamEmotion?: string; dreamThemes?: string[] }
): Insight {
  const interpretations: Record<string, Record<string, string>> = {
    up: {
      default: `Making "${element.label}" larger suggests this element holds significant weight in your dream. What would it mean if this was even more prominent?`,
      dolphin: `Enlarging the dolphin might represent a desire for more playfulness, intelligence, or spiritual guidance in your life.`,
      ocean: `A larger ocean could symbolize overwhelming emotions or vast unconscious depths you're ready to explore.`,
      flying: `Expanding the flying sensation suggests a strong desire for freedom or transcendence.`,
      water: `Larger water elements often reflect the scale of emotions you're processing.`,
      animal: `Making this animal bigger might mean its qualities (strength, instinct, wildness) are becoming more important to you.`,
    },
    down: {
      default: `Making "${element.label}" smaller might mean you're trying to minimize its importance, or perhaps you're gaining perspective on it.`,
      dolphin: `Shrinking the dolphin could suggest you're feeling less connected to your playful or intuitive side.`,
      ocean: `A smaller ocean might mean you're feeling more in control of your emotions.`,
      flying: `Reducing the flying element could suggest grounding yourself or feeling less free.`,
      water: `Smaller water might indicate emotional containment or a need for calm.`,
      animal: `Making this animal smaller could mean you're taming its wild qualities or feeling less threatened.`,
    },
  };

  const symbolKey = element.symbol.toLowerCase();
  const content = interpretations[direction][symbolKey] || interpretations[direction].default;

  return {
    id: crypto.randomUUID(),
    elementId: element.id,
    type: 'interpretation',
    title: direction === 'up' ? `Expanding ${element.label}` : `Reducing ${element.label}`,
    content,
    source: 'ai',
    interactionType: direction === 'up' ? 'scale_up' : 'scale_down',
    timestamp: new Date().toISOString(),
    isBookmarked: false,
  };
}

function generateRotationInsight(
  element: DreamElement,
  axis: string,
  context: { dreamEmotion?: string }
): Insight {
  return {
    id: crypto.randomUUID(),
    elementId: element.id,
    type: 'suggestion',
    title: `New perspective on ${element.label}`,
    content: `Rotating "${element.label}" on the ${axis}-axis changes your viewpoint. In dreams, shifting perspective often reveals hidden aspects. What do you see from this new angle?`,
    source: 'system',
    interactionType: `rotate_${axis}` as InteractionType,
    timestamp: new Date().toISOString(),
    isBookmarked: false,
  };
}

function generateLightInsight(
  element: DreamElement,
  color: string,
  context: { dreamEmotion?: string }
): Insight {
  const colorMeanings: Record<string, string> = {
    '#ffffff': 'White light brings clarity and truth. How does this element look in pure light?',
    '#fbbf24': 'Golden light suggests warmth, wisdom, and optimism. This element feels inviting.',
    '#60a5fa': 'Blue light brings calm and introspection. A cooler, more analytical view.',
    '#a78bfa': 'Purple light connects to intuition and spirituality. A mystical perspective.',
    '#34d399': 'Green light suggests growth, healing, and nature. A renewing energy.',
    '#f87171': 'Red light brings intensity, passion, or warning. This element demands attention.',
  };

  return {
    id: crypto.randomUUID(),
    elementId: element.id,
    type: 'emotion',
    title: `Lighting change: ${element.label}`,
    content: colorMeanings[color] || `Changing the light on "${element.label}" alters its emotional quality.`,
    source: 'system',
    interactionType: 'light',
    timestamp: new Date().toISOString(),
    isBookmarked: false,
  };
}

function generateBreakInsight(
  element: DreamElement,
  context: { dreamEmotion?: string; dreamCategory?: string }
): Insight {
  return {
    id: crypto.randomUUID(),
    elementId: element.id,
    type: 'interpretation',
    title: `Breaking ${element.label}`,
    content: `You chose to break "${element.label}". In dream work, breaking a symbol can represent:
- Releasing its power over you
- Understanding its fragility
- Transforming it into something new
- Confronting a fear

What does breaking this symbol feel like? Sometimes destruction in dreams is actually liberation.`,
    source: 'ai',
    interactionType: 'break',
    timestamp: new Date().toISOString(),
    isBookmarked: false,
  };
}

function generateFloatInsight(
  element: DreamElement,
  direction: 'up' | 'down',
  context: { dreamEmotion?: string }
): Insight {
  if (direction === 'up') {
    return {
      id: crypto.randomUUID(),
      elementId: element.id,
      type: 'interpretation',
      title: `Floating ${element.label}`,
      content: `Making "${element.label}" float suggests lightness, freedom, or detachment. This element rises above the dream landscape -- perhaps it represents something you're rising above, or a quality that lifts you.`,
      source: 'ai',
      interactionType: 'float',
      timestamp: new Date().toISOString(),
      isBookmarked: false,
    };
  }
  return {
    id: crypto.randomUUID(),
    elementId: element.id,
    type: 'interpretation',
    title: `Sinking ${element.label}`,
    content: `Letting "${element.label}" sink suggests grounding, heaviness, or something pulling you down. This element descends -- perhaps it represents a weight you're carrying, or something that needs to settle.`,
    source: 'ai',
    interactionType: 'sink',
    timestamp: new Date().toISOString(),
    isBookmarked: false,
  };
}

function generatePaintInsight(
  element: DreamElement,
  color: string,
  context: { dreamEmotion?: string }
): Insight {
  return {
    id: crypto.randomUUID(),
    elementId: element.id,
    type: 'emotion',
    title: `Recoloring ${element.label}`,
    content: `You painted "${element.label}" a new color. Color in dreams is deeply personal -- there's no universal meaning. But the act of changing color suggests you're actively reshaping how you relate to this symbol. What does this new color mean to you?`,
    source: 'system',
    interactionType: 'paint',
    timestamp: new Date().toISOString(),
    isBookmarked: false,
  };
}

function generateDuplicateInsight(
  element: DreamElement,
  context: { dreamEmotion?: string }
): Insight {
  return {
    id: crypto.randomUUID(),
    elementId: element.id,
    type: 'suggestion',
    title: `Multiplying ${element.label}`,
    content: `Creating another "${element.label}" suggests this symbol's energy wants to expand. In dreams, multiplication can mean:
- This quality is growing in your life
- You need more of what this represents
- The message is being amplified
- Something is reproducing or spreading

What would it mean to have more of this in your dream?`,
    source: 'ai',
    interactionType: 'duplicate',
    timestamp: new Date().toISOString(),
    isBookmarked: false,
  };
}

function generateFreezeInsight(
  element: DreamElement,
  isFrozen: boolean,
  context: { dreamEmotion?: string }
): Insight {
  if (isFrozen) {
    return {
      id: crypto.randomUUID(),
      elementId: element.id,
      type: 'suggestion',
      title: `Freezing ${element.label}`,
      content: `You froze "${element.label}" in place. This can represent wanting to hold onto something, stop change, or examine it more closely. What happens when this element can't move?`,
      source: 'system',
      interactionType: 'freeze',
      timestamp: new Date().toISOString(),
      isBookmarked: false,
    };
  }
  return {
    id: crypto.randomUUID(),
    elementId: element.id,
    type: 'suggestion',
    title: `Unfreezing ${element.label}`,
    content: `You released "${element.label}" from its frozen state. Things start moving again -- perhaps a sign that you're ready to let this element play its natural role in your dream.`,
    source: 'system',
    interactionType: 'freeze',
    timestamp: new Date().toISOString(),
    isBookmarked: false,
  };
}

function generateInterpretationInsight(
  element: DreamElement,
  context: { dreamEmotion?: string; dreamCategory?: string; dreamThemes?: string[]; lucidityLevel?: number }
): Insight {
  const symbolInterpretations: Record<string, string> = {
    dolphin: 'Dolphins in dreams often represent intelligence, playfulness, spiritual guidance, and emotional depth. They navigate between worlds (water and air), suggesting you\'re bridging conscious and unconscious mind.',
    ocean: 'The ocean symbolizes the unconscious mind, vast emotions, the unknown, and the collective. Its state (calm, stormy, deep) reflects your emotional landscape.',
    flying: 'Flying represents freedom, transcendence, ambition, and rising above limitations. It can also indicate a desire to escape or gain perspective on a situation.',
    water: 'Water is the universal symbol for emotions, the unconscious, purification, and life force. Clear water suggests clarity; murky water suggests confusion.',
    fire: 'Fire represents transformation, passion, destruction, purification, and energy. It can be creative or destructive depending on context.',
    tree: 'Trees symbolize growth, life, connection (roots to branches), family, and personal development. A tree\'s health reflects your own.',
    door: 'Doors represent opportunities, transitions, choices, and the unknown. An open door invites; a closed door challenges.',
    mirror: 'Mirrors represent self-reflection, truth, identity, and how you see yourself. A cracked mirror might suggest a fractured self-image.',
    animal: 'Animals in dreams often represent instincts, untamed aspects of self, or qualities you admire/fear. The specific animal adds nuance.',
    house: 'Houses represent the self, with different rooms as aspects of personality. The basement is the unconscious; the attic is higher consciousness.',
    car: 'Cars represent your drive through life, control, and direction. Who\'s driving? Is the car working well?',
    bridge: 'Bridges represent transitions, connections, overcoming obstacles, and moving between states of being.',
    mountain: 'Mountains represent challenges, achievements, spiritual ascent, and obstacles. Climbing suggests ambition; standing on top suggests accomplishment.',
    bird: 'Birds represent freedom, perspective, spiritual messages, and the soul. Different birds carry different meanings (eagle = power, owl = wisdom).',
    snake: 'Snakes represent transformation (shedding skin), hidden fears, healing (caduceus), wisdom, and primal energy. They can be threatening or healing.',
    flower: 'Flowers represent beauty, growth, fragility, and blossoming potential. Their state (blooming, wilting) reflects the state of something in your life.',
    moon: 'The moon represents intuition, the feminine, cycles, emotions, and the unconscious. Its phase adds meaning (new = beginnings, full = culmination).',
    sun: 'The sun represents consciousness, vitality, masculine energy, clarity, and life force. It illuminates what the moon hides.',
    key: 'Keys represent access, solutions, secrets, and unlocking potential. What might this key open?',
    clock: 'Clocks represent time pressure, mortality, cycles, and the passage of time. A stopped clock might suggest timelessness or urgency.',
  };

  const symbolKey = element.symbol.toLowerCase();
  const interpretation = symbolInterpretations[symbolKey] ||
    `"${element.label}" is a powerful dream symbol. Its meaning is deeply personal -- what does it mean to you? Consider what you associate with this element in your waking life.`;

  return {
    id: crypto.randomUUID(),
    elementId: element.id,
    type: 'interpretation',
    title: `Interpreting: ${element.label}`,
    content: interpretation,
    source: 'ai',
    interactionType: 'interpret',
    timestamp: new Date().toISOString(),
    isBookmarked: false,
  };
}

// ============================================================
// ELEMENT FACTORY
// ============================================================

/**
 * Create dream elements from dream analysis data.
 */
export function createDreamElements(analysis: {
  symbols: string[];
  themes: string[];
  emotion: string;
  category: string;
  nugget?: string;
}): DreamElement[] {
  const elements: DreamElement[] = [];

  // Create an element for each symbol
  for (let i = 0; i < analysis.symbols.length; i++) {
    const symbol = analysis.symbols[i];
    const angle = (i / analysis.symbols.length) * Math.PI * 2;
    const radius = 2;

    elements.push({
      id: crypto.randomUUID(),
      symbol: symbol.toLowerCase(),
      label: symbol.charAt(0).toUpperCase() + symbol.slice(1),
      description: `A ${symbol} appearing in your ${analysis.category} dream`,
      position: [Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius],
      rotation: [0, 0, 0],
      scale: 1,
      color: '#6366f1',
      emissive: '#3730a3',
      opacity: 1,
      isFloating: false,
      isFrozen: false,
      isBroken: false,
      isSelected: false,
      metadata: {
        emotionalWeight: 0.5,
        lucidityRelevance: 0.5,
        recurrence: 1,
      },
      interactionHistory: [],
      insights: [],
    });
  }

  return elements;
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

export function createInterpretationSession(
  dreamId: string,
  elements: DreamElement[]
): DreamInterpretationSession {
  return {
    id: crypto.randomUUID(),
    dreamId,
    elements,
    insights: [],
    startedAt: new Date().toISOString(),
    lastInteractionAt: new Date().toISOString(),
    totalInteractions: 0,
    depth: 0,
    mood: 'exploring',
  };
}

export function updateSessionDepth(session: DreamInterpretationSession): DreamInterpretationSession {
  // Depth increases with variety and number of interactions
  const uniqueInteractionTypes = new Set(
    session.elements.flatMap((e) => e.interactionHistory.map((r) => r.type))
  ).size;
  const totalInsights = session.elements.reduce((sum, e) => sum + e.insights.length, 0);

  const depth = Math.min(100, uniqueInteractionTypes * 8 + totalInsights * 5 + session.totalInteractions * 2);

  return { ...session, depth };
}

// ============================================================
// INSIGHT EXPORT
// ============================================================

/**
 * Export all insights from a session as a formatted journal entry.
 */
export function exportInsightsAsJournalEntry(session: DreamInterpretationSession): string {
  const lines: string[] = [
    `# Dream Interpretation Session`,
    ``,
    `**Date:** ${new Date(session.startedAt).toLocaleDateString()}`,
    `**Depth:** ${session.depth}/100`,
    `**Total Interactions:** ${session.totalInteractions}`,
    `**Elements Explored:** ${session.elements.length}`,
    ``,
    `## Elements`,
    ``,
  ];

  for (const element of session.elements) {
    lines.push(`### ${element.label}`);
    lines.push(`- Interactions: ${element.interactionHistory.length}`);
    lines.push(`- Insights: ${element.insights.length}`);
    if (element.metadata.personalMeaning) {
      lines.push(`- Personal meaning: ${element.metadata.personalMeaning}`);
    }
    lines.push(``);
  }

  lines.push(`## Insights`);
  lines.push(``);

  const allInsights = session.elements.flatMap((e) => e.insights);
  for (const insight of allInsights) {
    lines.push(`### ${insight.title}`);
    lines.push(insight.content);
    lines.push(``);
  }

  return lines.join('\n');
}
