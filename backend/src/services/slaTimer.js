const cron = require('node-cron');
const { supabaseAdmin } = require('../supabaseAdmin');

/**
 * SLA Timer Service
 * Runs every 5 minutes, checks for leads that haven't been contacted
 * within the org's configured SLA window (default: 30 min).
 *
 * Marks sla_breach = true on breached leads and creates notifications
 * for the assigned executive + their manager.
 */

async function checkSLABreaches() {
  console.log('[SLA Timer] Running SLA breach check...');

  try {
    // Get all orgs and their SLA settings
    const { data: orgs, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, settings');

    if (orgError) throw orgError;

    for (const org of orgs || []) {
      const slaHours = org.settings?.sla_hours || 0.5;
      const slaMinutes = slaHours * 60;
      const slaThreshold = new Date(Date.now() - slaMinutes * 60 * 1000).toISOString();

      // Find leads that:
      // 1. Are still in "New / Unassigned" stage
      // 2. Were created before the SLA threshold
      // 3. Not already marked as breached
      const { data: breachedLeads, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('id, name, assigned_to, org_id, created_at')
        .eq('org_id', org.id)
        .eq('stage', 'New / Unassigned')
        .eq('sla_breach', false)
        .lt('created_at', slaThreshold);

      if (leadsError) {
        console.error(`[SLA Timer] Error fetching leads for org ${org.id}:`, leadsError.message);
        continue;
      }

      if (!breachedLeads || breachedLeads.length === 0) continue;

      console.log(`[SLA Timer] Found ${breachedLeads.length} SLA breaches in org ${org.id}`);

      const leadIds = breachedLeads.map(l => l.id);

      // Mark all as breached
      await supabaseAdmin
        .from('leads')
        .update({ sla_breach: true })
        .in('id', leadIds);

      // Create notifications for each breached lead
      const notifications = [];
      for (const lead of breachedLeads) {
        if (lead.assigned_to) {
          notifications.push({
            org_id: org.id,
            user_id: lead.assigned_to,
            type: 'sla_breach',
            title: '⚠️ SLA Breach Alert',
            content: `Lead "${lead.name}" has not been contacted within ${slaMinutes} minutes!`,
            lead_id: lead.id,
          });

          // Also notify the manager
          const { data: exec } = await supabaseAdmin
            .from('users')
            .select('manager_id')
            .eq('id', lead.assigned_to)
            .single();

          if (exec?.manager_id) {
            notifications.push({
              org_id: org.id,
              user_id: exec.manager_id,
              type: 'sla_breach',
              title: '⚠️ Team SLA Breach',
              content: `Lead "${lead.name}" assigned to your team has not been contacted within ${slaMinutes} minutes!`,
              lead_id: lead.id,
            });
          }
        }
      }

      if (notifications.length > 0) {
        await supabaseAdmin.from('notifications').insert(notifications);
      }

      // Audit
      await supabaseAdmin.from('audit_logs').insert(
        leadIds.map(id => ({
          org_id: org.id,
          user_id: null,
          action: 'lead.sla_breach',
          entity_type: 'lead',
          entity_id: id,
          new_values: { sla_breach: true, sla_minutes: slaMinutes },
        }))
      );
    }

    console.log('[SLA Timer] Check complete.');
  } catch (err) {
    console.error('[SLA Timer] Fatal error:', err.message);
  }
}

/**
 * Start the SLA cron job — runs every 5 minutes
 */
function startSLATimer() {
  cron.schedule('*/5 * * * *', checkSLABreaches);
  // Also run once immediately on startup
  setTimeout(checkSLABreaches, 5000);
}

module.exports = { startSLATimer, checkSLABreaches };
