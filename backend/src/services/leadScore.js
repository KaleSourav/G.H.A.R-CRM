const { supabaseAdmin } = require('../supabaseAdmin');

/**
 * Lead Scoring Engine — Rules-based weighted scoring (0–100)
 *
 * Breakdown:
 *   Source quality      : 0–30 pts  (higher for paid/intent sources)
 *   Budget clarity      : 0–25 pts  (has budget range + budget > 0)
 *   Engagement level    : 0–20 pts  (number of interactions / activities)
 *   Response speed      : 0–25 pts  (how quickly lead was first contacted)
 *
 * Thresholds:
 *   Hot  : score >= 70
 *   Warm : score 40–69
 *   Cold : score < 40
 */

const SOURCE_SCORES = {
  'Website Form': 25,
  'Facebook Ad': 22,
  'Instagram Ad': 20,
  'Google Ad': 28,
  '99acres': 24,
  'MagicBricks': 24,
  'Housing.com': 22,
  'NoBroker': 20,
  'Walk-in': 30,          // highest intent — physically visited
  'Referral - Client': 28,
  'Referral - Channel Partner': 26,
  'WhatsApp Inbound': 22,
  'Inbound Call': 26,
  'Missed Call': 15,
  'Manual Entry': 15,
  'CSV Import': 12,
};

function scoreSource(source) {
  return SOURCE_SCORES[source] || 12;
}

function scoreBudget(budgetMin, budgetMax) {
  if (!budgetMin && !budgetMax) return 0;
  if (budgetMin && budgetMax && budgetMax > budgetMin) return 25;
  if (budgetMin || budgetMax) return 15;
  return 0;
}

function scoreEngagement(activityCount) {
  if (activityCount === 0) return 0;
  if (activityCount === 1) return 5;
  if (activityCount <= 3) return 10;
  if (activityCount <= 6) return 15;
  if (activityCount <= 10) return 18;
  return 20;
}

function scoreResponseSpeed(createdAt, firstContactedAt) {
  if (!firstContactedAt) return 0;
  const minutesDiff = (new Date(firstContactedAt) - new Date(createdAt)) / 60000;
  if (minutesDiff <= 30) return 25;    // contacted within 30 min — max score
  if (minutesDiff <= 60) return 20;
  if (minutesDiff <= 120) return 15;
  if (minutesDiff <= 480) return 10;   // within 8 hours
  if (minutesDiff <= 1440) return 5;   // within 24 hours
  return 0;
}

/**
 * Calculate lead score for a lead object
 * @param {object} lead - lead record from DB
 * @param {number} activityCount - number of activity log entries
 * @returns {{ score: number, priority: string }}
 */
function calculateLeadScore(lead, activityCount = 0) {
  const sourceScore = scoreSource(lead.source);
  const budgetScore = scoreBudget(lead.budget_min, lead.budget_max);
  const engagementScore = scoreEngagement(activityCount);
  const responseScore = scoreResponseSpeed(lead.created_at, lead.first_contacted_at);

  const total = Math.min(100, sourceScore + budgetScore + engagementScore + responseScore);

  let priority = 'cold';
  if (total >= 70) priority = 'hot';
  else if (total >= 40) priority = 'warm';

  return { score: total, priority };
}

/**
 * Recalculate and update a lead's score in the database
 * @param {string} leadId
 */
async function updateLeadScore(leadId) {
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (!lead) return;

  const { count } = await supabaseAdmin
    .from('lead_activities')
    .select('*', { count: 'exact', head: true })
    .eq('lead_id', leadId);

  const { score, priority } = calculateLeadScore(lead, count || 0);

  await supabaseAdmin
    .from('leads')
    .update({ lead_score: score, priority })
    .eq('id', leadId);

  return { score, priority };
}

module.exports = { calculateLeadScore, updateLeadScore, scoreSource };
