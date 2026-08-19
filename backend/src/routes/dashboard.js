const express = require('express');
const { supabaseAdmin } = require('../supabaseAdmin');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard — aggregated metrics
router.get('/', async (req, res) => {
  try {
    const { orgId, userRole, user } = req;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();

    // Base filter for executive view
    const execFilter = (q) => userRole === 'executive' ? q.eq('assigned_to', user.id) : q;

    // Total leads
    const leadsQ = execFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('org_id', orgId));
    const { count: totalLeads } = await leadsQ;

    // New leads this month
    const newThisMonthQ = execFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true })
      .eq('org_id', orgId).gte('created_at', startOfMonth));
    const { count: newThisMonth } = await newThisMonthQ;

    // Leads by stage
    const { data: stageData } = await execFilter(supabaseAdmin.from('leads')
      .select('stage').eq('org_id', orgId).neq('stage', 'Lost / Dropped'));
    const byStage = (stageData || []).reduce((acc, l) => {
      acc[l.stage] = (acc[l.stage] || 0) + 1;
      return acc;
    }, {});

    // Leads by source
    const { data: sourceData } = await execFilter(supabaseAdmin.from('leads').select('source').eq('org_id', orgId));
    const bySource = (sourceData || []).reduce((acc, l) => {
      acc[l.source] = (acc[l.source] || 0) + 1;
      return acc;
    }, {});

    // Leads by priority
    const { data: priorityData } = await execFilter(supabaseAdmin.from('leads').select('priority').eq('org_id', orgId));
    const byPriority = (priorityData || []).reduce((acc, l) => {
      acc[l.priority] = (acc[l.priority] || 0) + 1;
      return acc;
    }, {});

    // Converted (Sold + Booking) this month
    const { count: converted } = await execFilter(supabaseAdmin.from('leads')
      .select('*', { count: 'exact', head: true }).eq('org_id', orgId)
      .in('stage', ['Sold / Closed Won', 'Booking']).gte('updated_at', startOfMonth));

    // SLA breaches
    const { count: slaBreaches } = await execFilter(supabaseAdmin.from('leads')
      .select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('sla_breach', true));

    // SLA breached lead list (top 10)
    const slaQ = execFilter(supabaseAdmin.from('leads')
      .select('id, name, phone, source, assigned_to, created_at, assignee:users!leads_assigned_to_fkey(name)')
      .eq('org_id', orgId).eq('sla_breach', true).order('created_at').limit(10));
    const { data: slaLeads } = await slaQ;

    // Tasks due today
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    const tasksQ = supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true })
      .eq('org_id', orgId).eq('status', 'pending')
      .gte('due_date', todayStart.toISOString()).lte('due_date', todayEnd.toISOString());
    const { count: tasksDueToday } = userRole === 'executive' ? await tasksQ.eq('user_id', user.id) : await tasksQ;

    // Overdue tasks
    const overdueQ = supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true })
      .eq('org_id', orgId).in('status', ['pending','overdue']).lt('due_date', todayStart.toISOString());
    const { count: overdueTasks } = userRole === 'executive' ? await overdueQ.eq('user_id', user.id) : await overdueQ;

    // Team leaderboard (admin/manager only)
    let leaderboard = [];
    if (['admin','manager'].includes(userRole)) {
      const { data: execs } = await supabaseAdmin
        .from('users').select('id, name, avatar_url').eq('org_id', orgId).eq('role', 'executive').eq('status', 'active');

      if (execs?.length) {
        leaderboard = await Promise.all(execs.map(async (exec) => {
          const { count: total } = await supabaseAdmin.from('leads')
            .select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('assigned_to', exec.id);
          const { count: converted } = await supabaseAdmin.from('leads')
            .select('*', { count: 'exact', head: true }).eq('org_id', orgId)
            .eq('assigned_to', exec.id).in('stage', ['Sold / Closed Won', 'Booking']);
          const { count: active } = await supabaseAdmin.from('leads')
            .select('*', { count: 'exact', head: true }).eq('org_id', orgId)
            .eq('assigned_to', exec.id).not('stage', 'in', '("Sold / Closed Won","Lost / Dropped")');
          return {
            ...exec,
            total_leads: total || 0,
            converted: converted || 0,
            active: active || 0,
            conversion_rate: total ? Math.round(((converted || 0) / total) * 100) : 0,
          };
        }));
        leaderboard.sort((a, b) => b.conversion_rate - a.conversion_rate);
      }
    }

    // Projects summary
    const { data: projectsSummary } = await supabaseAdmin
      .from('projects').select('id, name, total_units, available_units, status').eq('org_id', orgId);

    res.json({
      totals: {
        leads: totalLeads || 0,
        newThisMonth: newThisMonth || 0,
        converted: converted || 0,
        slaBreaches: slaBreaches || 0,
        tasksDueToday: tasksDueToday || 0,
        overdueTasks: overdueTasks || 0,
        conversionRate: totalLeads ? Math.round(((converted || 0) / totalLeads) * 100) : 0,
      },
      byStage,
      bySource,
      byPriority,
      slaLeads: slaLeads || [],
      leaderboard,
      projects: projectsSummary || [],
    });
  } catch (err) {
    console.error('[Dashboard]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
