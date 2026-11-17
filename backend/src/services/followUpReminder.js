const cron = require('node-cron');
const { supabaseAdmin } = require('../supabaseAdmin');

/**
 * Follow-Up Reminder & Continuous Snooze Service
 * Runs every minute.
 * 1. Checks tasks due within 15 minutes OR overdue (with 5-minute repeating snooze support)
 * 2. Checks leads whose scheduled follow-up (next_followup_at) is due or overdue
 * 3. Dispatches notifications to assigned executives & managers
 */

async function checkFollowUpReminders() {
  try {
    const now = new Date();
    const in15Min = new Date(now.getTime() + 15 * 60 * 1000);
    const ago5Min = new Date(now.getTime() - 4.5 * 60 * 1000);
    const ago15Min = new Date(now.getTime() - 14 * 60 * 1000);

    // ── 1. Process Tasks (Due Soon, Overdue, and 5-Min Repeating Snooze) ──
    const { data: activeTasks, error: taskErr } = await supabaseAdmin
      .from('tasks')
      .select('id, org_id, user_id, title, type, due_date, status, lead_id, notified_at, description')
      .in('status', ['pending', 'in_progress', 'overdue'])
      .lte('due_date', in15Min.toISOString());

    if (taskErr) {
      console.error('[FollowUpReminder] Task query error:', taskErr.message);
    } else if (activeTasks?.length) {
      for (const task of activeTasks) {
        if (!task.due_date || !task.user_id) continue;

        const taskDueDate = new Date(task.due_date);
        const isPastDue = taskDueDate.getTime() <= now.getTime();
        const isRepeating5m = Boolean(
          task.description && (
            task.description.includes('[SNOOZE_REPEAT_5M]') ||
            task.description.includes('[SNOOZE_5M]')
          )
        );

        // Determine throttle window: 4.5 mins for continuous 5-min snooze, 14 mins otherwise
        const throttleThreshold = isRepeating5m ? ago5Min : ago15Min;
        if (task.notified_at && new Date(task.notified_at) > throttleThreshold) {
          continue; // Recently notified, respect snooze/throttle window
        }

        // Auto-mark overdue in database if past due date
        if (isPastDue && task.status !== 'overdue') {
          await supabaseAdmin
            .from('tasks')
            .update({ status: 'overdue' })
            .eq('id', task.id);
        }

        const dueInMinutes = Math.round((taskDueDate.getTime() - now.getTime()) / 60000);
        let notifTitle = '';
        let notifContent = '';
        let notifType = 'task_due';

        if (isPastDue) {
          notifType = 'task_overdue';
          notifTitle = isRepeating5m
            ? `🚨 Continuous Snooze Alert: ${task.title}`
            : `🚨 Overdue Task: ${task.title}`;
          notifContent = isRepeating5m
            ? `5-minute snooze reminder: "${task.title}" is pending your action! Please complete or snooze.`
            : `Your task "${task.title}" is OVERDUE and pending action!`;
        } else {
          notifType = 'task_due';
          notifTitle = `⏰ Task Due Soon: ${task.title}`;
          notifContent = `Your task "${task.title}" is due in ${dueInMinutes <= 0 ? 1 : dueInMinutes} minute${dueInMinutes === 1 ? '' : 's'}. Take action now!`;
        }

        await supabaseAdmin.from('notifications').insert({
          org_id: task.org_id,
          user_id: task.user_id,
          type: notifType,
          title: notifTitle,
          content: notifContent,
          task_id: task.id,
          lead_id: task.lead_id || null,
        });

        // Update notified_at timestamp on task
        await supabaseAdmin
          .from('tasks')
          .update({ notified_at: now.toISOString() })
          .eq('id', task.id);
      }
    }

    // ── 2. Process Leads with scheduled next_followup_at ──
    const { data: followupLeads, error: followupErr } = await supabaseAdmin
      .from('leads')
      .select('id, org_id, assigned_to, name, next_followup_at')
      .not('assigned_to', 'is', null)
      .not('next_followup_at', 'is', null)
      .lte('next_followup_at', in15Min.toISOString())
      .not('stage', 'in', '("Lost / Dropped","Sold / Closed Won")');

    if (followupErr) {
      console.error('[FollowUpReminder] Lead follow-up query error:', followupErr.message);
    } else if (followupLeads?.length) {
      for (const lead of followupLeads) {
        if (!lead.next_followup_at || !lead.assigned_to) continue;

        const followupTime = new Date(lead.next_followup_at);
        const isPastDue = followupTime.getTime() <= now.getTime();

        // Check if an unread notification for this lead was created in the last 5 minutes
        const { count } = await supabaseAdmin
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', lead.assigned_to)
          .eq('lead_id', lead.id)
          .in('type', ['task_due', 'task_overdue'])
          .gte('created_at', ago5Min.toISOString());

        if (count > 0) continue;

        const dueInMinutes = Math.round((followupTime.getTime() - now.getTime()) / 60000);
        const formattedTime = followupTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let notifTitle = '';
        let notifContent = '';
        let notifType = 'task_due';

        if (isPastDue) {
          notifType = 'task_overdue';
          notifTitle = `🚨 Follow-up Overdue: ${lead.name}`;
          notifContent = `Follow-up with "${lead.name}" was scheduled for ${formattedTime} and is now overdue. Call or snooze now!`;
        } else {
          notifType = 'task_due';
          notifTitle = `⏰ Follow-up Due Soon: ${lead.name}`;
          notifContent = `Scheduled follow-up with "${lead.name}" is due in ${dueInMinutes <= 0 ? 1 : dueInMinutes} minute${dueInMinutes === 1 ? '' : 's'} (${formattedTime}). Get ready to connect!`;
        }

        await supabaseAdmin.from('notifications').insert({
          org_id: lead.org_id,
          user_id: lead.assigned_to,
          type: notifType,
          title: notifTitle,
          content: notifContent,
          lead_id: lead.id,
          task_id: null,
        });
      }
    }
  } catch (err) {
    console.error('[FollowUpReminder] Fatal error:', err.message);
  }
}

function startFollowUpReminder() {
  // Run every minute
  cron.schedule('* * * * *', checkFollowUpReminders);
  // Run once immediately on startup (after 5 seconds)
  setTimeout(checkFollowUpReminders, 5000);
  console.log('   Follow-up reminder service started (checks every 1 min, 5-min continuous snooze enabled)');
}

module.exports = { startFollowUpReminder, checkFollowUpReminders };
