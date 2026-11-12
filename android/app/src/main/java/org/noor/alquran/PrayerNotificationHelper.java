package org.noor.alquran;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.os.Build;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.text.style.StyleSpan;
import androidx.core.app.NotificationCompat;

import java.util.Calendar;
import java.util.Locale;

/**
 * Helper to build and manage Salatuk-style prayer notifications on Android.
 * Matches the layout from the user screenshot:
 * Title: [City] | [Hijri Date] (e.g. الهفوف | 23 جمادى الأولى 1448)
 * Text:  [Prayer] . [Time12] د [Elapsed/Countdown] (e.g. العصر . 02:36 د + 03:38 with red text)
 * Icon:  Rounded cyan square with turquoise mosque dome, gold base and crescent.
 */
public class PrayerNotificationHelper {
    public static final String CHANNEL_ADHAN_ID = "noor_adhan_live_silent_v5";
    public static final String CHANNEL_PRAYER_BAR_ID = "noor_prayer_bar_channel_v1";
    public static final int NOTIFICATION_ID_PRAYER = 8881;

    private static Bitmap cachedMosqueIcon = null;

    /**
     * Generates a rounded mosque dome icon matching the user's screenshot (Salatuk style)
     * Soft cyan/sky-blue gradient background, turquoise dome, golden base and crescent.
     */
    public static synchronized Bitmap getSalatukMosqueIcon(Context context) {
        if (cachedMosqueIcon != null && !cachedMosqueIcon.isRecycled()) {
            return cachedMosqueIcon;
        }

        try {
            int size = 192;
            Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);

            // 1. Rounded rectangle background with light sky-blue gradient
            Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            bgPaint.setShader(new LinearGradient(
                    0, 0, 0, size,
                    Color.parseColor("#E0F2FE"),
                    Color.parseColor("#BAE6FD"),
                    Shader.TileMode.CLAMP
            ));
            RectF bgRect = new RectF(0, 0, size, size);
            canvas.drawRoundRect(bgRect, 44f, 44f, bgPaint);

            // Soft white glowing aura behind the dome (matching Salatuk screenshot)
            Paint auraPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            auraPaint.setShader(new android.graphics.RadialGradient(
                    size / 2f, size * 0.58f, size * 0.42f,
                    Color.argb(200, 255, 255, 255),
                    Color.TRANSPARENT,
                    Shader.TileMode.CLAMP
            ));
            canvas.drawCircle(size / 2f, size * 0.58f, size * 0.42f, auraPaint);

            // 2. Base gold arch
            Paint goldPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            goldPaint.setColor(Color.parseColor("#F59E0B"));
            RectF baseRect = new RectF(52f, 142f, 140f, 148f);
            canvas.drawRoundRect(baseRect, 3f, 3f, goldPaint);

            // 3. Turquoise/Cyan Mosque Dome
            Paint domePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            domePaint.setColor(Color.parseColor("#0284C7"));
            Path domePath = new Path();
            domePath.moveTo(56f, 142f);
            domePath.cubicTo(56f, 108f, 76f, 74f, 96f, 72f);
            domePath.cubicTo(116f, 74f, 136f, 108f, 136f, 142f);
            domePath.close();
            canvas.drawPath(domePath, domePaint);

            // 4. Dome Spire / Finial
            goldPaint.setStrokeWidth(3.5f);
            goldPaint.setStyle(Paint.Style.STROKE);
            canvas.drawLine(96f, 72f, 96f, 52f, goldPaint);

            // 5. Crescent Moon
            Paint crescentPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            crescentPaint.setColor(Color.parseColor("#0284C7"));
            crescentPaint.setStyle(Paint.Style.FILL);
            Path crescentPath = new Path();
            crescentPath.addCircle(96f, 47f, 9f, Path.Direction.CW);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                Path innerCircle = new Path();
                innerCircle.addCircle(96f, 44f, 7.5f, Path.Direction.CW);
                crescentPath.op(innerCircle, Path.Op.DIFFERENCE);
            }
            canvas.drawPath(crescentPath, crescentPaint);

            cachedMosqueIcon = bitmap;
            return bitmap;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Formats 24h time "HH:mm" to 12h without AM/PM e.g. "02:36", "04:45"
     */
    public static String formatTime12(String time24) {
        if (time24 == null || !time24.contains(":")) return "00:00";
        try {
            String[] parts = time24.split(":");
            int h = Integer.parseInt(parts[0].trim());
            int m = Integer.parseInt(parts[1].trim());
            h = h % 12;
            if (h == 0) h = 12;
            return String.format(Locale.US, "%02d:%02d", h, m);
        } catch (Exception e) {
            return time24;
        }
    }

    /**
     * Retrieves or calculates Hijri date string (e.g. "23 جمادى الأولى 1448")
     */
    public static String getHijriDateArabic(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(AdhanAlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE);
            String saved = prefs.getString("hijri_date", null);
            if (saved != null && !saved.trim().isEmpty()) {
                return saved.replaceAll("\\s*هـ?\\s*$", "").trim();
            }
        } catch (Exception ignored) {}

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                java.time.chrono.HijrahDate hd = java.time.chrono.HijrahDate.now();
                int day = hd.get(java.time.temporal.ChronoField.DAY_OF_MONTH);
                int month = hd.get(java.time.temporal.ChronoField.MONTH_OF_YEAR);
                int year = hd.get(java.time.temporal.ChronoField.YEAR_OF_ERA);
                String[] monthNames = {
                    "المحرم", "صفر", "ربيع الأول", "ربيع الآخر",
                    "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
                    "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
                };
                String monthName = (month >= 1 && month <= 12) ? monthNames[month - 1] : "جمادى الأولى";
                return day + " " + monthName + " " + year;
            } catch (Exception ignored) {}
        }
        return "23 جمادى الأولى 1448";
    }

    /**
     * Builds the ContentText: "العصر . 02:36 د + 03:38" with "د + 03:38" in bold red
     */
    public static CharSequence buildSalatukContentText(String prayerName, String prayerTime12, String timerText) {
        String safePrayer = (prayerName != null && !prayerName.isEmpty()) ? prayerName : "الصلاة";
        String safeTime = (prayerTime12 != null && !prayerTime12.isEmpty()) ? prayerTime12 : "00:00";
        String safeTimer = (timerText != null && !timerText.isEmpty()) ? timerText.trim() : "+ 00:00";
        if (safeTimer.startsWith("د")) {
            safeTimer = safeTimer.substring(1).trim();
        }

        SpannableStringBuilder ssb = new SpannableStringBuilder();
        ssb.append(safePrayer).append(" . ").append(safeTime).append(" ");
        int redStart = ssb.length();
        ssb.append("د ").append(safeTimer);
        ssb.setSpan(new ForegroundColorSpan(Color.parseColor("#E53935")), redStart, ssb.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        ssb.setSpan(new StyleSpan(Typeface.BOLD), redStart, ssb.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        return ssb;
    }

    public static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        // 1. High-importance Adhan channel (NO system ding/chime, flash lights enabled, ZERO vibration)
        NotificationChannel adhanChannel = nm.getNotificationChannel(CHANNEL_ADHAN_ID);
        if (adhanChannel == null) {
            adhanChannel = new NotificationChannel(
                    CHANNEL_ADHAN_ID,
                    "أذان الصلوات (صوتي مباشر وبدون اهتزاز)",
                    NotificationManager.IMPORTANCE_HIGH
            );
            adhanChannel.setDescription("تنبيه أذان الصلوات المباشر بصوت الشيخ محمد جازي مع فلاش وبدون اهتزاز");
            // Delete system chime ding completely so only the Adhan audio plays!
            adhanChannel.setSound(null, null);
            adhanChannel.enableLights(true);
            adhanChannel.setLightColor(Color.WHITE);
            adhanChannel.enableVibration(false);
            adhanChannel.setVibrationPattern(new long[]{0});
            adhanChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(adhanChannel);
        }

        // 2. Ongoing prayer bar channel (silent / low importance so updates don't beep)
        NotificationChannel barChannel = nm.getNotificationChannel(CHANNEL_PRAYER_BAR_ID);
        if (barChannel == null) {
            barChannel = new NotificationChannel(
                    CHANNEL_PRAYER_BAR_ID,
                    "مواقيت الصلاة (شريط الإشعارات)",
                    NotificationManager.IMPORTANCE_LOW
            );
            barChannel.setDescription("إشعار مواقيت الصلاة الدائم في شريط إشعارات الجوال كـ صلاتك");
            barChannel.setShowBadge(false);
            barChannel.setSound(null, null);
            barChannel.enableVibration(false);
            barChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(barChannel);
        }
    }

    /**
     * Builds the complete Salatuk-style notification
     */
    /**
     * Builds the complete Salatuk-style notification
     */
    public static Notification buildSalatukNotification(
            Context context,
            String prayerName,
            String prayerTime12,
            String cityName,
            String hijriDate,
            String timerText,
            String nextPrayerName,
            String nextPrayerTime12,
            boolean isAdhanAlert
    ) {
        ensureChannels(context);

        String channelId = isAdhanAlert ? CHANNEL_ADHAN_ID : CHANNEL_PRAYER_BAR_ID;

        String safeCity = (cityName != null && !cityName.trim().isEmpty() && !cityName.equals("موقعك")) ? cityName : "الهفوف";
        String safeHijri = (hijriDate != null && !hijriDate.trim().isEmpty()) ? hijriDate : getHijriDateArabic(context);
        String title = safeCity + " | " + safeHijri;

        CharSequence contentText = buildSalatukContentText(prayerName, prayerTime12, timerText);

        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(
                context,
                910,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent deleteIntent = new Intent(context, PrayerNotificationReceiver.class);
        deleteIntent.setAction(PrayerNotificationReceiver.ACTION_RECREATE_PRAYER_NOTIFICATION);
        PendingIntent deletePi = PendingIntent.getBroadcast(
                context,
                PrayerNotificationReceiver.REQ_CODE_DELETE,
                deleteIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        android.widget.RemoteViews customViews = new android.widget.RemoteViews(context.getPackageName(), R.layout.notification_salatuk);
        customViews.setTextViewText(R.id.salatuk_title, title);
        customViews.setTextViewText(R.id.salatuk_prayer_time, prayerName + " . " + prayerTime12 + " ");
        String safeTimerOnly = (timerText != null && !timerText.isEmpty()) ? timerText.trim() : "+ 00:00";
        if (safeTimerOnly.startsWith("د")) {
            safeTimerOnly = safeTimerOnly.substring(1).trim();
        }
        customViews.setTextViewText(R.id.salatuk_timer, "د " + safeTimerOnly);

        String safeNextName = (nextPrayerName != null && !nextPrayerName.isEmpty()) ? nextPrayerName : "العصر";
        String safeNextTime = (nextPrayerTime12 != null && !nextPrayerTime12.isEmpty()) ? nextPrayerTime12 : "00:00";
        customViews.setTextViewText(R.id.salatuk_next_prayer, "الصلاة القادمة: " + safeNextName + " . " + safeNextTime);

        Bitmap mosqueIcon = getSalatukMosqueIcon(context);
        if (mosqueIcon != null) {
            customViews.setImageViewBitmap(R.id.salatuk_icon, mosqueIcon);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(contentText)
                .setCustomContentView(customViews)
                .setCustomBigContentView(customViews)
                .setShowWhen(false)
                .setWhen(0)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setColor(Color.parseColor("#123B2A"))
                .setContentIntent(openPi)
                .setDeleteIntent(deletePi)
                .setVibrate(new long[]{0})
                .setDefaults(0)
                .setOngoing(true);

        if (mosqueIcon != null) {
            builder.setLargeIcon(mosqueIcon);
        }

        if (isAdhanAlert) {
            builder.setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_REMINDER)
                    .setFullScreenIntent(openPi, true);

            // Add Stop Adhan button
            Intent stopIntent = new Intent(context, NoorAudioService.class);
            stopIntent.setAction(NoorAudioService.ACTION_STOP_AUDIO);
            PendingIntent stopPi = PendingIntent.getService(
                    context,
                    911,
                    stopIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            builder.addAction(android.R.drawable.ic_media_pause, "إيقاف صوت الأذان", stopPi);
        } else {
            builder.setPriority(NotificationCompat.PRIORITY_LOW)
                    .setCategory(NotificationCompat.CATEGORY_STATUS);
        }

        Notification notification = builder.build();
        notification.flags |= Notification.FLAG_ONGOING_EVENT | Notification.FLAG_NO_CLEAR;
        return notification;
    }

    public static Notification buildSalatukNotification(
            Context context,
            String prayerName,
            String prayerTime12,
            String cityName,
            String hijriDate,
            String timerText,
            boolean isAdhanAlert
    ) {
        String nextName = null;
        String nextTime = null;
        try {
            ActivePrayerInfo info = calculateCurrentActivePrayer(context);
            if (info != null) {
                nextName = info.nextPrayerName;
                nextTime = info.nextPrayerTime12;
            }
        } catch (Exception ignored) {}
        return buildSalatukNotification(context, prayerName, prayerTime12, cityName, hijriDate, timerText, nextName, nextTime, isAdhanAlert);
    }

    public static class ActivePrayerInfo {
        public String prayerName;
        public String prayerTime12;
        public String cityName;
        public String hijriDate;
        public String timerText;
        public String nextPrayerName;
        public String nextPrayerTime12;
    }

    public static ActivePrayerInfo calculateCurrentActivePrayer(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(AdhanAlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE);
        String cityName = prefs.getString("city_name", "الهفوف");
        if (cityName.equals("موقعك")) cityName = "الهفوف";
        String hijriDate = prefs.getString("hijri_date", null);
        if (hijriDate == null) hijriDate = getHijriDateArabic(context);

        String fajr = prefs.getString("time_fajr", "04:45");
        String dhuhr = prefs.getString("time_dhuhr", "11:27");
        String asr = prefs.getString("time_asr", "14:45");
        String maghrib = prefs.getString("time_maghrib", "17:15");
        String isha = prefs.getString("time_isha", "18:45");

        String[] times24 = { fajr, dhuhr, asr, maghrib, isha };
        String[] names = { "الفجر", "الظهر", "العصر", "المغرب", "العشاء" };
        String[] keys = { "fajr", "dhuhr", "asr", "maghrib", "isha" };

        Calendar now = Calendar.getInstance();
        int nowMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        int nowSeconds = now.get(Calendar.SECOND);
        int nowTotalSec = nowMinutes * 60 + nowSeconds;

        int[] prayerSecs = new int[5];
        for (int i = 0; i < 5; i++) {
            try {
                String[] p = times24[i].split(":");
                int h = Integer.parseInt(p[0].trim());
                int m = Integer.parseInt(p[1].trim());
                prayerSecs[i] = (h * 60 + m) * 60;
            } catch (Exception e) {
                prayerSecs[i] = (i * 3 + 4) * 3600;
            }
        }

        int activeIdx = 4;
        int elapsedSec;
        if (nowTotalSec < prayerSecs[0]) {
            activeIdx = 4;
            elapsedSec = nowTotalSec + (24 * 3600 - prayerSecs[4]);
        } else {
            for (int i = 4; i >= 0; i--) {
                if (nowTotalSec >= prayerSecs[i]) {
                    activeIdx = i;
                    elapsedSec = nowTotalSec - prayerSecs[i];
                    break;
                }
            }
            if (activeIdx < 0 || activeIdx > 4) activeIdx = 0;
            elapsedSec = Math.max(0, nowTotalSec - prayerSecs[activeIdx]);
        }

        String timerText;
        if (elapsedSec < 3600) {
            int m = elapsedSec / 60;
            int s = elapsedSec % 60;
            timerText = String.format(Locale.US, "+ %02d:%02d", m, s);
        } else {
            int h = elapsedSec / 3600;
            int m = (elapsedSec % 3600) / 60;
            timerText = String.format(Locale.US, "+ %02d:%02d", h, m);
        }

        String time12 = prefs.getString("time12_" + keys[activeIdx], null);
        if (time12 == null || time12.isEmpty()) {
            time12 = formatTime12(times24[activeIdx]);
        }

        int nextIdx = (activeIdx + 1) % 5;
        String nextTime12 = prefs.getString("time12_" + keys[nextIdx], null);
        if (nextTime12 == null || nextTime12.isEmpty()) {
            nextTime12 = formatTime12(times24[nextIdx]);
        }

        ActivePrayerInfo info = new ActivePrayerInfo();
        info.prayerName = names[activeIdx];
        info.prayerTime12 = time12;
        info.cityName = cityName;
        info.hijriDate = hijriDate;
        info.timerText = timerText;
        info.nextPrayerName = names[nextIdx];
        info.nextPrayerTime12 = nextTime12;
        return info;
    }

    public static void updateAndShowSalatukNotification(Context context) {
        try {
            ActivePrayerInfo info = calculateCurrentActivePrayer(context);
            showOngoingPrayerNotification(
                    context,
                    info.prayerName,
                    info.prayerTime12,
                    info.cityName,
                    info.hijriDate,
                    info.timerText,
                    info.nextPrayerName,
                    info.nextPrayerTime12,
                    false
            );
        } catch (Exception ignored) {}
    }

    public static void showOngoingPrayerNotification(
            Context context,
            String prayerName,
            String prayerTime12,
            String cityName,
            String hijriDate,
            String timerText,
            String nextPrayerName,
            String nextPrayerTime12,
            boolean isAdhanAlert
    ) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            Notification notif = buildSalatukNotification(context, prayerName, prayerTime12, cityName, hijriDate, timerText, nextPrayerName, nextPrayerTime12, isAdhanAlert);
            nm.notify(NOTIFICATION_ID_PRAYER, notif);
        } catch (Exception ignored) {}
    }

    public static void showOngoingPrayerNotification(
            Context context,
            String prayerName,
            String prayerTime12,
            String cityName,
            String hijriDate,
            String timerText,
            boolean isAdhanAlert
    ) {
        String nextName = null;
        String nextTime = null;
        try {
            ActivePrayerInfo info = calculateCurrentActivePrayer(context);
            if (info != null) {
                nextName = info.nextPrayerName;
                nextTime = info.nextPrayerTime12;
            }
        } catch (Exception ignored) {}
        showOngoingPrayerNotification(context, prayerName, prayerTime12, cityName, hijriDate, timerText, nextName, nextTime, isAdhanAlert);
    }

    public static void cancelOngoingPrayerNotification(Context context) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID_PRAYER);
            }
        } catch (Exception ignored) {}
    }
}
