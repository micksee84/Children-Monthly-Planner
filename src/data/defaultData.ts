import { CharacterItem, PaletteItem, PlannerSettings, PlanRecord } from '../types/planner';
import { getDefaultWeekLabel } from '../utils/timeGrid';

export const CHARACTERS: CharacterItem[] = [
  {
    id: 'buddy',
    name: 'Buddy',
    animal: 'Bear',
    accentColor: '#F2B800', // Sun yellow
    bgPalette: '#F2F2E2',
    badgeLabel: 'Placeholder – Buddy',
    description: 'A gentle bear who loves big warm hugs and building towers.',
  },
  {
    id: 'finn',
    name: 'Finn',
    animal: 'Fox',
    accentColor: '#EE7B22', // Warm orange
    bgPalette: '#F2F2E2',
    badgeLabel: 'Placeholder – Finn',
    description: 'A curious fox always ready for an outdoor trail adventure.',
  },
  {
    id: 'ollie',
    name: 'Ollie',
    animal: 'Owl',
    accentColor: '#5BAE3C', // Meadow green
    bgPalette: '#F2F2E2',
    badgeLabel: 'Placeholder – Ollie',
    description: 'A thoughtful owl who loves storytime, books, and wonder.',
  },
  {
    id: 'faye',
    name: 'Faye',
    animal: 'Frog',
    accentColor: '#5BAE3C', // Frog green
    bgPalette: '#F2F2E2',
    badgeLabel: 'Placeholder – Faye',
    description: 'A bouncy frog who loves puddle splashing and silly songs.',
  },
  {
    id: 'rusty',
    name: 'Rusty',
    animal: 'Raccoon',
    accentColor: '#2D2200', // Ink
    bgPalette: '#F2F2E2',
    badgeLabel: 'Placeholder – Rusty',
    description: 'A clever raccoon who loves puzzles and neat crafts.',
  },
  {
    id: 'hana',
    name: 'Hana',
    animal: 'Hummingbird',
    accentColor: '#009BD9', // Sky blue
    bgPalette: '#F49AA0', // Pink accent
    badgeLabel: 'Placeholder – Hana',
    description: 'A cheerful hummingbird who spreads joy with dance parties.',
  },
];

export const DEFAULT_PALETTE_ITEMS: PaletteItem[] = [
  // Morning
  { id: 'm-wake', title: 'Wake up & cuddle', category: 'Morning', defaultDuration: 30, icon: 'Sun', hasCheckCircle: true },
  { id: 'm-teeth', title: 'Brush teeth & wash', category: 'Morning', defaultDuration: 30, icon: 'Sparkles', hasCheckCircle: true },
  { id: 'm-dress', title: 'Get dressed', category: 'Morning', defaultDuration: 30, icon: 'Shirt', hasCheckCircle: true },
  { id: 'm-walk', title: 'Morning walk', category: 'Morning', defaultDuration: 60, icon: 'Footprints', hasCheckCircle: false },
  { id: 'm-circle', title: 'Circle time', category: 'Morning', defaultDuration: 30, icon: 'Smile', hasCheckCircle: false },

  // School & learning
  { id: 's-preschool', title: 'Preschool & daycare', category: 'School & learning', defaultDuration: 180, icon: 'GraduationCap', hasCheckCircle: false },
  { id: 's-story', title: 'Storytime & reading', category: 'School & learning', defaultDuration: 30, icon: 'BookOpen', hasCheckCircle: true },
  { id: 's-crafts', title: 'Drawing & crafts', category: 'School & learning', defaultDuration: 60, icon: 'Palette', hasCheckCircle: false },
  { id: 's-playdough', title: 'Sensory & playdough', category: 'School & learning', defaultDuration: 30, icon: 'Shapes', hasCheckCircle: false },
  { id: 's-music', title: 'Music & singing', category: 'School & learning', defaultDuration: 30, icon: 'Music', hasCheckCircle: false },
  { id: 's-puzzles', title: 'Counting & puzzles', category: 'School & learning', defaultDuration: 30, icon: 'Puzzle', hasCheckCircle: false },
  { id: 's-nature', title: 'Nature discovery', category: 'School & learning', defaultDuration: 60, icon: 'Trees', hasCheckCircle: false },

  // Meals
  { id: 'f-breakfast', title: 'Breakfast', category: 'Meals', defaultDuration: 30, icon: 'Utensils', hasCheckCircle: true },
  { id: 'f-msnack', title: 'Morning snack', category: 'Meals', defaultDuration: 30, icon: 'Apple', hasCheckCircle: false },
  { id: 'f-lunch', title: 'Lunch', category: 'Meals', defaultDuration: 60, icon: 'Utensils', hasCheckCircle: false },
  { id: 'f-asnack', title: 'Afternoon snack', category: 'Meals', defaultDuration: 30, icon: 'Apple', hasCheckCircle: false },
  { id: 'f-dinner', title: 'Family dinner', category: 'Meals', defaultDuration: 60, icon: 'UtensilsCrossed', hasCheckCircle: false },

  // Play
  { id: 'p-free', title: 'Free play', category: 'Play', defaultDuration: 60, icon: 'Smile', hasCheckCircle: false },
  { id: 'p-park', title: 'Park & playground', category: 'Play', defaultDuration: 60, icon: 'Trees', hasCheckCircle: false },
  { id: 'p-lego', title: 'Blocks & building', category: 'Play', defaultDuration: 60, icon: 'Boxes', hasCheckCircle: false },
  { id: 'p-bike', title: 'Bike & scooter ride', category: 'Play', defaultDuration: 60, icon: 'Bike', hasCheckCircle: false },
  { id: 'p-water', title: 'Water fun', category: 'Play', defaultDuration: 30, icon: 'Droplets', hasCheckCircle: false },
  { id: 'p-dance', title: 'Dance party', category: 'Play', defaultDuration: 30, icon: 'Music2', hasCheckCircle: false },

  // Wind-down
  { id: 'w-tidy', title: 'Tidy up toys', category: 'Wind-down', defaultDuration: 30, icon: 'Archive', hasCheckCircle: true },
  { id: 'w-bath', title: 'Bath time', category: 'Wind-down', defaultDuration: 30, icon: 'Bath', hasCheckCircle: true },
  { id: 'w-pyjamas', title: 'Pyjamas on', category: 'Wind-down', defaultDuration: 30, icon: 'Moon', hasCheckCircle: true },
  { id: 'w-story', title: 'Bedtime story', category: 'Wind-down', defaultDuration: 30, icon: 'BookHeart', hasCheckCircle: true },
  { id: 'w-nap', title: 'Quiet rest & nap', category: 'Wind-down', defaultDuration: 60, icon: 'CloudMoon', hasCheckCircle: false },
  { id: 'w-sleep', title: 'Lullaby & sleep', category: 'Wind-down', defaultDuration: 60, icon: 'Bed', hasCheckCircle: true },
];

export const DEFAULT_SETTINGS: PlannerSettings = {
  childName: '',
  title: 'My week',
  weekLabel: getDefaultWeekLabel(),
  daysMode: '5day',
  startHour: 7,
  endHour: 19,
  stepMinutes: 60,
  showTimesOnBlocks: true,
  selectedCharacter: 'buddy',
};

export const AVAILABLE_ICONS = [
  'Sun',
  'Moon',
  'Sparkles',
  'BookOpen',
  'BookHeart',
  'Palette',
  'Music',
  'Music2',
  'Puzzle',
  'Boxes',
  'Shapes',
  'Bike',
  'Footprints',
  'Trees',
  'Smile',
  'Heart',
  'Star',
  'Apple',
  'Utensils',
  'UtensilsCrossed',
  'Bath',
  'Shirt',
  'GraduationCap',
  'CloudMoon',
  'Bed',
  'Droplets',
  'Archive',
  'Clock',
  'Compass',
  'Scissors',
  'Brush',
];

const STORAGE_KEY = 'sb_my_week_plans_v1';
const ACTIVE_PLAN_KEY = 'sb_my_week_active_plan_id';

/**
 * Creates an empty default plan record (start blank as requested)
 */
export function createNewPlan(name = 'My Weekly Routine'): PlanRecord {
  return {
    id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name,
    updatedAt: Date.now(),
    settings: {
      ...DEFAULT_SETTINGS,
      weekLabel: getDefaultWeekLabel(),
    },
    blocks: [], // Start blank: no blocks on first load or new plan!
  };
}

/**
 * Load all saved plans from localStorage (wrapped safely in try/catch)
 */
export function loadPlans(): { plans: PlanRecord[]; activePlanId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const activeId = localStorage.getItem(ACTIVE_PLAN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const found = parsed.find((p) => p.id === activeId);
        return {
          plans: parsed,
          activePlanId: found ? found.id : parsed[0].id,
        };
      }
    }
  } catch (err) {
    console.warn('Could not read plans from localStorage:', err);
  }

  // Fallback: create fresh blank initial plan
  const defaultPlan = createNewPlan('My Weekly Routine');
  savePlans([defaultPlan], defaultPlan.id);
  return {
    plans: [defaultPlan],
    activePlanId: defaultPlan.id,
  };
}

/**
 * Save plans to localStorage (wrapped safely in try/catch)
 */
export function savePlans(plans: PlanRecord[], activePlanId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    localStorage.setItem(ACTIVE_PLAN_KEY, activePlanId);
  } catch (err) {
    console.warn('Could not save plans to localStorage:', err);
  }
}
