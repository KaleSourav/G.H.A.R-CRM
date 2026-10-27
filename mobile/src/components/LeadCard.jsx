import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Radius, Typography, Shadow } from '../theme/tokens';
import { STAGE_CONFIG, PRIORITY_CONFIG } from '../utils/constants';
import { formatCurrency, formatPhone, formatRelative, getInitials, getWhatsAppUrl } from '../utils/helpers';

export default function LeadCard({ lead, onPress, onReassign, showAssignee = true }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  if (!lead) return null;

  const stageCfg = STAGE_CONFIG[lead.stage] || { color: '#64748B', short: lead.stage || 'New' };
  const priorityCfg = PRIORITY_CONFIG[lead.priority] || {
    label: lead.priority || 'Normal',
    color: '#64748B',
    bg: 'rgba(100,116,139,0.12)',
    border: 'rgba(100,116,139,0.25)',
  };

  const projectName = lead.project?.name || lead.project_name;
  const budgetVal = lead.budget_max || lead.budget_min || lead.budget;
  const phoneDigits = lead.phone ? String(lead.phone).replace(/\D/g, '').slice(-10) : '';

  const handleCall = (e) => {
    e?.stopPropagation?.();
    if (phoneDigits) {
      Linking.openURL(`tel:+91${phoneDigits}`);
    }
  };

  const handleWhatsApp = (e) => {
    e?.stopPropagation?.();
    if (lead.phone) {
      const url = getWhatsAppUrl(lead.phone, lead.name, projectName);
      if (url) Linking.openURL(url);
    }
  };

  const isSlaBreached = Boolean(lead.sla_breach || lead.sla_status === 'breached');

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSlaBreached && styles.cardSlaBreached,
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Top Header: Avatar + Name + Priority + Stage Pill */}
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { borderColor: `${stageCfg.color}70`, backgroundColor: `${stageCfg.color}15` }]}>
          <Text style={[styles.avatarText, { color: stageCfg.color }]}>{getInitials(lead.name)}</Text>
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.leadName} numberOfLines={1}>{lead.name || 'Anonymous'}</Text>
            {lead.priority && (
              <View style={[styles.priorityBadge, { backgroundColor: priorityCfg.bg, borderColor: priorityCfg.border }]}>
                {lead.priority === 'hot' && <Ionicons name="flame" size={10} color={priorityCfg.color} style={{ marginRight: 2 }} />}
                <Text style={[styles.priorityText, { color: priorityCfg.color }]}>{priorityCfg.label}</Text>
              </View>
            )}
          </View>
          <Text style={styles.leadPhone}>{formatPhone(lead.phone)}</Text>
        </View>

        {/* Stage Pill */}
        <View style={[styles.stagePill, { backgroundColor: `${stageCfg.color}15`, borderColor: `${stageCfg.color}40` }]}>
          <View style={[styles.stageDot, { backgroundColor: stageCfg.color }]} />
          <Text style={[styles.stageText, { color: stageCfg.color }]}>{stageCfg.short}</Text>
        </View>
      </View>

      {/* Middle Tags Row: Project, Budget, Configuration, Source */}
      <View style={styles.tagsRow}>
        {projectName ? (
          <View style={styles.tagChip}>
            <Ionicons name="business-outline" size={11} color={theme.primary} style={{ marginRight: 4 }} />
            <Text style={styles.tagText} numberOfLines={1}>{projectName}</Text>
          </View>
        ) : null}

        {budgetVal ? (
          <View style={[styles.tagChip, styles.budgetChip]}>
            <Text style={styles.budgetText}>{formatCurrency(budgetVal)}</Text>
          </View>
        ) : null}

        {lead.configuration ? (
          <View style={styles.tagChip}>
            <Text style={styles.tagText}>{lead.configuration}</Text>
          </View>
        ) : null}

        {lead.source ? (
          <View style={styles.tagChip}>
            <Text style={styles.tagTextMuted}>{lead.source}</Text>
          </View>
        ) : null}
      </View>

      {/* SLA Breach Warning Strip if applicable */}
      {isSlaBreached && (
        <View style={styles.slaBanner}>
          <Ionicons name="warning" size={12} color={theme.error} />
          <Text style={styles.slaBannerText}>
            SLA Breach · Follow-up overdue
            {lead.hours_overdue ? ` by ${Math.round(lead.hours_overdue)}h` : ''}
          </Text>
        </View>
      )}

      {/* Bottom Footer: Time ago, Assignee & 1-tap Call/WhatsApp */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Ionicons name="time-outline" size={12} color={theme.textMuted} />
          <Text style={styles.timeAgoText}>{formatRelative(lead.created_at)}</Text>

          {showAssignee && (
            <TouchableOpacity
              style={styles.assigneePill}
              onPress={(e) => {
                e?.stopPropagation?.();
                onReassign?.(lead);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={10} color={theme.textSecondary} />
              <Text style={styles.assigneeText} numberOfLines={1}>
                {lead.assigned_user?.name || lead.assigned_user_name || 'Unassigned'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          {phoneDigits ? (
            <TouchableOpacity
              style={styles.actionBtnWhatsApp}
              onPress={handleWhatsApp}
              activeOpacity={0.75}
            >
              <Ionicons name="logo-whatsapp" size={12} color="#25D366" />
              <Text style={styles.actionBtnWhatsAppText}>Chat</Text>
            </TouchableOpacity>
          ) : null}

          {phoneDigits ? (
            <TouchableOpacity
              style={styles.actionBtnCall}
              onPress={handleCall}
              activeOpacity={0.75}
            >
              <Ionicons name="call" size={12} color={theme.info} />
              <Text style={styles.actionBtnCallText}>Call</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: 13,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardSlaBreached: {
      borderColor: 'rgba(239, 68, 68, 0.45)',
      backgroundColor: `${theme.error}08`,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      marginRight: 10,
    },
    avatarText: {
      fontSize: 13,
      fontWeight: '800',
    },
    headerInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    leadName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textPrimary,
      maxWidth: '65%',
    },
    leadPhone: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    priorityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: Radius.full,
      borderWidth: 1,
    },
    priorityText: {
      fontSize: 9.5,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    stagePill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Radius.full,
      borderWidth: 1,
      gap: 5,
    },
    stageDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    stageText: {
      fontSize: 10.5,
      fontWeight: '700',
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    tagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface2,
      paddingHorizontal: 8,
      paddingVertical: 3.5,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tagText: {
      fontSize: 11,
      color: theme.textPrimary,
      fontWeight: '600',
    },
    budgetChip: {
      borderColor: theme.borderAccent,
      backgroundColor: `${theme.primary}12`,
    },
    budgetText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    tagTextMuted: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    slaBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: `${theme.error}15`,
      borderRadius: Radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: `${theme.error}30`,
    },
    slaBannerText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.error,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingTop: 8,
    },
    footerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    timeAgoText: {
      fontSize: 11,
      color: theme.textMuted,
    },
    assigneePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginLeft: 4,
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      borderRadius: Radius.xs,
      backgroundColor: theme.surface2,
    },
    assigneeText: {
      fontSize: 10.5,
      fontWeight: '600',
      color: theme.textSecondary,
      maxWidth: 70,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionBtnWhatsApp: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: `${theme.whatsapp}18`,
      paddingHorizontal: 8,
      paddingVertical: 4.5,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: `${theme.whatsapp}40`,
    },
    actionBtnWhatsAppText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.whatsapp,
    },
    actionBtnCall: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: `${theme.info}18`,
      paddingHorizontal: 8,
      paddingVertical: 4.5,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: `${theme.info}40`,
    },
    actionBtnCallText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.info,
    },
  });
}
