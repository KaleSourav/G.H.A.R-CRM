const { supabaseAdmin } = require('../supabaseAdmin');

/**
 * Lead Auto-Assignment Engine
 * Supports two modes (configurable per org):
 *   1. round_robin     — cycle through active executives in sequence
 *   2. workload_based  — assign to executive with fewest current leads
 *
 * Assignment is scoped to executives (role = 'executive') in the same org.
 * If no executives are available, lead stays unassigned.
 */

/**
 * Get ordered list of active executives for an org
 */
async function getActiveExecutives(orgId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, last_assigned_at, current_lead_count')
    .eq('org_id', orgId)
    .eq('role', 'executive')
    .eq('status', 'active')
    .order('last_assigned_at', { ascending: true, nullsFirst: true });

  if (error) throw new Error(`Failed to fetch executives: ${error.message}`);
  return data || [];
}

/**
 * Round-robin: pick the executive who was assigned least recently
 */
async function roundRobinAssign(orgId) {
  const executives = await getActiveExecutives(orgId);
  if (!executives.length) return null;
  // First null last_assigned_at wins, otherwise oldest assignment wins
  return executives[0];
}

/**
 * Workload-based: pick the executive with fewest active leads
 */
async function workloadBasedAssign(orgId) {
  const executives = await getActiveExecutives(orgId);
  if (!executives.length) return null;

  // Sort by current_lead_count ascending
  executives.sort((a, b) => (a.current_lead_count || 0) - (b.current_lead_count || 0));
  return executives[0];
}

/**
 * Main entry point: assign a lead to an executive
 * @param {string} leadId - UUID of the lead to assign
 * @param {string} orgId  - UUID of the org
 * @param {string} assignedBy - UUID of the user triggering assignment (for audit)
 * @param {string} [mode]  - Override mode ('round_robin' | 'workload_based'). Falls back to org setting.
 * @returns {{ assigned_to: string, executive_name: string } | null}
 */
async function autoAssignLead(leadId, orgId, assignedBy, mode = null) {
  // Get org settings for assignment mode
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single();

  const assignmentMode = mode || (org?.settings?.assignment_mode) || 'round_robin';

  let executive;
  if (assignmentMode === 'workload_based') {
    executive = await workloadBasedAssign(orgId);
  } else {
    executive = await roundRobinAssign(orgId);
  }

  if (!executive) {
    console.warn(`[AutoAssign] No active executives in org ${orgId} — lead ${leadId} remains unassigned`);
    return null;
  }

  const now = new Date().toISOString();

  // Update the lead with the assignment
  const { error: leadError } = await supabaseAdmin
    .from('leads')
    .update({
      assigned_to: executive.id,
      assigned_at: now,
      stage: 'New / Unassigned', // stays at New until executive contacts
    })
    .eq('id', leadId);

  if (leadError) throw new Error(`Failed to assign lead: ${leadError.message}`);

  // Update executive's last_assigned_at and increment lead count
  await supabaseAdmin
    .from('users')
    .update({
      last_assigned_at: now,
      current_lead_count: (executive.current_lead_count || 0) + 1,
    })
    .eq('id', executive.id);

  // Log the assignment in lead_activities
  await supabaseAdmin.from('lead_activities').insert({
    lead_id: leadId,
    user_id: assignedBy,
    org_id: orgId,
    type: 'assignment',
    content: `Lead assigned to ${executive.name}`,
    metadata: { assigned_to: executive.id, assigned_by: assignedBy, mode: assignmentMode },
  });

  // Create notification for the assigned executive
  await supabaseAdmin.from('notifications').insert({
    org_id: orgId,
    user_id: executive.id,
    type: 'lead_assigned',
    title: 'New Lead Assigned',
    content: `A new lead has been assigned to you.`,
    lead_id: leadId,
  });

  // Audit log
  await supabaseAdmin.from('audit_logs').insert({
    org_id: orgId,
    user_id: assignedBy,
    action: 'lead.assigned',
    entity_type: 'lead',
    entity_id: leadId,
    new_values: { assigned_to: executive.id, mode: assignmentMode },
  });

  console.log(`[AutoAssign] Lead ${leadId} → ${executive.name} (${assignmentMode})`);
  return { assigned_to: executive.id, executive_name: executive.name };
}

/**
 * Manually reassign a lead (admin/manager action)
 */
async function reassignLead(leadId, toUserId, fromUserId, orgId) {
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('assigned_to, name')
    .eq('id', leadId)
    .single();

  const { data: toUser } = await supabaseAdmin
    .from('users')
    .select('name, current_lead_count')
    .eq('id', toUserId)
    .single();

  const now = new Date().toISOString();

  await supabaseAdmin
    .from('leads')
    .update({ assigned_to: toUserId, assigned_at: now })
    .eq('id', leadId);

  // Decrement old executive's count
  if (lead?.assigned_to && lead.assigned_to !== toUserId) {
    const { data: oldExec } = await supabaseAdmin
      .from('users')
      .select('current_lead_count')
      .eq('id', lead.assigned_to)
      .single();
    await supabaseAdmin
      .from('users')
      .update({ current_lead_count: Math.max(0, (oldExec?.current_lead_count || 1) - 1) })
      .eq('id', lead.assigned_to);
  }

  // Increment new executive's count
  if (toUser) {
    await supabaseAdmin
      .from('users')
      .update({ current_lead_count: (toUser.current_lead_count || 0) + 1, last_assigned_at: now })
      .eq('id', toUserId);
  }

  // Log activity
  await supabaseAdmin.from('lead_activities').insert({
    lead_id: leadId,
    user_id: fromUserId,
    org_id: orgId,
    type: 'assignment',
    content: `Lead reassigned to ${toUser?.name}`,
    metadata: { from: lead?.assigned_to, to: toUserId, reassigned_by: fromUserId },
  });

  // Notify new executive
  await supabaseAdmin.from('notifications').insert({
    org_id: orgId,
    user_id: toUserId,
    type: 'lead_assigned',
    title: 'Lead Reassigned to You',
    content: `Lead "${lead?.name}" has been reassigned to you.`,
    lead_id: leadId,
  });

  await supabaseAdmin.from('audit_logs').insert({
    org_id: orgId,
    user_id: fromUserId,
    action: 'lead.reassigned',
    entity_type: 'lead',
    entity_id: leadId,
    old_values: { assigned_to: lead?.assigned_to },
    new_values: { assigned_to: toUserId },
  });
}

module.exports = { autoAssignLead, reassignLead };
