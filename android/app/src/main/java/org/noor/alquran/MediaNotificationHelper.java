package org.noor.alquran;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Build;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;
import androidx.core.app.NotificationCompat;

/**
 * MediaNotificationHelper:
 * Persistent Android Media Playback Notification with Android MediaSession & MediaStyle.
 * Features:
 * - Dedicated Play/Pause control
 * - Dedicated Stop control (instantly stops audio directly from notification without opening app)
 * - Lockscreen and media controls area integration
 * - Real-time playback state synchronization
 */
public class MediaNotificationHelper {
    private static final String TAG = "MediaNotifHelper";
    public static final String CHANNEL_MEDIA_ID = "noor_media_playback_channel_v2";
    public static final int NOTIFICATION_ID_MEDIA = 9991;

    public static final String ACTION_MEDIA_PLAY = "org.noor.alquran.ACTION_MEDIA_PLAY";
    public static final String ACTION_MEDIA_PAUSE = "org.noor.alquran.ACTION_MEDIA_PAUSE";
    public static final String ACTION_MEDIA_TOGGLE = "org.noor.alquran.ACTION_MEDIA_TOGGLE";
    public static final String ACTION_MEDIA_STOP = "org.noor.alquran.ACTION_MEDIA_STOP";
    public static final String ACTION_MEDIA_CLOSE = "org.noor.alquran.ACTION_MEDIA_CLOSE";

    private static MediaSessionCompat mediaSession = null;
    private static String lastTitle = "";
    private static String lastArtist = "";
    private static boolean lastPlayingState = false;

    public static boolean isLiveRadioStream() {
        return (lastTitle != null && lastTitle.contains("إذاعة"))
                || (lastArtist != null && (lastArtist.contains("إذاعة") || lastArtist.contains("بث مباشر")));
    }

    private static synchronized void ensureMediaSession(Context context) {
        if (mediaSession != null) return;
        try {
            mediaSession = new MediaSessionCompat(context.getApplicationContext(), "NoorAlQuranMediaSession");
            mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
            mediaSession.setCallback(new MediaSessionCompat.Callback() {
                @Override
                public void onPlay() {
                    Log.i(TAG, "MediaSession onPlay triggered");
                    MainActivity.dispatchMediaAction("play");
                    showOrUpdate(context, lastTitle, lastArtist, true);
                }

                @Override
                public void onPause() {
                    Log.i(TAG, "MediaSession onPause triggered");
                    MainActivity.dispatchMediaAction("pause");
                    if (isLiveRadioStream()) {
                        // For live radio stations, user tapping pause wants to stop & dismiss!
                        MainActivity.dispatchMediaAction("stop");
                        dismiss(context);
                    } else {
                        showOrUpdate(context, lastTitle, lastArtist, false);
                    }
                }

                @Override
                public void onStop() {
                    Log.i(TAG, "MediaSession onStop triggered");
                    MainActivity.dispatchMediaAction("stop");
                    dismiss(context);
                }

                @Override
                public void onCustomAction(String action, android.os.Bundle extras) {
                    Log.i(TAG, "MediaSession onCustomAction: " + action);
                    if (ACTION_MEDIA_STOP.equals(action) || ACTION_MEDIA_CLOSE.equals(action) || "stop".equalsIgnoreCase(action)) {
                        onStop();
                    }
                }

                @Override
                public void onSkipToPrevious() {
                    Log.i(TAG, "MediaSession onSkipToPrevious triggered");
                    MainActivity.dispatchMediaAction("previous");
                }

                @Override
                public void onSkipToNext() {
                    Log.i(TAG, "MediaSession onSkipToNext triggered");
                    MainActivity.dispatchMediaAction("next");
                }
            });
            mediaSession.setActive(true);
        } catch (Exception e) {
            Log.w(TAG, "Failed to initialize MediaSessionCompat: " + e.getMessage());
        }
    }

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        NotificationChannel channel = nm.getNotificationChannel(CHANNEL_MEDIA_ID);
        if (channel == null) {
            channel = new NotificationChannel(
                    CHANNEL_MEDIA_ID,
                    "مشغل التلاوة والإذاعة (التحكم بالصوت)",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("إشعار التحكم الدائم بتلاوة القرآن الكريم والبث المباشر للإذاعة مع أزرار الإيقاف والتشغيل");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            channel.enableVibration(false);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(channel);
        }
    }

    public static synchronized void showOrUpdate(Context context, String title, String artist, boolean isPlaying) {
        if (context == null) return;
        try {
            ensureChannel(context);
            ensureMediaSession(context);

            if (title == null || title.trim().isEmpty()) title = "القرآن الكريم";
            if (artist == null || artist.trim().isEmpty()) artist = "نور القرآن";

            lastTitle = title;
            lastArtist = artist;
            lastPlayingState = isPlaying;

            // Update MediaSession state with explicit CustomAction for STOP so Android 11+ Quick Settings Media displays a STOP button
            if (mediaSession != null) {
                int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
                long actions = PlaybackStateCompat.ACTION_PLAY
                        | PlaybackStateCompat.ACTION_PAUSE
                        | PlaybackStateCompat.ACTION_PLAY_PAUSE
                        | PlaybackStateCompat.ACTION_STOP
                        | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                        | PlaybackStateCompat.ACTION_SKIP_TO_NEXT;

                PlaybackStateCompat.CustomAction stopCustomAction = new PlaybackStateCompat.CustomAction.Builder(
                        ACTION_MEDIA_STOP,
                        "إيقاف تام",
                        android.R.drawable.ic_menu_close_clear_cancel
                ).build();

                PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
                        .setActions(actions)
                        .addCustomAction(stopCustomAction)
                        .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f);

                mediaSession.setPlaybackState(stateBuilder.build());

                mediaSession.setMetadata(new MediaMetadataCompat.Builder()
                        .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                        .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                        .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "نور القرآن")
                        .build());

                mediaSession.setActive(true);
            }

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent openPi = PendingIntent.getActivity(
                    context,
                    930,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Play/Pause intent
            Intent toggleIntent = new Intent(context, MediaActionReceiver.class);
            toggleIntent.setAction(isPlaying ? ACTION_MEDIA_PAUSE : ACTION_MEDIA_PLAY);
            PendingIntent togglePi = PendingIntent.getBroadcast(
                    context,
                    931,
                    toggleIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Dedicated Stop intent
            Intent stopIntent = new Intent(context, MediaActionReceiver.class);
            stopIntent.setAction(ACTION_MEDIA_STOP);
            PendingIntent stopPi = PendingIntent.getBroadcast(
                    context,
                    932,
                    stopIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            androidx.media.app.NotificationCompat.MediaStyle mediaStyle = new androidx.media.app.NotificationCompat.MediaStyle();
            if (mediaSession != null) {
                mediaStyle.setMediaSession(mediaSession.getSessionToken());
            }
            mediaStyle.setShowActionsInCompactView(0, 1); // 0: Play/Pause, 1: Stop
            mediaStyle.setShowCancelButton(true);
            mediaStyle.setCancelButtonIntent(stopPi);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_MEDIA_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(artist)
                    .setSubText("نور القرآن")
                    .setContentIntent(openPi)
                    .setDeleteIntent(stopPi)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setStyle(mediaStyle)
                    .setColor(Color.parseColor("#123B2A"))
                    .setShowWhen(false)
                    .setOngoing(isPlaying)
                    .setAutoCancel(!isPlaying);

            Bitmap largeIcon = PrayerNotificationHelper.getSalatukMosqueIcon(context);
            if (largeIcon != null) {
                builder.setLargeIcon(largeIcon);
            }

            // Action 0: Play/Pause button
            if (isPlaying) {
                builder.addAction(android.R.drawable.ic_media_pause, "إيقاف مؤقت", togglePi);
            } else {
                builder.addAction(android.R.drawable.ic_media_play, "تشغيل", togglePi);
            }

            // Action 1: Dedicated Stop button
            builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "إيقاف تام", stopPi);

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID_MEDIA, builder.build());
            }
        } catch (Exception e) {
            Log.e(TAG, "Error displaying media notification: " + e.getMessage(), e);
        }
    }

    public static synchronized void dismiss(Context context) {
        if (context == null) return;
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID_MEDIA);
            }
            if (mediaSession != null) {
                // Must set STATE_NONE with actions=0 so Android 11+ System UI media carousel completely clears the card!
                mediaSession.setPlaybackState(new PlaybackStateCompat.Builder()
                        .setState(PlaybackStateCompat.STATE_NONE, 0, 0f)
                        .setActions(0)
                        .build());
                mediaSession.setActive(false);
            }
            lastPlayingState = false;
            Log.i(TAG, "Media notification dismissed and MediaSession set to STATE_NONE.");
        } catch (Exception e) {
            Log.w(TAG, "Error dismissing media notification: " + e.getMessage());
        }
    }

    /**
     * BroadcastReceiver to handle notification buttons (Play/Pause, Stop) directly.
     */
    public static class MediaActionReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null) return;
            String action = intent.getAction();
            Log.i(TAG, "MediaActionReceiver received action: " + action);

            if (ACTION_MEDIA_STOP.equals(action) || ACTION_MEDIA_CLOSE.equals(action)) {
                MainActivity.dispatchMediaAction("stop");
                dismiss(context);
                return;
            }

            if (ACTION_MEDIA_PLAY.equals(action)) {
                MainActivity.dispatchMediaAction("play");
                showOrUpdate(context, lastTitle, lastArtist, true);
                return;
            }

            if (ACTION_MEDIA_PAUSE.equals(action)) {
                MainActivity.dispatchMediaAction("pause");
                if (isLiveRadioStream()) {
                    // For live radio streams, pause means stop & dismiss!
                    MainActivity.dispatchMediaAction("stop");
                    dismiss(context);
                } else {
                    showOrUpdate(context, lastTitle, lastArtist, false);
                }
                return;
            }

            if (ACTION_MEDIA_TOGGLE.equals(action)) {
                MainActivity.dispatchMediaAction("toggle");
                showOrUpdate(context, lastTitle, lastArtist, !lastPlayingState);
            }
        }
    }
}
