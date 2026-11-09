const cron = require('node-cron');
const { supabaseAdmin } = require('../supabaseAdmin');

/**
 * Follow-Up Reminder Service
 * Runs every minute. Finds tasks and lead follow-ups due within 15 minutes
 * and creates in-app notifications so users see alerts on time.
 */

async function checkFollowUpReminders() {
  try {
    const now = new Date();
    const in15Min = new Date(now.getTime() + 15 * 60 * 1000);
    const ago20Min = new Date(now.getTime() - 20 * 60 * 1000);

    // ── 1. Task-due notifications (tasks due in the next 15 minutes) ──
    const { data: upcomingTasks, error: taskErr } = await supabaseAdmin
      .from('tasks')
      .select('id, org_id, user_id, title, type, due_date, lead_id, notified_at')
      .in('status', ['pending', 'in_progress'])
      .gte('due_date', now.toISOString())
      .lte('due_date', in15Min.toISOString());

    if (taskErr) {
      console.error('[FollowUpReminder] Task query error:', taskErr.message);
    } else if (upcomingTasks?.length) {
      for (const task of upcomingTasks) {
        // Skip if notified recently (within 20 min)
        if (task.notified_at && new Date(task.notified_at) > ago20Min) continue;

        // Check if notification already exists in last 20 min
        const { count } = await supabaseAdmin
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', task.user_id)
          .eq('task_id', task.id)
          .eq('type', 'task_due')
          .gte('created_at', ago20Min.toISOString());

        if (count > 0) continue;

        const dueIn = Math.round((new Date(task.due_date) - now) / 60000);
        await supabaseAdmin.from('notifications').insert({
          org_id: task.org_id,
          user_id: task.user_id,
          type: 'task_due',
          title: `⏰ Task Due Soon: ${task.title}`,
          content: `Your task "${task.title}" is due in ${dueIn} minute${dueIn !== 1 ? 's' : ''}. Take action now!`,
          task_id: task.id,
          lead_id: task.lead_id || null,
        });

        // Mark task as notified
        await supabaseAdmin
          .from('tasks')
          .update({ notified_at: now.toISOString() })
          .eq('id', task.id);
      }
      console.log(`[FollowUpReminder] Sent ${upcomingTasks.length} task-due reminders`);
    }

    // ── 2. Mark overdue tasks + send overdue notifications ──
    const { data: overdueTasks, error: overdueErr } = await supabaseAdmin
      .from('tasks')
      .select('id, org_id, user_id, title, lead_id, notified_at')
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', now.toISOString());

    if (overdueErr) {
      console.error('[FollowUpReminder] Overdue query error:', overdueErr.message);
    } else if (overdueTasks?.length) {
      const overdueIds = overdueTasks.map(t => t.id);

      // Update status to overdue
      await supabaseAdmin
        .from('tasks')
        .update({ status: 'overdue' })
        .in('id', overdueIds);

      // Notify only those not recently notified
      for (const task of overdueTasks) {
        if (task.notified_at && new Date(task.notified_at) > ago20Min) continue;

        const { count } = await supabaseAdmin
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', task.user_id)
          .eq('task_id', task.id)
          .eq('type', 'task_overdue')
          .gte('created_at', ago20Min.toISOString());

        if (count > 0) continue;

        await supabaseAdmin.from('notifications').insert({
          org_id: task.org_id,
          user_id: task.user_id,
          type: 'task_overdue',
          title: `🚨 Overdue Task: ${task.title}`,
          content: `Your task "${task.title}" is OVERDUE and pending action! Please complete it immediately.`,
          task_id: task.id,
          lead_id: task.lead_id || null,
        });

        await supabaseAdmin
          .from('tasks')
          .update({ notified_at: now.toISOString() })
          .eq('id', task.id);
      }
    }

    // ── 3. Lead follow-up reminders (next_followup_at within 15 minutes) ──
    const { data: followupLeads, error: followupErr } = await supabaseAdmin
      .from('leads')
      .select('id, org_id, assigned_to, name, next_followup_at')
      .not('assigned_to', 'is', null)
      .not('next_followup_at', 'is', null)
      .gte('next_followup_at', now.toISOString())
      .lte('next_followup_at', in15Min.toISOString())
      .not('stage', 'in', '("Lost / Dropped","Sold / Closed Won")');

    if (followupErr) {
      console.error('[FollowUpReminder] Lead follow-up query error:', followupErr.message);
    } else if (followupLeads?.length) {
      for (const lead of followupLeads) {
        const { count } = await supabaseAdmin
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', lead.assigned_to)
          .eq('lead_id', lead.id)
          .eq('type', 'task_due')
          .gte('created_at', ago20Min.toISOString());

        if (count > 0) continue;

        const dueIn = Math.round((new Date(lead.next_followup_at) - now) / 60000);
        await supabaseAdmin.from('notifications').insert({
          org_id: lead.org_id,
          user_id: lead.assigned_to,
          type: 'task_due',
          title: `📞 Follow-up Due: ${lead.name}`,
          content: `Scheduled follow-up with "${lead.name}" is due in ${dueIn} minute${dueIn !== 1 ? 's' : ''}. Call or message them now!`,
          lead_id: lead.id,
          task_id: null,
        });
      }
      console.log(`[FollowUpReminder] Sent ${followupLeads.length} lead follow-up reminders`);
    }

  } catch (err) {
    console.error('[FollowUpReminder] Fatal error:', err.message);
  }
}

function startFollowUpReminder() {
  // Run every minute
  cron.schedule('* * * * *', checkFollowUpReminders);
  // Run once immediately on startup (after 10 seconds)
  setTimeout(checkFollowUpReminders, 10000);
  console.log('   Follow-up reminder service started (checks every 1 min)');
}

module.exports = { startFollowUpReminder, checkFollowUpReminders };
