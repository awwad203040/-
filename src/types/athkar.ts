export type ThikrCategory = 'tasbeeh' | 'tahmeed' | 'hawqala' | 'salawat' | 'istighfar';

export interface VoiceThikr {
  id: string;
  category: ThikrCategory;
  categoryName: string;
  textTashkeel: string; // Vocalized Arabic for natural pronunciation
  textDisplay: string;  // Clean Arabic for display
  virtue: string;       // فضل الذكر
  audioUrl?: string;    // Studio-quality Arabic audio recording URL for in-app playback
  rawSound?: string;    // Native Android res/raw sound file (e.g. 'tasbeeh_azeem.mp3') for background notifications
}

export interface AutoAthkarSettings {
  enabled: boolean;
  intervalMinutes: number; // e.g. 1, 5, 10, 15, 30, 60
  volume: number;          // 0.1 to 1.0
  playChime: boolean;      // Play soft spiritual chime before speech
  activeCategories: ThikrCategory[];
  activeThikrIds?: string[]; // IDs of specific selected athkar
}

export const DEFAULT_ATHKAR_SETTINGS: AutoAthkarSettings = {
  enabled: true,
  intervalMinutes: 10,
  volume: 0.85,
  playChime: true,
  activeCategories: ['tasbeeh', 'tahmeed', 'hawqala', 'salawat', 'istighfar'],
  activeThikrIds: [
    'tasbeeh-azeem',
    'tawheed-1',
    'hawqala-1',
    'salawat-nabi',
    'tasbeeh-quddoos',
    'baqiyat-1',
    'istighfar-custom',
  ],
};
