export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface ActivityBlock {
  id: string;
  day: DayKey;
  startRow: number; // 0-indexed row
  durationRows: number; // number of rows spanned (minimum 1)
  title: string;
  icon: string;
  hasCheckCircle: boolean;
  category?: string;
  customColor?: string;
}

export interface PaletteItem {
  id: string;
  title: string;
  category: 'Morning' | 'School & learning' | 'Meals' | 'Play' | 'Wind-down' | 'Custom';
  defaultDuration: number; // in minutes (e.g. 30, 60, 180)
  icon: string;
  hasCheckCircle: boolean;
}

export interface PlannerSettings {
  childName: string;
  title: string; // default "My week"
  weekLabel: string; // default e.g. "Week of Oct 19 – 23"
  daysMode: '5day' | '7day';
  startHour: number; // e.g. 7 (7am)
  endHour: number; // e.g. 19 (7pm)
  stepMinutes: 30 | 60; // 30 or 60
  showTimesOnBlocks: boolean;
  selectedCharacter: string | null; // 'buddy' | 'finn' | 'ollie' | 'faye' | 'rusty' | 'hana' | null
}

export interface PlanRecord {
  id: string;
  name: string;
  updatedAt: number;
  settings: PlannerSettings;
  blocks: ActivityBlock[];
}

export interface CharacterItem {
  id: string;
  name: string;
  animal: string;
  accentColor: string;
  bgPalette: string;
  badgeLabel: string;
  description: string;
}

export interface ToastMessage {
  id: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}
