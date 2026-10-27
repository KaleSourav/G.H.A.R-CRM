import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dashboardAPI, useAutoRefresh } from '../services/api';
import { formatCurrency, formatPhone, formatRelative, getInitials, getWhatsAppUrl } from '../utils/helpers';
import { Radius, Typography, Shadow } from '../theme/tokens';
import AppHeader from '../components/AppHeader';

function StatCard({ title, value, subtitle, icon, color, isDanger = false, theme, styles }) {
  const cardColor = color || theme.primary;
  return (
    <View style={[styles.statCard, isDanger && styles.statCardDanger, { borderLeftColor: cardColor }]}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIconBox, { backgroundColor: `${cardColor}18`, borderColor: `${cardColor}35` }]}>
          <Ionicons name={icon} size={17} color={cardColor} />
        </View>
        {isDanger && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>URGENT</Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>
        {typeof value === 'number' ? value.toLocaleString('en-IN') : (value ?? '—')}
      </Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle ? <Text style={styles.statSub}>{subtitle}</Text> : null}
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await dashboardAPI.get();
      const d = res?.data || res || {};
      setData(d);
    } catch (err) {
      console.error('[DashboardScreen] load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh when dashboard comes into focus (after adding lead, task, etc.)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Auto-refresh instantly on any mutation broadcast
  useAutoRefresh(load);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <AppHeader navigation={navigation} />
        <View style={styles.loaderContent}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={styles.loadingText}>Loading Executive Intelligence...</Text>
        </View>
      </View>
    );
  }

  const totals = data?.totals || {};
  const byStage = data?.byStage || {};
  const slaLeads = data?.slaLeads || [];
  const leaderboard = data?.leaderboard || [];
  const projects = data?.projects || [];

  const totalInventoryUnits = projects.reduce((acc, p) => acc + (p.total_units || 0), 0);
  const availableInventoryUnits = projects.reduce((acc, p) => acc + (p.available_units || 0), 0);

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short'
  });

  // ── Simplified 5-Phase Pipeline Funnel ────────────────────────────────────
  const countMatchingStages = (patterns) => {
    let count = 0;
    Object.entries(byStage).forEach(([key, val]) => {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (patterns.some(p => normalized.includes(p))) {
        count += Number(val) || 0;
      }
    });
    return count;
  };

  const newCount = countMatchingStages(['new']);
  const inContactCount = countMatchingStages(['contacted', 'qualif']);
  const siteVisitsCount = countMatchingStages(['sitevisit', 'sv']);
  const negotiationCount = countMatchingStages(['negotiat', 'book']);
  const wonCount = countMatchingStages(['won']);

  const funnelPhases = [
    {
      id: 'new',
      name: 'New Leads',
      sub: 'Fresh prospect inquiries',
      count: newCount,
      color: theme.info,
      icon: 'sparkles-outline',
      stageFilter: 'new',
    },
    {
      id: 'contacted',
      name: 'In Conversation',
      sub: 'Contacted & qualified buyers',
      count: inContactCount,
      color: theme.accent,
      icon: 'chatbubble-ellipses-outline',
      stageFilter: 'qualified',
    },
    {
      id: 'site_visits',
      name: 'Site Visits',
      sub: 'Scheduled & visited clients',
      count: siteVisitsCount,
      color: theme.purple,
      icon: 'location-outline',
      stageFilter: 'site_visit',
    },
    {
      id: 'negotiation',
      name: 'Negotiation & Booking',
      sub: 'Commercial structuring',
      count: negotiationCount,
      color: theme.warning,
      icon: 'briefcase-outline',
      stageFilter: 'all',
    },
    {
      id: 'won',
      name: 'Closed Won',
      sub: 'Completed deals',
      count: wonCount,
      color: theme.success,
      icon: 'trophy-outline',
      stageFilter: 'all',
    },
  ];

  const totalFunnelDeals = funnelPhases.reduce((acc, p) => acc + p.count, 0);
  const maxPhaseCount = Math.max(...funnelPhases.map(p => p.count), 1);

  return (
    <View style={styles.container}>
      <AppHeader navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Executive Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.livePulseRow}>
            <View style={styles.livePulseDot} />
            <Text style={styles.livePulseText}>EXECUTIVE INTELLIGENCE</Text>
            <Text style={styles.dateBadge}>· {todayFormatted}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.greetingTitle}>
              {timeGreeting}, {user?.name?.split(' ')[0] || 'Partner'}
            </Text>
            <Ionicons name="hand-right-outline" size={22} color={theme.primary} />
          </View>
          <Text style={styles.greetingSub}>
            Here is your live sales pipeline snapshot.
          </Text>

          {/* Quick Action Shortcuts */}
          <View style={styles.quickActionRow}>
            <TouchableOpacity
              style={styles.quickActionPrimary}
              onPress={() => navigation.navigate('LeadCreate')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={17} color={theme.textInverse} />
              <Text style={styles.quickActionPrimaryText}>Add Lead</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Pipeline')}
              activeOpacity={0.8}
            >
              <Ionicons name="git-branch-outline" size={15} color={theme.textPrimary} />
              <Text style={styles.quickActionBtnText}>Pipeline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Tasks')}
              activeOpacity={0.8}
            >
              <Ionicons name="checkbox-outline" size={15} color={theme.textPrimary} />
              <Text style={styles.quickActionBtnText}>Tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Projects')}
              activeOpacity={0.8}
            >
              <Ionicons name="business-outline" size={15} color={theme.textPrimary} />
              <Text style={styles.quickActionBtnText}>Inventory</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Executive Metrics Grid (2 columns) */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Leads"
            value={totals.leads || 0}
            subtitle={`${totals.newLeads || 0} new today`}
            icon="people"
            color={theme.primary}
            theme={theme}
            styles={styles}
          />
          <StatCard
            title="Active Deals"
            value={totals.activePipeline || 0}
            subtitle="In qualification"
            icon="trending-up"
            color={theme.accent}
            theme={theme}
            styles={styles}
          />
          <StatCard
            title="Site Visits"
            value={totals.siteVisits || 0}
            subtitle="Scheduled / Done"
            icon="calendar"
            color={theme.purple}
            theme={theme}
            styles={styles}
          />
          <StatCard
            title="Closed Won"
            value={totals.closedWon || 0}
            subtitle="Deals completed"
            icon="trophy"
            color={theme.success}
            theme={theme}
            styles={styles}
          />
          <StatCard
            title="Pipeline Value"
            value={formatCurrency(totals.pipelineValue || 0)}
            subtitle="Total opportunity"
            icon="wallet"
            color={theme.warning}
            theme={theme}
            styles={styles}
          />
          <StatCard
            title="SLA Breaches"
            value={slaLeads.length}
            subtitle={slaLeads.length > 0 ? "Immediate attention" : "All SLAs on track"}
            icon="alert-circle"
            color={theme.error}
            isDanger={slaLeads.length > 0}
            theme={theme}
            styles={styles}
          />
        </View>

        {/* Urgent SLA Action Card */}
        {slaLeads.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="warning" size={16} color={theme.error} />
                <Text style={styles.sectionTitle}>Urgent Follow-ups</Text>
                <View style={styles.countBadgeDanger}>
                  <Text style={styles.countBadgeDangerText}>{slaLeads.length}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Leads', { filter: 'sla' })}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>

            {slaLeads.slice(0, 3).map((lead) => {
              const phoneDigits = lead.phone ? String(lead.phone).replace(/\D/g, '').slice(-10) : '';
              return (
                <View key={lead.id} style={styles.urgentLeadCard}>
                  <View style={styles.urgentLeadLeft}>
                    <View style={styles.urgentAvatar}>
                      <Text style={styles.urgentAvatarText}>{getInitials(lead.name)}</Text>
                    </View>
                    <View style={styles.urgentLeadMeta}>
                      <Text style={styles.urgentLeadName}>{lead.name || 'Anonymous'}</Text>
                      <Text style={styles.urgentLeadProject}>
                        {lead.project?.name || lead.project_name || 'No Project'} · {formatPhone(lead.phone)}
                      </Text>
                      <Text style={styles.urgentLeadOverdue}>
                        Overdue by {lead.hours_overdue ? `${Math.round(lead.hours_overdue)}h` : 'SLA window'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.urgentActionsRow}>
                    {phoneDigits ? (
                      <TouchableOpacity
                        style={styles.urgentWhatsAppBtn}
                        onPress={() => {
                          const url = getWhatsAppUrl(lead.phone, lead.name, lead.project?.name);
                          if (url) Linking.openURL(url);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                      </TouchableOpacity>
                    ) : null}

                    {phoneDigits ? (
                      <TouchableOpacity
                        style={styles.urgentCallBtn}
                        onPress={() => Linking.openURL(`tel:+91${phoneDigits}`)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="call" size={14} color={theme.info} />
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={styles.urgentArrowBtn}
                      onPress={() => navigation.navigate('LeadDetail', { leadId: lead.id })}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Simplified Pipeline Stage Funnel ───────────────────────────── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="funnel-outline" size={16} color={theme.primary} />
              <Text style={styles.sectionTitle}>Pipeline Stage Funnel</Text>
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>{totalFunnelDeals} Deals</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Pipeline')}>
              <Text style={styles.viewAllText}>Kanban View →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.funnelCard}>
            {funnelPhases.map((phase) => {
              const count = phase.count;
              const percent = maxPhaseCount > 0 ? Math.round((count / maxPhaseCount) * 100) : 0;
              const share = totalFunnelDeals > 0 ? Math.round((count / totalFunnelDeals) * 100) : 0;

              return (
                <TouchableOpacity
                  key={phase.id}
                  style={styles.funnelRow}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('Leads', { filter: phase.stageFilter })}
                >
                  <View style={styles.funnelTopLine}>
                    <View style={styles.funnelLeftInfo}>
                      <View style={[styles.phaseIconBox, { backgroundColor: `${phase.color}15`, borderColor: `${phase.color}35` }]}>
                        <Ionicons name={phase.icon} size={15} color={phase.color} />
                      </View>
                      <View>
                        <Text style={styles.phaseName}>{phase.name}</Text>
                        <Text style={styles.phaseSub}>{phase.sub}</Text>
                      </View>
                    </View>

                    <View style={styles.funnelRightCount}>
                      <Text style={[styles.phaseCountText, { color: count > 0 ? phase.color : theme.textMuted }]}>
                        {count} <Text style={styles.phaseDealsLabel}>deals</Text>
                      </Text>
                      {totalFunnelDeals > 0 && (
                        <Text style={styles.phaseShareText}>{share}% of pipeline</Text>
                      )}
                    </View>
                  </View>

                  {/* Clean progress bar */}
                  <View style={styles.funnelProgressBarBg}>
                    <View
                      style={[
                        styles.funnelProgressBarFill,
                        {
                          width: `${Math.max(percent, count > 0 ? 8 : 0)}%`,
                          backgroundColor: phase.color,
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Inventory Summary */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="business-outline" size={16} color={theme.primary} />
              <Text style={styles.sectionTitle}>Project Inventory Status</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Projects')}>
              <Text style={styles.viewAllText}>View All ({projects.length}) →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inventoryCard}>
            <View style={styles.inventoryNumbersRow}>
              <View>
                <Text style={styles.inventoryNumberText}>{availableInventoryUnits}</Text>
                <Text style={styles.inventorySubText}>Units Available</Text>
              </View>
              <View style={styles.inventoryDivider} />
              <View>
                <Text style={styles.inventoryNumberText}>{totalInventoryUnits}</Text>
                <Text style={styles.inventorySubText}>Total Units</Text>
              </View>
              <View style={styles.inventoryDivider} />
              <View>
                <Text style={styles.inventoryNumberText}>
                  {totalInventoryUnits > 0 ? `${Math.round((availableInventoryUnits / totalInventoryUnits) * 100)}%` : '—'}
                </Text>
                <Text style={styles.inventorySubText}>Inventory Open</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Top Performers Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="trophy-outline" size={16} color={theme.warning} />
                <Text style={styles.sectionTitle}>Top Sales Performers</Text>
              </View>
            </View>

            <View style={styles.leaderboardCard}>
              {leaderboard.slice(0, 4).map((member, idx) => (
                <View key={member.id || idx} style={styles.leaderboardRow}>
                  <View style={styles.rankBox}>
                    <Text style={[styles.rankText, idx === 0 && { color: theme.primary }]}>
                      #{idx + 1}
                    </Text>
                  </View>
                  <View style={styles.leaderAvatar}>
                    <Text style={styles.leaderAvatarText}>{getInitials(member.name)}</Text>
                  </View>
                  <View style={styles.leaderInfo}>
                    <Text style={styles.leaderName}>{member.name}</Text>
                    <Text style={styles.leaderSub}>
                      {member.deals_won || member.deals || 0} Won · {formatCurrency(member.revenue || 0)}
                    </Text>
                  </View>
                  {idx === 0 && (
                    <Ionicons name="medal" size={18} color={theme.primary} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    centered: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    loaderContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    scroll: {
      padding: 16,
    },
    heroBanner: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
    },
    livePulseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    livePulseDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: theme.success,
      marginRight: 6,
    },
    livePulseText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.success,
    },
    dateBadge: {
      fontSize: 10,
      color: theme.textMuted,
      marginLeft: 4,
    },
    greetingTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.textPrimary,
      marginBottom: 2,
    },
    greetingSub: {
      fontSize: 12.5,
      color: theme.textSecondary,
      marginBottom: 14,
    },
    quickActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    quickActionPrimary: {
      flex: 1.2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: Radius.md,
      gap: 4,
    },
    quickActionPrimaryText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: theme.textInverse,
    },
    quickActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface2,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 4,
    },
    quickActionBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    statCard: {
      width: '48.5%',
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 3.5,
    },
    statCardDanger: {
      borderColor: `${theme.error}40`,
      backgroundColor: `${theme.error}08`,
    },
    statTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    statIconBox: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    urgentBadge: {
      backgroundColor: `${theme.error}20`,
      borderRadius: Radius.full,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: `${theme.error}40`,
    },
    urgentBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.error,
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.textPrimary,
      marginBottom: 2,
    },
    statTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    statSub: {
      fontSize: 10.5,
      color: theme.textMuted,
      marginTop: 2,
    },
    sectionContainer: {
      marginBottom: 16,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    countBadgeDanger: {
      backgroundColor: theme.error,
      borderRadius: Radius.full,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    countBadgeDangerText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    totalBadge: {
      backgroundColor: theme.surface2,
      borderRadius: Radius.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: theme.border,
      marginLeft: 4,
    },
    totalBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    viewAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    urgentLeadCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      padding: 12,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
      marginBottom: 8,
    },
    urgentLeadLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 10,
    },
    urgentAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    urgentAvatarText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.error,
    },
    urgentLeadMeta: {
      flex: 1,
    },
    urgentLeadName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    urgentLeadProject: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 1,
    },
    urgentLeadOverdue: {
      fontSize: 10.5,
      fontWeight: '600',
      color: theme.error,
      marginTop: 2,
    },
    urgentActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    urgentWhatsAppBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(37, 211, 102, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(37, 211, 102, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    urgentCallBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: `${theme.info}18`,
      borderWidth: 1,
      borderColor: `${theme.info}40`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    urgentArrowBtn: {
      padding: 4,
    },
    funnelCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 12,
    },
    funnelRow: {
      paddingVertical: 2,
    },
    funnelTopLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    funnelLeftInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    phaseIconBox: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    phaseName: {
      fontSize: 12.5,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    phaseSub: {
      fontSize: 10.5,
      color: theme.textMuted,
      marginTop: 1,
    },
    funnelRightCount: {
      alignItems: 'flex-end',
    },
    phaseCountText: {
      fontSize: 13,
      fontWeight: '800',
    },
    phaseDealsLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    phaseShareText: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 1,
    },
    funnelProgressBarBg: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.surface2,
      overflow: 'hidden',
    },
    funnelProgressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    inventoryCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inventoryNumbersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    inventoryDivider: {
      width: 1,
      height: 28,
      backgroundColor: theme.border,
    },
    inventoryNumberText: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.textPrimary,
      textAlign: 'center',
    },
    inventorySubText: {
      fontSize: 10.5,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 2,
    },
    leaderboardCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    leaderboardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    rankBox: {
      width: 24,
      alignItems: 'center',
    },
    rankText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.textMuted,
    },
    leaderAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.surface2,
      borderWidth: 1,
      borderColor: theme.borderAccent,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 8,
    },
    leaderAvatarText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    leaderInfo: {
      flex: 1,
    },
    leaderName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    leaderSub: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 1,
    },
  });
}
