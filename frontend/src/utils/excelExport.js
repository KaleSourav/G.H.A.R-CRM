import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from './helpers';

/**
 * Format and export leads array to a native Microsoft Excel (.xlsx) file
 * @param {Array} leads - Array of lead objects from database / API
 * @param {string} filename - Target filename (defaults to GHAR_Leads_Export_YYYY-MM-DD.xlsx)
 */
export function exportLeadsToExcel(leads, filename = '') {
  if (!leads || !leads.length) {
    throw new Error('No leads to export');
  }

  const exportDate = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `GHAR_Leads_Export_${exportDate}.xlsx`;

  // Map database lead objects into clean, professional spreadsheet columns
  const rows = leads.map((lead, index) => {
    // Format budgets
    let budgetDisplay = 'Not Specified';
    if (lead.budget_min && lead.budget_max) {
      budgetDisplay = `${formatCurrency(lead.budget_min)} - ${formatCurrency(lead.budget_max)}`;
    } else if (lead.budget_max) {
      budgetDisplay = `Up to ${formatCurrency(lead.budget_max)}`;
    } else if (lead.budget_min) {
      budgetDisplay = `From ${formatCurrency(lead.budget_min)}`;
    }

    return {
      'S.No': index + 1,
      'Lead ID': lead.id || '',
      'Lead Name': lead.name || '',
      'Phone Number': lead.phone || '',
      'Email': lead.email || '',
      'Alternate Phone': lead.alternate_phone || '',
      'Alternate Email': lead.alternate_email || '',
      'Pipeline Stage': lead.stage || 'New / Unassigned',
      'Priority': (lead.priority || 'warm').toUpperCase(),
      'Lead Score': lead.lead_score ?? 0,
      'Interested Project': lead.project?.name || '',
      'Developer': lead.project?.developer_name || '',
      'Project Location': lead.project?.location || '',
      'Configuration': lead.configuration || '',
      'Budget Range': budgetDisplay,
      'Budget Min (INR)': lead.budget_min ? formatCurrency(lead.budget_min) : '',
      'Budget Max (INR)': lead.budget_max ? formatCurrency(lead.budget_max) : '',
      'Location Preference': lead.location_pref || '',
      'Purchase Purpose': lead.purpose ? lead.purpose.replace(/_/g, ' ').toUpperCase() : 'NOT SPECIFIED',
      'Lead Source': lead.source || 'Manual Entry',
      'Sub-Source / Campaign': lead.sub_source || '',
      'Assigned Sales Executive': lead.assignee?.name || 'Unassigned',
      'Assignee Email': lead.assignee?.email || '',
      'Assignee Phone': lead.assignee?.phone || '',
      'Assigned Date': lead.assigned_at ? formatDate(lead.assigned_at) : 'Not assigned',
      'SLA Breach': lead.sla_breach ? 'YES' : 'NO',
      'First Contacted Date': lead.first_contacted_at ? formatDate(lead.first_contacted_at) : 'Pending',
      'Last Activity Date': lead.last_activity_at ? formatDate(lead.last_activity_at) : '',
      'Next Follow-up': lead.next_followup_at ? formatDate(lead.next_followup_at) : '',
      'Lost Reason': lead.lost_reason || '',
      'Client Notes': lead.notes || '',
      'Created Date': lead.created_at ? formatDate(lead.created_at) : '',
      'Last Updated Date': lead.updated_at ? formatDate(lead.updated_at) : '',
    };
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-calculate column widths based on content length
  const colKeys = Object.keys(rows[0] || {});
  const colWidths = colKeys.map(key => {
    let maxLen = key.length;
    for (const r of rows) {
      const val = r[key] !== null && r[key] !== undefined ? String(r[key]) : '';
      if (val.length > maxLen) {
        maxLen = val.length;
      }
    }
    // Cap minimum 10 and max 45 for nice presentation
    return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
  });
  worksheet['!cols'] = colWidths;

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Export');

  // Trigger download
  XLSX.writeFile(workbook, finalFilename);
}
