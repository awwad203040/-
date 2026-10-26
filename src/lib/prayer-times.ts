// Prayer Times Calculation Engine for Noor-AlQuran
// محرك حساب مواقيت الصلاة الفلكي المدمج - يعمل بدقة تامة وبدون إنترنت

export interface CityPreset {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone?: number;
}

export const POPULAR_CITIES: CityPreset[] = [
  { id: 'makkah', name: 'مكة المكرمة', country: 'السعودية', lat: 21.4225, lng: 39.8262 },
  { id: 'madinah', name: 'المدينة المنورة', country: 'السعودية', lat: 24.4672, lng: 39.6111 },
  { id: 'riyadh', name: 'الرياض', country: 'السعودية', lat: 24.7136, lng: 46.6753 },
  { id: 'jeddah', name: 'جدة', country: 'السعودية', lat: 21.5433, lng: 39.1728 },
  { id: 'dammam', name: 'الدمام والخبر', country: 'السعودية', lat: 26.4207, lng: 50.0888 },
  { id: 'cairo', name: 'القاهرة', country: 'مصر', lat: 30.0444, lng: 31.2357 },
  { id: 'alex', name: 'الإسكندرية', country: 'مصر', lat: 31.2001, lng: 29.9187 },
  { id: 'jerusalem', name: 'القدس الشريف', country: 'فلسطين', lat: 31.7683, lng: 35.2137 },
  { id: 'dubai', name: 'دبي', country: 'الإمارات', lat: 25.2048, lng: 55.2708 },
  { id: 'abudhabi', name: 'أبوظبي', country: 'الإمارات', lat: 24.4539, lng: 54.3773 },
  { id: 'kuwait', name: 'الكويت', country: 'الكويت', lat: 29.3759, lng: 47.9774 },
  { id: 'doha', name: 'الدوحة', country: 'قطر', lat: 25.2854, lng: 51.531 },
  { id: 'manama', name: 'المنامة', country: 'البحرين', lat: 26.2285, lng: 50.586 },
  { id: 'muscat', name: 'مسقط', country: 'عُمان', lat: 23.588, lng: 58.3829 },
  { id: 'amman', name: 'عمّان', country: 'الأردن', lat: 31.9454, lng: 35.9284 },
  { id: 'beirut', name: 'بيروت', country: 'لبنان', lat: 33.8938, lng: 35.5018 },
  { id: 'damascus', name: 'دمشق', country: 'سوريا', lat: 33.5138, lng: 36.2765 },
  { id: 'baghdad', name: 'بغداد', country: 'العراق', lat: 33.3152, lng: 44.3661 },
  { id: 'sanaa', name: 'صنعاء', country: 'اليمن', lat: 15.3694, lng: 44.191 },
  { id: 'tripoli', name: 'طرابلس', country: 'ليبيا', lat: 32.8872, lng: 13.1913 },
  { id: 'tunis', name: 'تونس', country: 'تونس', lat: 36.8065, lng: 10.1815 },
  { id: 'algiers', name: 'الجزائر', country: 'الجزائر', lat: 36.7538, lng: 3.0588 },
  { id: 'rabat', name: 'الرباط', country: 'المغرب', lat: 34.0209, lng: -6.8416 },
  { id: 'khartoum', name: 'الخرطوم', country: 'السودان', lat: 15.5007, lng: 32.5599 },
  { id: 'istanbul', name: 'إسطنبول', country: 'تركيا', lat: 41.0082, lng: 28.9784 },
  { id: 'london', name: 'لندن', country: 'بريطانيا', lat: 51.5074, lng: -0.1278 },
  { id: 'paris', name: 'باريس', country: 'فرنسا', lat: 48.8566, lng: 2.3522 },
  { id: 'newyork', name: 'نيويورك', country: 'أمريكا', lat: 40.7128, lng: -74.006 },
];

export type CalculationMethod = 'umm_al_qura' | 'egyptian' | 'mwl' | 'isna' | 'karachi';

export interface MethodConfig {
  id: CalculationMethod;
  name: string;
  fajrAngle: number;
  ishaAngle?: number;
  ishaInterval?: number; // Minutes after Maghrib (e.g. 90 for Umm Al-Qura)
}

export const CALCULATION_METHODS: Record<CalculationMethod, MethodConfig> = {
  umm_al_qura: {
    id: 'umm_al_qura',
    name: 'تقويم أم القرى (مكة المكرمة والسعودية)',
    fajrAngle: 18.5,
    ishaInterval: 90,
  },
  egyptian: {
    id: 'egyptian',
    name: 'الهيئة المصرية العامة للمساحة',
    fajrAngle: 19.5,
    ishaAngle: 17.5,
  },
  mwl: {
    id: 'mwl',
    name: 'رابطة العالم الإسلامي',
    fajrAngle: 18.0,
    ishaAngle: 17.0,
  },
  isna: {
    id: 'isna',
    name: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)',
    fajrAngle: 15.0,
    ishaAngle: 15.0,
  },
  karachi: {
    id: 'karachi',
    name: 'جامعة العلوم الإسلامية بكراتشي',
    fajrAngle: 18.0,
    ishaAngle: 18.0,
  },
};

export interface PrayerTimesResult {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  fajr12: string;
  sunrise12: string;
  dhuhr12: string;
  asr12: string;
  maghrib12: string;
  isha12: string;
  nextPrayer: {
    name: string;
    key: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
    time12: string;
    remainingMinutes: number;
    remainingSeconds: number;
    remainingFormatted: string;
    isPastToday?: boolean;
  };
  hijriDate: string;
  gregorianDate: string;
  cityName: string;
  isGps: boolean;
}

export interface UserPrayerSettings {
  useGps: boolean;
  cityId: string;
  customLat: number;
  customLng: number;
  customCityName: string;
  method: CalculationMethod;
  notificationEnabled: boolean;
}

const STORAGE_KEY = 'noor_prayer_settings';

export function getPrayerSettings(): UserPrayerSettings {
  if (typeof window === 'undefined') {
    return {
      useGps: true,
      cityId: 'makkah',
      customLat: 21.4225,
      customLng: 39.8262,
      customCityName: 'مكة المكرمة',
      method: 'umm_al_qura',
      notificationEnabled: true,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return {
    useGps: true,
    cityId: 'makkah',
    customLat: 21.4225,
    customLng: 39.8262,
    customCityName: 'مكة المكرمة',
    method: 'umm_al_qura',
    notificationEnabled: true,
  };
}

export function savePrayerSettings(settings: Partial<UserPrayerSettings>): UserPrayerSettings {
  if (typeof window === 'undefined') return getPrayerSettings();
  try {
    const current = getPrayerSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return getPrayerSettings();
  }
}

// ============================================================================
// Math & Astronomical Formulas
// ============================================================================
const degToRad = (d: number) => (d * Math.PI) / 180.0;
const radToDeg = (r: number) => (r * 180.0) / Math.PI;

function sinD(d: number) {
  return Math.sin(degToRad(d));
}
function cosD(d: number) {
  return Math.cos(degToRad(d));
}
function tanD(d: number) {
  return Math.tan(degToRad(d));
}
function arcsinD(x: number) {
  return radToDeg(Math.asin(x));
}
function arccosD(x: number) {
  return radToDeg(Math.acos(x));
}
function arctan2D(y: number, x: number) {
  return radToDeg(Math.atan2(y, x));
}
function fixAngle(a: number) {
  let b = a - 360.0 * Math.floor(a / 360.0);
  return b < 0 ? b + 360.0 : b;
}
function fixHour(h: number) {
  let a = h - 24.0 * Math.floor(h / 24.0);
  return a < 0 ? a + 24.0 : a;
}

// Convert Julian Day from Date
function getJulianDay(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

// Sun Position: returns { declination, equationOfTime }
function getSunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * sinD(g) + 0.02 * sinD(2 * g));

  const e = 23.439 - 0.00000036 * D;
  const d = arcsinD(sinD(e) * sinD(L));
  let RA = arctan2D(cosD(e) * sinD(L), cosD(L)) / 15.0;
  RA = fixHour(RA);

  const EqT = q / 15.0 - RA;
  return { declination: d, equationOfTime: EqT };
}

// Time diff helper for given sun altitude
function computeHourAngle(altitude: number, lat: number, dec: number): number | null {
  const val = (sinD(altitude) - sinD(lat) * sinD(dec)) / (cosD(lat) * cosD(dec));
  if (val > 1 || val < -1) return null; // Extreme latitude fallback
  return arccosD(val) / 15.0;
}

// Format fractional hours (e.g. 15.5) to "15:30" and "03:30 م"
function formatTime24(h: number): string {
  const fixed = fixHour(h);
  const hours = Math.floor(fixed);
  const minutes = Math.floor((fixed - hours) * 60 + 0.5);
  let adjHours = hours;
  let adjMinutes = minutes;
  if (adjMinutes >= 60) {
    adjMinutes = 0;
    adjHours = (adjHours + 1) % 24;
  }
  return `${String(adjHours).padStart(2, '0')}:${String(adjMinutes).padStart(2, '0')}`;
}

export function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'م' : 'ص';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${suffix}`;
}

export function getHijriDate(date?: Date): string {
  try {
    const d = date || new Date();
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    try {
      const d = date || new Date();
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    } catch {
      return '';
    }
  }
}

export function getGregorianDate(date?: Date): string {
  try {
    const d = date || new Date();
    return new Intl.DateTimeFormat('ar-SA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    const d = date || new Date();
    return d.toLocaleDateString('ar-SA');
  }
}

// Calculate All Prayer Times for given coords and date
export function calculatePrayerTimes(
  lat: number,
  lng: number,
  date?: Date,
  method: CalculationMethod = 'umm_al_qura'
): {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
} {
  const targetDate = date || new Date();
  const timezone = -targetDate.getTimezoneOffset() / 60.0;
  const jd = getJulianDay(targetDate.getFullYear(), targetDate.getMonth() + 1, targetDate.getDate());
  const { declination, equationOfTime } = getSunPosition(jd);

  // Solar noon (Dhuhr)
  const dhuhrTime = fixHour(12 + timezone - lng / 15.0 - equationOfTime);

  // Sunrise & Sunset (altitude = -0.833)
  const sunAngle = -0.833;
  const sunHA = computeHourAngle(sunAngle, lat, declination) || 6.0;
  const sunriseTime = dhuhrTime - sunHA;
  const sunsetTime = dhuhrTime + sunHA;
  const maghribTime = sunsetTime;

  // Fajr
  const methodConfig = CALCULATION_METHODS[method] || CALCULATION_METHODS.umm_al_qura;
  const fajrHA = computeHourAngle(-methodConfig.fajrAngle, lat, declination) || 6.2;
  const fajrTime = dhuhrTime - fajrHA;

  // Asr (Shafi'i: shadow ratio = 1)
  const asrAltitude = -arccotD(1 + tanD(Math.abs(lat - declination)));
  const asrHA = computeHourAngle(asrAltitude, lat, declination) || 3.0;
  const asrTime = dhuhrTime + asrHA;

  // Isha
  let ishaTime: number;
  if (methodConfig.ishaInterval) {
    ishaTime = maghribTime + methodConfig.ishaInterval / 60.0;
  } else if (methodConfig.ishaAngle) {
    const ishaHA = computeHourAngle(-methodConfig.ishaAngle, lat, declination) || 6.0;
    ishaTime = dhuhrTime + ishaHA;
  } else {
    ishaTime = maghribTime + 1.5;
  }

  return {
    fajr: formatTime24(fajrTime),
    sunrise: formatTime24(sunriseTime),
    dhuhr: formatTime24(dhuhrTime),
    asr: formatTime24(asrTime),
    maghrib: formatTime24(maghribTime),
    isha: formatTime24(ishaTime),
  };
}

function arccotD(x: number) {
  return radToDeg(Math.atan(1 / x));
}

// Compute Complete Detailed State with Next Prayer & Countdown
export function getFullPrayerTimes(
  settings: UserPrayerSettings,
  now?: Date
): PrayerTimesResult {
  const currentDate = now || new Date();
  const times = calculatePrayerTimes(settings.customLat, settings.customLng, currentDate, settings.method);

  const prayersList: Array<{
    key: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
    name: string;
    time24: string;
  }> = [
    { key: 'fajr', name: 'الفجر', time24: times.fajr },
    { key: 'sunrise', name: 'الشروق', time24: times.sunrise },
    { key: 'dhuhr', name: 'الظهر', time24: times.dhuhr },
    { key: 'asr', name: 'العصر', time24: times.asr },
    { key: 'maghrib', name: 'المغرب', time24: times.maghrib },
    { key: 'isha', name: 'العشاء', time24: times.isha },
  ];

  const nowMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  const nowSeconds = currentDate.getSeconds();
  const nowTotalSec = nowMinutes * 60 + nowSeconds;

  let nextP = prayersList.find((p) => {
    const [h, m] = p.time24.split(':').map((v) => parseInt(v, 10));
    const pTotalSec = (h * 60 + m) * 60;
    return pTotalSec > nowTotalSec;
  });

  let remainingSec = 0;
  if (nextP) {
    const [h, m] = nextP.time24.split(':').map((v) => parseInt(v, 10));
    const pTotalSec = (h * 60 + m) * 60;
    remainingSec = pTotalSec - nowTotalSec;
  } else {
    // Tomorrow's Fajr
    nextP = prayersList[0];
    const [h, m] = nextP.time24.split(':').map((v) => parseInt(v, 10));
    const pTotalSec = (h * 60 + m) * 60;
    remainingSec = 24 * 3600 - nowTotalSec + pTotalSec;
  }

  const remHours = Math.floor(remainingSec / 3600);
  const remMinutes = Math.floor((remainingSec % 3600) / 60);
  const remSec = remainingSec % 60;

  const formattedRem =
    remHours > 0
      ? `${remHours} س و ${remMinutes} د`
      : `${remMinutes} د و ${remSec} ث`;

  return {
    ...times,
    fajr12: formatTime12(times.fajr),
    sunrise12: formatTime12(times.sunrise),
    dhuhr12: formatTime12(times.dhuhr),
    asr12: formatTime12(times.asr),
    maghrib12: formatTime12(times.maghrib),
    isha12: formatTime12(times.isha),
    nextPrayer: {
      key: nextP.key,
      name: nextP.name,
      time12: formatTime12(nextP.time24),
      remainingMinutes: remMinutes,
      remainingSeconds: remSec,
      remainingFormatted: formattedRem,
    },
    hijriDate: getHijriDate(currentDate),
    gregorianDate: getGregorianDate(currentDate),
    cityName: settings.customCityName || 'مكة المكرمة',
    isGps: settings.useGps,
  };
}
