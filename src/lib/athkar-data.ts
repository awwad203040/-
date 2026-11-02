import type { VoiceThikr } from '@/types/athkar';

export const VOICE_ATHKAR_LIST: VoiceThikr[] = [
  {
    id: 'tasbeeh-azeem',
    category: 'tasbeeh',
    categoryName: 'التسبيح',
    textTashkeel: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ وَبِحَمْدِهِ',
    textDisplay: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ وَبِحَمْدِهِ.',
    virtue: '«سُبْحَانَ رَبِّيَ الْعَظِيمِ وَبِحَمْدِهِ - تَعْظِيمٌ لِلَّهِ وَتَنْزِيهٌ لَهُ سُبْحَانَهُ»',
    audioUrl: '/audio/athkar/tasbeeh-azeem.mp3',
    rawSound: 'tasbeeh_azeem.mp3',
  },
  {
    id: 'tawheed-1',
    category: 'tahmeed',
    categoryName: 'التهليل والتوحيد',
    textTashkeel: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    textDisplay: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.',
    virtue: 'قال ﷺ: «خَيْرُ مَا قُلْتُ أَنَا وَالنَّبِيُّونَ مِنْ قَبْلِي: لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ...»',
    audioUrl: '/audio/athkar/tawheed-1.mp3',
    rawSound: 'tawheed.mp3',
  },
  {
    id: 'hawqala-1',
    category: 'hawqala',
    categoryName: 'الحوقلة',
    textTashkeel: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    textDisplay: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ.',
    virtue: 'قال ﷺ: «أَلَا أَدُلُّكَ عَلَى كَلِمَةٍ هِيَ كَنْزٌ مِنْ كُنُوزِ الْجَنَّةِ؟: لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ»',
    audioUrl: '/audio/athkar/hawqala-1.mp3',
    rawSound: 'hawqala.mp3',
  },
  {
    id: 'salawat-nabi',
    category: 'salawat',
    categoryName: 'الصلاة على النبي ﷺ',
    textTashkeel: 'صَلِّ عَلَى النَّبِيِّ مُحَمَّد',
    textDisplay: 'صَلِّ عَلَى النَّبِيِّ مُحَمَّد ﷺ.',
    virtue: 'قال ﷺ: «مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا»',
    audioUrl: '/audio/athkar/salawat-nabi.mp3',
    rawSound: 'salawat_nabi.mp3',
  },
  {
    id: 'tasbeeh-quddoos',
    category: 'tasbeeh',
    categoryName: 'التسبيح والتقديس',
    textTashkeel: 'سُبْحَانَ الْمَلِكِ الْقُدُّوسِ',
    textDisplay: 'سُبْحَانَ الْمَلِكِ الْقُدُّوسِ.',
    virtue: '«كَانَ رَسُولُ اللَّهِ ﷺ إِذَا سَلَّمَ مِنَ الْوِتْرِ قَالَ: سُبْحَانَ الْمَلِكِ الْقُدُّوسِ»',
    audioUrl: '/audio/athkar/tasbeeh-quddoos.mp3',
    rawSound: 'tasbeeh_quddoos.mp3',
  },
  {
    id: 'baqiyat-1',
    category: 'tahmeed',
    categoryName: 'الباقيات الصالحات',
    textTashkeel: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ',
    textDisplay: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ.',
    virtue: '«أَحَبُّ الْكَلَامِ إِلَى اللَّهِ أَرْبَعٌ: سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ»',
    audioUrl: '/audio/athkar/baqiyat-1.mp3',
    rawSound: 'baqiyat.mp3',
  },
  {
    id: 'istighfar-custom',
    category: 'istighfar',
    categoryName: 'الاستغفار',
    textTashkeel: 'أَسْتَغْفِرُ اللَّهَ',
    textDisplay: 'أَسْتَغْفِرُ اللَّهَ.',
    virtue: 'قال ﷺ: «مَنْ لَزِمَ الِاسْتِغْفَارَ جَعَلَ اللَّهُ لَهُ مِنْ كُلِّ ضِيقٍ مَخْرَجًا»',
    audioUrl: '/audio/athkar/istighfar-custom.mp3',
    rawSound: 'istighfar.mp3',
  },
];

export const ATHKAR_CATEGORIES = [
  { id: 'tasbeeh', name: 'التسبيح والتقديس', icon: '✨' },
  { id: 'tahmeed', name: 'التهليل والباقيات الصالحات', icon: '🌿' },
  { id: 'hawqala', name: 'الحوقلة', icon: '💎' },
  { id: 'salawat', name: 'الصلاة على النبي ﷺ', icon: '💚' },
  { id: 'istighfar', name: 'الاستغفار', icon: '🤲' },
] as const;

export const ATHKAR_INTERVALS = [
  { minutes: 1, label: 'كل دقيقة (للتجربة السريعة)' },
  { minutes: 5, label: 'كل 5 دقائق' },
  { minutes: 10, label: 'كل 10 دقائق (موصى به)' },
  { minutes: 15, label: 'كل 15 دقيقة' },
  { minutes: 30, label: 'كل 30 دقيقة' },
  { minutes: 60, label: 'كل ساعة' },
];

/**
 * Interleaves Salawat (الصلاة على النبي ﷺ) between every other thikr in the rotation.
 * Pattern: [ذكر 1, الصلاة على النبي, ذكر 2, الصلاة على النبي, ...]
 * Ensures Salawat repeats continuously between every thikr recited.
 */
export function interleaveWithSalawat(thikrs: VoiceThikr[]): VoiceThikr[] {
  const salawat = VOICE_ATHKAR_LIST.find((t) => t.id === 'salawat-nabi') || VOICE_ATHKAR_LIST[3];
  const nonSalawat = thikrs.filter((t) => t.id !== 'salawat-nabi');

  if (nonSalawat.length === 0) {
    return [salawat];
  }

  const result: VoiceThikr[] = [];
  for (const item of nonSalawat) {
    result.push(item);
    result.push(salawat);
  }
  return result;
}

