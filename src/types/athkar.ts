export type ThikrCategory = 'istighfar' | 'tasbeeh' | 'hawqala' | 'tahmeed' | 'salawat';

export interface VoiceThikr {
  id: string;
  category: ThikrCategory;
  categoryName: string;
  textTashkeel: string; // Vocalized Arabic for natural pronunciation
  textDisplay: string;  // Clean Arabic for display
  virtue: string;       // فضل الذكر
  audioUrl?: string;    // Studio-quality Arabic audio recording URL
}

export interface AutoAthkarSettings {
  enabled: boolean;
  intervalMinutes: number; // e.g. 1, 5, 10, 15, 30, 60
  volume: number;          // 0.1 to 1.0
  playChime: boolean;      // Play soft spiritual chime before speech
  activeCategories: ThikrCategory[];
}

export const DEFAULT_ATHKAR_SETTINGS: AutoAthkarSettings = {
  enabled: true,
  intervalMinutes: 10,
  volume: 0.85,
  playChime: true,
  activeCategories: ['istighfar', 'tasbeeh', 'hawqala', 'tahmeed', 'salawat'],
};
