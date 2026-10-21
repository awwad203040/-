import type { VoiceThikr } from '@/types/athkar';

export const VOICE_ATHKAR_LIST: VoiceThikr[] = [
  {
    id: 'istighfar-1',
    category: 'istighfar',
    categoryName: 'الاستغفار',
    textTashkeel: 'أَسْتَغْفِرُ اللَّهَ... أَسْتَغْفِرُ اللَّهَ... أَسْتَغْفِرُ اللَّهَ',
    textDisplay: 'أَسْتَغْفِرُ اللَّهَ. (٣ مرات)',
    virtue: 'قال ﷺ: «مَنْ لَزِمَ الِاسْتِغْفَارَ جَعَلَ اللَّهُ لَهُ مِنْ كُلِّ ضِيقٍ مَخْرَجًا»',
    audioUrl: '/audio/athkar/istighfar-1.mp3?v=male-v3',
  },
  {
    id: 'tasbeeh-1',
    category: 'tasbeeh',
    categoryName: 'التسبيح',
    textTashkeel: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    textDisplay: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ.',
    virtue: '«مَنْ قَالَ سُبْحَانَ اللَّهِ وَبِحَمْدِهِ فِي يَوْمٍ مِائَةَ مَرَّةٍ حُطَّتْ خَطَايَاهُ»',
    audioUrl: '/audio/athkar/tasbeeh-1.mp3?v=male-v3',
  },
  {
    id: 'tasbeeh-2',
    category: 'tasbeeh',
    categoryName: 'التسبيح',
    textTashkeel: 'سُبْحَانَ اللَّهِ الْعَظِيمِ وَبِحَمْدِهِ',
    textDisplay: 'سُبْحَانَ اللَّهِ الْعَظِيمِ وَبِحَمْدِهِ.',
    virtue: '«كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ»',
    audioUrl: '/audio/athkar/tasbeeh-2.mp3?v=male-v3',
  },
  {
    id: 'hawqala-1',
    category: 'hawqala',
    categoryName: 'الحوقلة',
    textTashkeel: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    textDisplay: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ.',
    virtue: '«كَنْزٌ مِنْ كُنُوزِ الْجَنَّةِ»',
    audioUrl: '/audio/athkar/hawqala-1.mp3?v=male-v3',
  },
  {
    id: 'tahmeed-1',
    category: 'tahmeed',
    categoryName: 'الباقيات الصالحات',
    textTashkeel: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ',
    textDisplay: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ.',
    virtue: '«أَحَبُّ الْكَلَامِ إِلَى اللَّهِ أَرْبَعٌ: سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ»',
    audioUrl: '/audio/athkar/tahmeed-1.mp3?v=male-v3',
  },
  {
    id: 'salawat-1',
    category: 'salawat',
    categoryName: 'الصلاة على النبي ﷺ',
    textTashkeel: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    textDisplay: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ.',
    virtue: 'قال ﷺ: «مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا»',
    audioUrl: '/audio/athkar/salawat-1.mp3?v=male-v3',
  },
];

export const ATHKAR_CATEGORIES = [
  { id: 'istighfar', name: 'الاستغفار', icon: '🤲' },
  { id: 'tasbeeh', name: 'التسبيح', icon: '✨' },
  { id: 'hawqala', name: 'الحوقلة', icon: '💎' },
  { id: 'tahmeed', name: 'الباقيات الصالحات', icon: '🌿' },
  { id: 'salawat', name: 'الصلاة على النبي ﷺ', icon: '💚' },
] as const;

export const ATHKAR_INTERVALS = [
  { minutes: 1, label: 'كل دقيقة (للتجربة السريعة)' },
  { minutes: 5, label: 'كل 5 دقائق' },
  { minutes: 10, label: 'كل 10 دقائق (موصى به)' },
  { minutes: 15, label: 'كل 15 دقيقة' },
  { minutes: 30, label: 'كل 30 دقيقة' },
  { minutes: 60, label: 'كل ساعة' },
];
