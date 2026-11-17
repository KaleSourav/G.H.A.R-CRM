import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';

const ALARM_CHANNEL_ID = 'followup-alarm-channel';
const ALARM_CATEGORY_ID = 'followup_alarm_category';

/**
 * Configure global foreground notification behavior.
 * When the app is in the foreground, it will also play sound, vibrate, and show alert.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/**
 * Initialize Android notification channels, categories, and request runtime permissions.
 */
export async function initNotificationService() {
  try {
    // 1. Request permissions (Handles Android 13+ POST_NOTIFICATIONS)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NotificationService] Notification permission not granted');
    }

    // 2. Configure Android High-Priority Alarm Channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
        name: 'Urgent Follow-up Alarms',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500, 250, 1000],
        enableVibrate: true,
        lightColor: '#E8A020',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        showBadge: true,
        sound: 'default',
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        },
      });
    }

    // 3. Register Action Buttons for the Alarm Notification (Snooze 5M & Call)
    try {
      await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY_ID, [
        {
          identifier: 'ACTION_SNOOZE_5M',
          buttonTitle: '⏰ Snooze 5M',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'ACTION_CALL',
          buttonTitle: '📞 Call Now',
          options: { opensAppToForeground: true },
        },
      ]);
    } catch (catErr) {
      console.warn('[NotificationService] Category setup notice:', catErr.message);
    }

    console.log('[NotificationService] Notification and Alarm service initialized');
    return true;
  } catch (err) {
    console.error('[NotificationService] Init error:', err.message);
    return false;
  }
}

/**
 * Schedule an exact high-priority alarm notification.
 * Works when the app is completely closed, killed, in the background, or screen is locked.
 */
export async function scheduleFollowUpAlarm({
  id,
  title,
  body,
  date,
  leadId,
  leadName,
  phone,
  taskId,
  repeatMinutes = 0,
}) {
  try {
    const targetDate = new Date(date);
    const now = Date.now();
    const diffSecs = Math.round((targetDate.getTime() - now) / 1000);
    const identifier = `alarm_${id || leadId || taskId}`;

    // Cancel existing scheduled alarm for this item first
    await cancelFollowUpAlarm(id || leadId || taskId);

    const safeSecs = Math.max(1, diffSecs);
    const displayName = leadName || title || 'Prospect';

    const notifId = await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: `🚨 FOLLOW-UP ALARM: ${displayName}`,
        body: body || `Scheduled follow-up is due now! Tap to call or snooze.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500, 250, 500, 250, 1000],
        categoryIdentifier: ALARM_CATEGORY_ID,
        data: {
          id: id || leadId || taskId,
          leadId: leadId || null,
          taskId: taskId || null,
          leadName: displayName,
          phone: phone || null,
          repeatMinutes: Number(repeatMinutes) || 0,
          type: 'followup_alarm',
        },
      },
      trigger: {
        channelId: ALARM_CHANNEL_ID,
        type: 'timeInterval',
        seconds: safeSecs,
        repeats: false,
      },
    });

    console.log(`[NotificationService] Scheduled alarm "${identifier}" in ${safeSecs}s for ${targetDate.toLocaleTimeString()}`);
    return notifId;
  } catch (err) {
    console.error('[NotificationService] Failed to schedule alarm:', err.message);
    return null;
  }
}

/**
 * Cancel a scheduled alarm.
 */
export async function cancelFollowUpAlarm(id) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`alarm_${id}`);
    console.log(`[NotificationService] Cancelled alarm for "${id}"`);
  } catch (err) {
    // Ignore cancel error if not found
  }
}

/**
 * Quick 5-Minute Snooze Alarm.
 * Schedules an alarm to fire exactly 5 minutes (or specified minutes) from now.
 */
export async function scheduleSnoozeAlarm({
  leadId,
  taskId,
  leadName,
  phone,
  minutes = 5,
}) {
  const snoozeSecs = Math.max(1, Math.round(minutes * 60));
  const identifier = `alarm_${leadId || taskId || 'snooze'}`;

  await cancelFollowUpAlarm(leadId || taskId);

  return Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: `⏰ SNOOZE ALARM: ${leadName || 'Follow-Up'}`,
      body: `5-minute snooze alert! Follow-up with ${leadName || 'client'} is pending action.`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 500, 250, 500, 250, 500, 250, 1000],
      categoryIdentifier: ALARM_CATEGORY_ID,
      data: {
        leadId: leadId || null,
        taskId: taskId || null,
        leadName: leadName || '',
        phone: phone || null,
        repeatMinutes: 5,
        type: 'followup_alarm',
      },
    },
    trigger: {
      channelId: ALARM_CHANNEL_ID,
      type: 'timeInterval',
      seconds: snoozeSecs,
      repeats: false,
    },
  });
}

/**
 * Sync all upcoming follow-ups and tasks to Android AlarmManager.
 * Ensures all upcoming events will ring even if app is closed or offline.
 */
export async function syncUpcomingAlarmsFromLeadsAndTasks(leads = [], tasks = []) {
  try {
    const now = Date.now();
    for (const lead of leads) {
      if (lead.next_followup_at) {
        const target = new Date(lead.next_followup_at).getTime();
        const isUpcoming = target > now;
        // Schedule if upcoming OR overdue within the last 30 days
        if (isUpcoming || (now - target) < 30 * 86400000) {
          await scheduleFollowUpAlarm({
            id: lead.id,
            leadId: lead.id,
            leadName: lead.name,
            phone: lead.phone,
            title: lead.name,
            date: isUpcoming ? lead.next_followup_at : new Date(now + 2000),
            body: isUpcoming ? undefined : `🚨 Overdue: Scheduled follow-up with "${lead.name}" is pending! Tap to call or snooze.`,
          });
        }
      }
    }

    for (const task of tasks) {
      if (!task.completed && task.due_date) {
        const target = new Date(task.due_date).getTime();
        const isUpcoming = target > now;
        if (isUpcoming || (now - target) < 30 * 86400000) {
          await scheduleFollowUpAlarm({
            id: task.id,
            taskId: task.id,
            leadId: task.lead_id,
            leadName: task.lead?.name || task.title,
            phone: task.lead?.phone,
            title: task.title,
            date: isUpcoming ? task.due_date : new Date(now + 3000),
            body: isUpcoming ? undefined : `🚨 Overdue Task: "${task.title}" is pending your action!`,
          });
        }
      }
    }
  } catch (err) {
    console.error('[NotificationService] Sync upcoming alarms error:', err.message);
  }
}
