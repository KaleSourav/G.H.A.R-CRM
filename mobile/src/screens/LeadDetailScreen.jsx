import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput,
  Linking, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { leadsAPI, tasksAPI, useAutoRefresh } from '../services/api';
import {
  formatPhone, formatCurrency, formatRelative, formatDateTime,
  getInitials, getWhatsAppUrl,
} from '../utils/helpers';
import {
  PIPELINE_STAGES, STAGE_CONFIG, PRIORITY_CONFIG,
  ACTIVITY_TYPE_CONFIG, LOST_REASONS,
} from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';
import ReassignModal from '../components/ReassignModal';

// ────────────────────────────────────────────────────────────────────────────
// Helper: compute call count from activities
function getCallCount(activities = []) {
  return activities.filter(a => a.type === 'call').length;
}

// Helper: compute remark count (notes) from activities
function getRemarkCount(activities = []) {
  return activities.filter(a => a.type === 'note' || a.type === 'remark').length;
}

// Helper: compute WhatsApp count from activities
function getWACount(activities = []) {
  return activities.filter(a => a.type === 'whatsapp').length;
}

// Helper: parse custom manual date and time
function parseCustomDateTime(dateStr, timeStr) {
  try {
    let year, month, day;
    if (dateStr && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else if (dateStr && dateStr.includes('/')) {
      const parts = dateStr.split('/');
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
      day = now.getDate() + 1;
    }

    let hours = 11;
    let mins = 0;
    if (timeStr) {
      const isPM = /pm/i.test(timeStr);
      const isAM = /am/i.test(timeStr);
      const clean = timeStr.replace(/[^0-9:]/g, '');
      const [h, m] = clean.split(':').map(n => parseInt(n, 10));
      if (!isNaN(h)) {
        hours = h;
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
      }
      if (!isNaN(m)) mins = m;
    }

    return new Date(year, month, day, hours, mins, 0);
  } catch {
    return new Date(Date.now() + 3600000);
  }
}

// ────────────────────────────────────────────────────────────────────────────
export default function LeadDetailScreen({ route, navigation }) {
  const { leadId } = route.params;
  const { user, isAdmin, isSuperAdmin, refreshAssignedStats } = useAuth();
  const { theme } = useTheme();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs: 'overview' | 'timeline' | 'remarks' | 'tasks' | 'summary'
  const [activeTab, setActiveTab] = useState('overview');

  // Quick Activity Log
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('call');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Stage / Lost modals
  const [showStageModal, setShowStageModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [selectedLostReason, setSelectedLostReason] = useState(LOST_REASONS[0]);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Site Visit Schedule Modal
  const [showSiteVisitModal, setShowSiteVisitModal] = useState(false);
  const [visitDateOption, setVisitDateOption] = useState('Tomorrow');
  const [visitTimeOption, setVisitTimeOption] = useState('11:00 AM');
  const [visitManualDate, setVisitManualDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [visitManualTime, setVisitManualTime] = useState('11:00 AM');
  const [visitNotes, setVisitNotes] = useState('');
  const [schedulingSiteVisit, setSchedulingSiteVisit] = useState(false);

  // Site Visit Done Modal (Request 2)
  const [showSiteVisitDoneModal, setShowSiteVisitDoneModal] = useState(false);
  const [doneVisitDate, setDoneVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [doneVisitTime, setDoneVisitTime] = useState(() => {
    const d = new Date();
    let hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
  });
  const [doneVisitFeedback, setDoneVisitFeedback] = useState('');
  const [savingVisitDone, setSavingVisitDone] = useState(false);

  // Reassign modal
  const [showReassignModal, setShowReassignModal] = useState(false);

  // Enhanced Follow-up Reminder & Snooze state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderPreset, setReminderPreset] = useState('5m');
  const [reminderManualDate, setReminderManualDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [reminderManualTime, setReminderManualTime] = useState('11:00 AM');
  const [repeatSnooze5Min, setRepeatSnooze5Min] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [reminderLabel, setReminderLabel] = useState('Follow-up Reminder');
  const [snoozeActive, setSnoozeActive] = useState(false);
  const [snoozeCountdown, setSnoozeCountdown] = useState(0);
  const snoozeTimerRef = useRef(null);

  const loadLead = useCallback(async () => {
    try {
      const res = await leadsAPI.get(leadId);
      const d = res?.data || res || {};
      setLead(d);
    } catch (err) {
      console.error('[LeadDetailScreen] load error:', err.message);
      Alert.alert('Error', 'Could not load lead details.');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [leadId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadLead();
    }, [loadLead])
  );

  // Auto-refresh instantly on any mutation broadcast
  useAutoRefresh(loadLead);

  // Cleanup snooze timer on unmount
  useEffect(() => {
    return () => { if (snoozeTimerRef.current) clearInterval(snoozeTimerRef.current); };
  }, []);

  const onRefresh = () => { setRefreshing(true); loadLead(); };

  // ── Auto-register Direct Call ───────────────────────────────────────────
  const handleDirectCall = async (phoneDigits) => {
    if (!phoneDigits) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    // Auto-register call in activities timeline with date/time
    leadsAPI.addActivity(leadId, {
      type: 'call',
      content: `Outbound call made to ${lead?.name || 'client'} on ${dateStr} at ${timeStr}`,
    }).then(() => loadLead()).catch(() => {});

    Linking.openURL(`tel:+91${phoneDigits}`);
  };

  // ── Auto-register Direct WhatsApp ───────────────────────────────────────
  const handleDirectWhatsApp = async () => {
    if (!lead?.phone) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    // Auto-register WhatsApp in activities timeline with date/time
    leadsAPI.addActivity(leadId, {
      type: 'whatsapp',
      content: `WhatsApp message initiated to ${lead?.name || 'client'} on ${dateStr} at ${timeStr}`,
    }).then(() => loadLead()).catch(() => {});

    const url = getWhatsAppUrl(lead.phone, lead.name, lead.project?.name || lead.project_name);
    if (url) Linking.openURL(url);
  };

  // ── Enhanced Snooze & Follow-up Reminder ─────────────────────────────────
  const activateTimer = (targetSecs, repeatEnabled, label) => {
    if (snoozeTimerRef.current) clearInterval(snoozeTimerRef.current);

    setSnoozeActive(true);
    setSnoozeCountdown(targetSecs);
    setIsRepeating(repeatEnabled);
    setReminderLabel(label || 'Follow-up Reminder');
    setShowReminderModal(false);

    snoozeTimerRef.current = setInterval(() => {
      setSnoozeCountdown(prev => {
        if (prev <= 1) {
          if (repeatEnabled) {
            // Re-arm 5 minute snooze loop
            Alert.alert(
              '⏰ Follow-Up Reminder',
              `Reminder for ${lead?.name || 'prospect'}!\n(5-Minute continuous snooze is active)`,
              [
                { text: 'Call Now', onPress: () => { handleDirectCall(lead?.phone?.replace(/\D/g, '').slice(-10)); } },
                { text: 'WhatsApp', onPress: handleDirectWhatsApp },
                { text: 'Keep Snoozing', style: 'cancel' },
              ]
            );
            return 5 * 60; // reset to 5 mins
          } else {
            clearInterval(snoozeTimerRef.current);
            setSnoozeActive(false);
            Alert.alert(
              '⏰ Follow-Up Reminder Due',
              `Time to contact ${lead?.name || 'client'}!`,
              [
                { text: 'Call Now', onPress: () => { handleDirectCall(lead?.phone?.replace(/\D/g, '').slice(-10)); } },
                { text: 'WhatsApp', onPress: handleDirectWhatsApp },
                { text: 'Dismiss', style: 'cancel' },
              ]
            );
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSetReminderSubmit = () => {
    let secs = 5 * 60;
    let label = '5 Min Reminder';

    if (reminderPreset === 'custom') {
      const target = parseCustomDateTime(reminderManualDate, reminderManualTime);
      secs = Math.max(Math.round((target.getTime() - Date.now()) / 1000), 60);
      label = `${reminderManualDate} at ${reminderManualTime}`;
    } else if (reminderPreset === '15m') {
      secs = 15 * 60;
      label = '15 Min Reminder';
    } else if (reminderPreset === '1h') {
      secs = 60 * 60;
      label = '1 Hour Reminder';
    } else if (reminderPreset === 'today_eve') {
      const now = new Date();
      const eve = new Date();
      eve.setHours(18, 0, 0, 0);
      secs = Math.max(Math.round((eve.getTime() - now.getTime()) / 1000), 5 * 60);
      label = 'Today 6:00 PM';
    } else if (reminderPreset === 'tomorrow_morn') {
      const now = new Date();
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      tmrw.setHours(10, 0, 0, 0);
      secs = Math.max(Math.round((tmrw.getTime() - now.getTime()) / 1000), 10 * 60);
      label = 'Tomorrow 10:00 AM';
    } else if (reminderPreset === 'tomorrow_eve') {
      const now = new Date();
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      tmrw.setHours(18, 0, 0, 0);
      secs = Math.max(Math.round((tmrw.getTime() - now.getTime()) / 1000), 10 * 60);
      label = 'Tomorrow 6:00 PM';
    }

    // Double confirmation if 5-minute repeating snooze is toggled on (Request 6)
    if (repeatSnooze5Min) {
      Alert.alert(
        'Confirm 5-Min Repeat Snooze',
        `Repeat snooze every 5 minutes is enabled for ${lead?.name || 'this lead'}. You will receive continuous alerts every 5 minutes until completed. Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Continue',
            onPress: () => {
              // 2nd Confirmation
              Alert.alert(
                'Final Confirmation',
                'Please re-confirm: Continuous recurring alerts will sound every 5 minutes for this client. Activate now?',
                [
                  {
                    text: 'Disable Repeat',
                    onPress: () => activateTimer(secs, false, label),
                  },
                  {
                    text: 'Confirm & Activate',
                    onPress: () => activateTimer(secs, true, `${label} (Repeat 5m)`),
                  },
                ]
              );
            },
          },
        ]
      );
    } else {
      activateTimer(secs, false, label);
    }
  };

  const cancelSnooze = () => {
    if (snoozeTimerRef.current) clearInterval(snoozeTimerRef.current);
    setSnoozeActive(false);
    setSnoozeCountdown(0);
    setIsRepeating(false);
  };

  const formatSnoozeTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    if (hours > 0) return `${hours}h ${m}m`;
    return `${m}:${s}`;
  };

  // ── Stage change with Site Visit Intercept (Request 11 & New Request) ───
  const handleStageSelect = async (newStage) => {
    if (newStage === 'Lost / Dropped') {
      setShowStageModal(false);
      setShowLostModal(true);
      return;
    }

    if (newStage === 'Site Visit Scheduled') {
      setShowStageModal(false);
      setShowSiteVisitModal(true);
      return;
    }

    if (newStage === 'Site Visit Done') {
      setShowStageModal(false);
      setShowSiteVisitDoneModal(true);
      return;
    }

    setUpdatingStage(true);
    try {
      await leadsAPI.update(leadId, { stage: newStage });
      setShowStageModal(false);
      loadLead();
    } catch {
      Alert.alert('Error', 'Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  // ── Schedule Site Visit (Request 11 & Manual Date/Time) ─────────────────
  const handleSiteVisitSubmit = async () => {
    setSchedulingSiteVisit(true);
    try {
      const finalDate = visitManualDate || visitDateOption;
      const finalTime = visitManualTime || visitTimeOption;
      const projName = lead?.project?.name || lead?.project_name || 'Project Site';
      const visitSummary = `Site Visit Scheduled for ${finalDate} at ${finalTime} at ${projName}.${visitNotes ? ` Notes: ${visitNotes}` : ''}`;

      // Update lead stage
      await leadsAPI.update(leadId, { stage: 'Site Visit Scheduled' });

      // Add activity log with date and time
      await leadsAPI.addActivity(leadId, {
        type: 'site_visit_scheduled',
        content: visitSummary,
      });

      // Create linked task
      await tasksAPI.create({
        title: `Site Visit: ${lead?.name || 'Client'} (${projName})`,
        type: 'site_visit',
        description: visitSummary,
        due_date: parseCustomDateTime(finalDate, finalTime).toISOString(),
        lead_id: leadId,
      }).catch(() => {});

      setShowSiteVisitModal(false);
      setVisitNotes('');
      loadLead();

      Alert.alert(
        'Site Visit Scheduled!',
        `Site visit has been registered for ${finalDate} at ${finalTime}.\n\nMobile notification alerts and pipeline schedule set.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to schedule site visit.');
    } finally {
      setSchedulingSiteVisit(false);
    }
  };

  // ── Record Site Visit Done (New Request: Record in Summary & Pipeline) ──
  const handleSiteVisitDoneSubmit = async () => {
    setSavingVisitDone(true);
    try {
      const projName = lead?.project?.name || lead?.project_name || 'Project Site';
      const visitDoneSummary = `Site Visit Conducted on ${doneVisitDate} at ${doneVisitTime} at ${projName}.${doneVisitFeedback ? ` Client Feedback: ${doneVisitFeedback}` : ' Tour successfully completed.'}`;

      // Update lead stage in pipeline
      await leadsAPI.update(leadId, { stage: 'Site Visit Done' });

      // Add activity log with date and time
      await leadsAPI.addActivity(leadId, {
        type: 'site_visit_done',
        content: visitDoneSummary,
      });

      setShowSiteVisitDoneModal(false);
      setDoneVisitFeedback('');
      loadLead();

      Alert.alert(
        'Site Visit Recorded!',
        `Site visit marked as completed on ${doneVisitDate} at ${doneVisitTime}.\n\nAutomatically recorded in Client Summary and Pipeline.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record completed site visit.');
    } finally {
      setSavingVisitDone(false);
    }
  };

  const handleConfirmLost = async () => {
    setUpdatingStage(true);
    try {
      await leadsAPI.update(leadId, { stage: 'Lost / Dropped', lost_reason: selectedLostReason });
      setShowLostModal(false);
      loadLead();
    } catch {
      Alert.alert('Error', 'Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  // ── Log activity with automatic Date & Time stamp (Request 7) ────────────
  const handleLogActivity = async () => {
    if (!noteContent.trim()) {
      Alert.alert('Empty', 'Please write a brief interaction summary or instruction.');
      return;
    }
    setSubmittingNote(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const author = user?.name || user?.email?.split('@')[0] || 'Sales Advisor';

      // Automatically set date, time, and author on instruction/remark
      const enrichedContent = `${noteContent.trim()}\n\n[Instruction logged on ${dateStr} at ${timeStr} by ${author}]`;

      await leadsAPI.addActivity(leadId, { type: noteType, content: enrichedContent });
      setNoteContent('');
      loadLead();
    } catch {
      Alert.alert('Error', 'Failed to log activity.');
    } finally {
      setSubmittingNote(false);
    }
  };

  // ── Reassign ─────────────────────────────────────────────────────────────
  const handleReassignUser = async (targetUser) => {
    await leadsAPI.reassign(leadId, targetUser.id);
    Alert.alert('Success', `Lead transferred to ${targetUser.name || 'team member'}`);
    refreshAssignedStats?.();
    loadLead();
  };

  // ── Delete lead ──────────────────────────────────────────────────────────
  const handleDeleteLead = () => {
    Alert.alert(
      'Delete Lead',
      `Permanently delete "${lead?.name || 'this lead'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await leadsAPI.delete(leadId);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete lead.');
            }
          },
        },
      ]
    );
  };

  // ── Toggle task ──────────────────────────────────────────────────────────
  const handleToggleTask = async (task) => {
    try {
      const isDone = task.completed !== undefined ? task.completed : task.status === 'completed';
      const nextDone = !isDone;
      await tasksAPI.update(task.id, { 
        status: nextDone ? 'completed' : 'pending',
        completed: nextDone,
      });
      loadLead();
    } catch {
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    const ls = makeStyles(theme);
    return (
      <View style={[ls.container, { alignItems: 'center', justifyContent: 'flex-start' }]}>
        <AppHeader showBack onBack={() => navigation.goBack()} title="Lead Details" />
        <View style={ls.loaderCenter}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={ls.loaderText}>Loading Lead...</Text>
        </View>
      </View>
    );
  }

  if (!lead) return null;

  const styles = makeStyles(theme);
  const stageCfg = STAGE_CONFIG[lead.stage] || { color: '#64748B', short: lead.stage || 'New' };
  const priorityCfg = PRIORITY_CONFIG[lead.priority] || { label: lead.priority || 'Normal', color: '#64748B' };
  const projectName = lead.project?.name || lead.project_name;
  const budgetVal = lead.budget_max || lead.budget_min || lead.budget;
  const phoneDigits = lead.phone ? String(lead.phone).replace(/\D/g, '').slice(-10) : '';

  const activities = lead.activities || [];
  const tasks = lead.tasks || [];

  // Derived stats
  const callCount = getCallCount(activities);
  const remarkCount = getRemarkCount(activities);
  const waCount = getWACount(activities);
  const siteVisitCount = activities.filter(a => a.type === 'site_visit' || a.type === 'site_visit_scheduled' || a.type === 'site_visit_done').length;

  // Remarks-only activities
  const remarkActivities = activities.filter(a => a.type === 'note' || a.type === 'remark');
  // Call activities
  const callActivities = activities.filter(a => a.type === 'call');

  // Tab list
  const TABS = [
    { id: 'overview', label: 'Details', icon: 'list-outline' },
    { id: 'timeline', label: `Timeline (${activities.length})`, icon: 'time-outline' },
    { id: 'remarks', label: `Remarks (${remarkCount})`, icon: 'chatbubble-ellipses-outline' },
    { id: 'tasks', label: `Tasks (${tasks.length})`, icon: 'checkmark-circle-outline' },
    { id: 'summary', label: 'Summary', icon: 'bar-chart-outline' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <AppHeader
        showBack
        onBack={() => navigation.goBack()}
        title={lead.name || 'Lead Details'}
        subtitle={projectName || 'G.H.A.R Portfolio'}
        rightAction={
          (isAdmin || isSuperAdmin) ? (
            <TouchableOpacity onPress={handleDeleteLead} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={19} color={theme.error} />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Hero Card ──────────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={[styles.avatarBig, { borderColor: `${stageCfg.color}80`, backgroundColor: `${stageCfg.color}15` }]}>
              <Text style={[styles.avatarBigText, { color: stageCfg.color }]}>{getInitials(lead.name)}</Text>
            </View>

            <View style={styles.heroMeta}>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroName} numberOfLines={1}>{lead.name || 'Anonymous'}</Text>
                {lead.priority && (
                  <View style={[styles.priorityPill, { borderColor: `${priorityCfg.color}50` }]}>
                    {lead.priority === 'hot' && <Ionicons name="flame" size={11} color={priorityCfg.color} style={{ marginRight: 2 }} />}
                    {lead.priority === 'warm' && <Ionicons name="sunny-outline" size={11} color={priorityCfg.color} style={{ marginRight: 2 }} />}
                    {lead.priority === 'cold' && <Ionicons name="snow-outline" size={11} color={priorityCfg.color} style={{ marginRight: 2 }} />}
                    <Text style={[styles.priorityPillText, { color: priorityCfg.color }]}>{priorityCfg.label}</Text>
                  </View>
                )}
              </View>

              <View style={styles.heroContactRow}>
                <Ionicons name="call-outline" size={12} color={theme.textMuted} />
                <Text style={styles.heroPhone}>{formatPhone(lead.phone)}</Text>
              </View>
              {lead.email ? (
                <View style={styles.heroContactRow}>
                  <Ionicons name="mail-outline" size={12} color={theme.textMuted} />
                  <Text style={styles.heroEmail}>{lead.email}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Tags row */}
          <View style={styles.heroTagsRow}>
            {projectName ? (
              <View style={styles.heroTag}>
                <Ionicons name="business-outline" size={12} color={theme.primary} />
                <Text style={styles.heroTagText}>{projectName}</Text>
              </View>
            ) : null}

            {budgetVal ? (
              <View style={[styles.heroTag, styles.heroTagGold]}>
                <Ionicons name="cash-outline" size={12} color={theme.primary} />
                <Text style={styles.heroTagGoldText}>{formatCurrency(budgetVal)}</Text>
              </View>
            ) : null}

            {lead.configuration ? (
              <View style={styles.heroTag}>
                <Ionicons name="grid-outline" size={12} color={theme.textSecondary} />
                <Text style={styles.heroTagText}>{lead.configuration}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.stageBadgeBtn, { backgroundColor: `${stageCfg.color}18`, borderColor: `${stageCfg.color}50` }]}
              onPress={() => setShowStageModal(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.stageDot, { backgroundColor: stageCfg.color }]} />
              <Text style={[styles.stageBadgeBtnText, { color: stageCfg.color }]}>{stageCfg.short}</Text>
              <Ionicons name="chevron-down" size={12} color={stageCfg.color} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          {/* Assigned Rep row */}
          <View style={styles.assigneeRow}>
            <View style={styles.assigneeLeft}>
              <Ionicons name="person-outline" size={13} color={theme.textSecondary} />
              <Text style={styles.assigneeLabel}>Assigned to:</Text>
              <Text style={styles.assigneeName}>{lead.assignee?.name || 'Unassigned'}</Text>
            </View>
            <TouchableOpacity
              style={styles.reassignBtn}
              onPress={() => setShowReassignModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-horizontal" size={12} color={theme.primary} />
              <Text style={styles.reassignBtnText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 1-Tap Fast Contact Actions (Auto-registers in Timeline & Remarks) ── */}
        <View style={styles.quickActionsStrip}>
          {phoneDigits ? (
            <TouchableOpacity
              style={[styles.contactActionBtn, { backgroundColor: `${theme.info}15`, borderColor: `${theme.info}30` }]}
              onPress={() => handleDirectCall(phoneDigits)}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={18} color={theme.info} />
              <Text style={[styles.contactActionText, { color: theme.info }]}>Call Now</Text>
              {callCount > 0 && (
                <View style={[styles.callCountBadge, { backgroundColor: theme.info }]}>
                  <Text style={styles.callCountText}>{callCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : null}

          {phoneDigits ? (
            <TouchableOpacity
              style={[styles.contactActionBtn, { backgroundColor: `${theme.whatsapp}15`, borderColor: `${theme.whatsapp}30` }]}
              onPress={handleDirectWhatsApp}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={18} color={theme.whatsapp} />
              <Text style={[styles.contactActionText, { color: theme.whatsapp }]}>WhatsApp</Text>
              {waCount > 0 && (
                <View style={[styles.callCountBadge, { backgroundColor: theme.whatsapp }]}>
                  <Text style={styles.callCountText}>{waCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : null}

          {lead.email ? (
            <TouchableOpacity
              style={[styles.contactActionBtn, { backgroundColor: `${theme.accent}15`, borderColor: `${theme.accent}30` }]}
              onPress={() => Linking.openURL(`mailto:${lead.email}`)}
              activeOpacity={0.8}
            >
              <Ionicons name="mail" size={18} color={theme.accent} />
              <Text style={[styles.contactActionText, { color: theme.accent }]}>Email</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.contactActionBtn, { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}30` }]}
            onPress={() => setShowStageModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="repeat" size={18} color={theme.primary} />
            <Text style={[styles.contactActionText, { color: theme.primary }]}>Stage</Text>
          </TouchableOpacity>
        </View>

        {/* ── Follow-up Reminder & Snooze Banner ──────────────────────────── */}
        <View style={[styles.snoozeCard, snoozeActive && { borderColor: `${theme.warning}50`, backgroundColor: `${theme.warning}10` }]}>
          <View style={styles.snoozeLeft}>
            <Ionicons name="alarm-outline" size={20} color={snoozeActive ? theme.warning : theme.textMuted} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.snoozeTitle}>
                  {snoozeActive ? reminderLabel : 'Follow-up Reminder & Snooze'}
                </Text>
                {isRepeating && (
                  <View style={{ backgroundColor: `${theme.warning}25`, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: theme.warning }}>REPEAT 5M</Text>
                  </View>
                )}
              </View>
              <Text style={styles.snoozeSub}>
                {snoozeActive
                  ? `Alert in ${formatSnoozeTime(snoozeCountdown)} (tap dismiss or complete)`
                  : 'Set custom date/time or continuous 5-min repeat reminder'}
              </Text>
            </View>
          </View>
          {snoozeActive ? (
            <TouchableOpacity style={[styles.snoozeBtn, { backgroundColor: `${theme.error}15`, borderColor: `${theme.error}40` }]} onPress={cancelSnooze}>
              <Ionicons name="close-circle-outline" size={15} color={theme.error} />
              <Text style={[styles.snoozeBtnText, { color: theme.error }]}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.snoozeBtn, { backgroundColor: `${theme.warning}15`, borderColor: `${theme.warning}40` }]} onPress={() => setShowReminderModal(true)}>
              <Ionicons name="timer-outline" size={15} color={theme.warning} />
              <Text style={[styles.snoozeBtnText, { color: theme.warning }]}>Set Reminder</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Quick Log Interaction Box ────────────────────────────────────── */}
        <View style={styles.quickLogCard}>
          <Text style={styles.quickLogTitle}>Log Interaction</Text>

          {/* Type Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.logTypeScroll}>
            <View style={styles.logTypeRow}>
              {[
                { id: 'call', label: 'Call', icon: 'call-outline' },
                { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
                { id: 'site_visit', label: 'Site Visit', icon: 'business-outline' },
                { id: 'note', label: 'Remark', icon: 'chatbubble-ellipses-outline' },
              ].map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.logTypeChip, noteType === type.id && styles.logTypeChipActive]}
                  onPress={() => setNoteType(type.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={type.icon}
                    size={12}
                    color={noteType === type.id ? theme.primary : theme.textSecondary}
                  />
                  <Text style={[styles.logTypeChipText, noteType === type.id && styles.logTypeChipTextActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TextInput
            style={styles.logInput}
            placeholder={
              noteType === 'call' ? 'Called customer. Discussed requirements...' :
              noteType === 'whatsapp' ? 'Sent brochure and floor plans on WhatsApp...' :
              noteType === 'site_visit' ? 'Customer attended site visit with family...' :
              'Add remark or note about this client...'
            }
            placeholderTextColor={theme.textMuted}
            value={noteContent}
            onChangeText={setNoteContent}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.logSubmitBtn, (!noteContent.trim() || submittingNote) && styles.logSubmitBtnDisabled]}
            onPress={handleLogActivity}
            disabled={!noteContent.trim() || submittingNote}
            activeOpacity={0.85}
          >
            {submittingNote ? (
              <ActivityIndicator color={theme.textInverse} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-sharp" size={16} color={theme.textInverse} />
                <Text style={styles.logSubmitBtnText}>Save Log</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Tab Navigator ────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsHeader}
        >
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={tab.icon}
                size={13}
                color={activeTab === tab.id ? theme.primary : theme.textSecondary}
              />
              <Text style={[styles.tabBtnText, activeTab === tab.id && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Tab 1: Details ───────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <View style={styles.tabContentCard}>
            <DetailRow label="Project Interest" value={projectName || 'Not specified'} icon="business-outline" theme={theme} />
            <DetailRow label="Budget Range" value={budgetVal ? formatCurrency(budgetVal) : 'Not specified'} isGold icon="cash-outline" theme={theme} />
            <DetailRow label="Preferred Config" value={lead.configuration || 'Not specified'} icon="grid-outline" theme={theme} />
            <DetailRow label="Purchase Purpose" value={lead.purpose ? lead.purpose.replace('_', ' ') : 'Not specified'} icon="home-outline" theme={theme} />
            <DetailRow label="Lead Source" value={lead.source || 'Direct'} icon="share-social-outline" theme={theme} />
            <DetailRow label="Registered On" value={formatDateTime(lead.created_at)} icon="calendar-outline" theme={theme} />
            <DetailRow label="Last Contacted" value={lead.last_contacted_at ? formatRelative(lead.last_contacted_at) : 'Never'} icon="time-outline" theme={theme} />
            {lead.lost_reason && (
              <DetailRow label="Lost Reason" value={lead.lost_reason} isError icon="close-circle-outline" theme={theme} noBorder />
            )}
          </View>
        )}

        {/* ── Tab 2: Timeline ─────────────────────────────────────────────── */}
        {activeTab === 'timeline' && (
          <View style={styles.tabContentCard}>
            {activities.length === 0 ? (
              <EmptyState icon="time-outline" text="No activities logged yet." sub="Use the log box above to record interactions." theme={theme} />
            ) : (
              activities.map((act, idx) => {
                const actCfg = ACTIVITY_TYPE_CONFIG[act.type] || { label: act.type || 'Activity', icon: 'information-circle-outline', color: theme.textSecondary };
                return (
                  <View key={act.id || idx} style={styles.timelineItem}>
                    <View style={[styles.timelineIconBox, { backgroundColor: `${actCfg.color}15`, borderColor: `${actCfg.color}40` }]}>
                      <Ionicons name={actCfg.icon} size={14} color={actCfg.color} />
                    </View>
                    <View style={styles.timelineBody}>
                      <View style={styles.timelineHeaderRow}>
                        <Text style={[styles.timelineTypeLabel, { color: actCfg.color }]}>{actCfg.label}</Text>
                        <Text style={styles.timelineTimeText}>{formatRelative(act.created_at)}</Text>
                      </View>
                      <Text style={styles.timelineContent}>{act.content}</Text>
                      {act.user?.name && <Text style={styles.timelineAuthor}>By {act.user.name}</Text>}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── Tab 3: Remarks ──────────────────────────────────────────────── */}
        {activeTab === 'remarks' && (
          <View style={styles.tabContentCard}>
            {/* Remark Stats Banner */}
            <View style={styles.remarkStatsBanner}>
              <View style={styles.remarkStatItem}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary} />
                <Text style={styles.remarkStatValue}>{remarkCount}</Text>
                <Text style={styles.remarkStatLabel}>Remarks</Text>
              </View>
              <View style={styles.remarkStatDivider} />
              <View style={styles.remarkStatItem}>
                <Ionicons name="call-outline" size={20} color={theme.info} />
                <Text style={[styles.remarkStatValue, { color: theme.info }]}>{callCount}</Text>
                <Text style={styles.remarkStatLabel}>Calls</Text>
              </View>
              <View style={styles.remarkStatDivider} />
              <View style={styles.remarkStatItem}>
                <Ionicons name="logo-whatsapp" size={20} color={theme.whatsapp} />
                <Text style={[styles.remarkStatValue, { color: theme.whatsapp }]}>{waCount}</Text>
                <Text style={styles.remarkStatLabel}>WhatsApp</Text>
              </View>
            </View>

            {remarkActivities.length === 0 ? (
              <EmptyState icon="chatbubble-outline" text="No remarks added yet." sub="Select 'Remark' type above and log one." theme={theme} />
            ) : (
              remarkActivities.map((act, idx) => (
                <View key={act.id || idx} style={styles.remarkItem}>
                  <View style={styles.remarkMeta}>
                    <View style={styles.remarkNumBadge}>
                      <Text style={styles.remarkNumText}>#{remarkActivities.length - idx}</Text>
                    </View>
                    <Text style={styles.remarkDate}>{formatDateTime(act.created_at)}</Text>
                    <Text style={styles.remarkRelative}>{formatRelative(act.created_at)}</Text>
                  </View>
                  <Text style={styles.remarkContent}>{act.content}</Text>
                  {act.user?.name && (
                    <View style={styles.remarkAuthorRow}>
                      <Ionicons name="person-circle-outline" size={13} color={theme.textMuted} />
                      <Text style={styles.remarkAuthor}>{act.user.name}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Tab 4: Tasks ────────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <View style={styles.tabContentCard}>
            <View style={styles.tasksHeaderRow}>
              <Text style={styles.tasksTitle}>Follow-up Tasks</Text>
              <TouchableOpacity
                style={styles.addTaskInlineBtn}
                onPress={() => navigation.navigate('TaskCreate', { leadId: lead.id, leadName: lead.name })}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={14} color={theme.primary} />
                <Text style={styles.addTaskInlineBtnText}>Add Task</Text>
              </TouchableOpacity>
            </View>

            {tasks.length === 0 ? (
              <EmptyState icon="checkbox-outline" text="No tasks scheduled." sub="Create a follow-up task to stay on track." theme={theme} />
            ) : (
              tasks.map(task => {
                const isDone = task.completed !== undefined ? task.completed : task.status === 'completed';
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.taskItem, isDone && styles.taskItemDone]}
                    onPress={() => handleToggleTask(task)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.taskCheckbox, isDone && { backgroundColor: theme.success, borderColor: theme.success }]}>
                      {isDone && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <View style={styles.taskMeta}>
                      <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>{task.title}</Text>
                      <View style={styles.taskSubRow}>
                        <Ionicons name="calendar-outline" size={11} color={theme.textMuted} />
                        <Text style={styles.taskDueDate}>Due: {task.due_date ? formatDateTime(task.due_date) : 'Today'}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ── Tab 5: Client Summary ────────────────────────────────────────── */}
        {activeTab === 'summary' && (
          <View style={styles.tabContentCard}>
            <Text style={styles.summaryTitle}>Client Interaction Summary</Text>

            {/* Interaction Stats Grid */}
            <View style={styles.summaryGrid}>
              <SummaryStat icon="call-outline" color={theme.info} label="Total Calls" value={callCount} theme={theme} />
              <SummaryStat icon="chatbubble-ellipses-outline" color={theme.primary} label="Remarks" value={remarkCount} theme={theme} />
              <SummaryStat icon="logo-whatsapp" color={theme.whatsapp} label="WhatsApp" value={waCount} theme={theme} />
              <SummaryStat icon="business-outline" color={theme.purple} label="Site Visits" value={siteVisitCount} theme={theme} />
              <SummaryStat icon="list-outline" color={theme.accent} label="Total Activities" value={activities.length} theme={theme} />
              <SummaryStat icon="checkmark-circle-outline" color={theme.success} label="Tasks Done" value={tasks.filter(t => t.completed || t.status === 'completed').length} theme={theme} />
            </View>

            {/* Client Profile Summary */}
            <Text style={styles.summarySubheading}>Client Profile</Text>
            <View style={styles.summaryDetailList}>
              <SummaryDetail label="Name" value={lead.name || '—'} icon="person-outline" theme={theme} />
              <SummaryDetail label="Phone" value={formatPhone(lead.phone)} icon="call-outline" theme={theme} />
              <SummaryDetail label="Email" value={lead.email || '—'} icon="mail-outline" theme={theme} />
              <SummaryDetail label="Project" value={projectName || '—'} icon="business-outline" theme={theme} />
              <SummaryDetail label="Budget" value={budgetVal ? formatCurrency(budgetVal) : '—'} icon="cash-outline" theme={theme} />
              <SummaryDetail label="Config" value={lead.configuration || '—'} icon="grid-outline" theme={theme} />
              <SummaryDetail label="Stage" value={stageCfg.short || '—'} icon="git-branch-outline" theme={theme} />
              <SummaryDetail label="Assigned To" value={lead.assignee?.name || 'Unassigned'} icon="person-add-outline" theme={theme} />
              <SummaryDetail label="Source" value={lead.source || 'Direct'} icon="share-social-outline" theme={theme} />
              <SummaryDetail label="Last Contact" value={lead.last_contacted_at ? formatRelative(lead.last_contacted_at) : 'Never'} icon="time-outline" theme={theme} />
            </View>

            {/* Recent call log preview */}
            {callActivities.length > 0 && (
              <>
                <Text style={styles.summarySubheading}>Recent Calls</Text>
                {callActivities.slice(0, 3).map((act, idx) => (
                  <View key={act.id || idx} style={styles.summaryCallRow}>
                    <View style={[styles.summaryCallNum, { backgroundColor: `${theme.info}15` }]}>
                      <Text style={[styles.summaryCallNumText, { color: theme.info }]}>#{callActivities.length - idx}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.summaryCallContent} numberOfLines={2}>{act.content}</Text>
                      <Text style={styles.summaryCallDate}>{formatRelative(act.created_at)}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Stage Modal ─────────────────────────────────────────────────────── */}
      <Modal visible={showStageModal} transparent animationType="slide" onRequestClose={() => setShowStageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.stageModalContent}>
            <View style={styles.stageModalHeader}>
              <Text style={styles.stageModalTitle}>Change Stage</Text>
              <TouchableOpacity onPress={() => setShowStageModal(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {PIPELINE_STAGES.map(stage => {
                const isCurrent = lead.stage === stage;
                const cfg = STAGE_CONFIG[stage] || { color: theme.primary };
                return (
                  <TouchableOpacity
                    key={stage}
                    style={[styles.stageOptionRow, isCurrent && styles.stageOptionRowActive]}
                    onPress={() => handleStageSelect(stage)}
                    disabled={updatingStage}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.stageDot, { backgroundColor: cfg.color }]} />
                    <Text style={[styles.stageOptionText, isCurrent && styles.stageOptionTextActive]}>{stage}</Text>
                    {isCurrent && <Ionicons name="checkmark-circle" size={18} color={theme.primary} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Lost Reason Modal ────────────────────────────────────────────────── */}
      <Modal visible={showLostModal} transparent animationType="fade" onRequestClose={() => setShowLostModal(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.lostModalContent}>
            <Text style={styles.lostModalTitle}>Reason for Lost Lead</Text>
            <Text style={styles.lostModalSub}>Why did this deal not move forward?</Text>
            <View style={styles.lostOptionsGrid}>
              {LOST_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.lostReasonChip, selectedLostReason === reason && styles.lostReasonChipActive]}
                  onPress={() => setSelectedLostReason(reason)}
                >
                  <Text style={[styles.lostReasonText, selectedLostReason === reason && styles.lostReasonTextActive]}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.lostActionsRow}>
              <TouchableOpacity style={styles.lostCancelBtn} onPress={() => setShowLostModal(false)}>
                <Text style={styles.lostCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.lostConfirmBtn} onPress={handleConfirmLost}>
                <Ionicons name="close-circle-outline" size={15} color="#fff" />
                <Text style={styles.lostConfirmBtnText}>Mark as Lost</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Enhanced Follow-up Reminder Modal (Request 6 & Manual Date/Time) ── */}
      <Modal visible={showReminderModal} transparent animationType="fade" onRequestClose={() => setShowReminderModal(false)}>
        <TouchableOpacity style={styles.modalOverlayCenter} activeOpacity={1} onPress={() => setShowReminderModal(false)}>
          <View style={styles.reminderModalContent}>
            <View style={styles.stageModalHeader}>
              <View>
                <Text style={styles.stageModalTitle}>Follow-up Reminder & Snooze</Text>
                <Text style={styles.reminderModalSub}>Set alert date and time for {lead?.name || 'this prospect'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReminderModal(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <Text style={styles.reminderSectionLabel}>WHEN DO YOU WANT TO BE ALERTED?</Text>
              <View style={styles.reminderGrid}>
                {[
                  { id: '5m', label: 'In 5 Min', icon: 'timer-outline' },
                  { id: '15m', label: 'In 15 Min', icon: 'timer-outline' },
                  { id: '1h', label: 'In 1 Hour', icon: 'time-outline' },
                  { id: 'today_eve', label: 'Today 6:00 PM', icon: 'partly-sunny-outline' },
                  { id: 'tomorrow_morn', label: 'Tomorrow 10 AM', icon: 'sunny-outline' },
                  { id: 'tomorrow_eve', label: 'Tomorrow 6 PM', icon: 'moon-outline' },
                  { id: 'custom', label: 'Custom Date & Time', icon: 'create-outline' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.reminderOptionChip, reminderPreset === opt.id && styles.reminderOptionChipActive]}
                    onPress={() => setReminderPreset(opt.id)}
                  >
                    <Ionicons name={opt.icon} size={14} color={reminderPreset === opt.id ? theme.warning : theme.textSecondary} />
                    <Text style={[styles.reminderOptionText, reminderPreset === opt.id && styles.reminderOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Manual Date & Time Entry Section */}
              <View style={styles.manualEntryContainer}>
                <Text style={styles.manualEntryLabel}>MANUAL DATE & TIME SPECIFICATION</Text>

                <View style={styles.manualInputRow}>
                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.manualInputSubLabel}>Date (YYYY-MM-DD)</Text>
                    <View style={styles.manualInputBox}>
                      <Ionicons name="calendar-outline" size={15} color={theme.textMuted} />
                      <TextInput
                        style={styles.manualTextInput}
                        value={reminderManualDate}
                        onChangeText={t => {
                          setReminderManualDate(t);
                          setReminderPreset('custom');
                        }}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.manualInputSubLabel}>Time (HH:MM AM/PM)</Text>
                    <View style={styles.manualInputBox}>
                      <Ionicons name="time-outline" size={15} color={theme.textMuted} />
                      <TextInput
                        style={styles.manualTextInput}
                        value={reminderManualTime}
                        onChangeText={t => {
                          setReminderManualTime(t);
                          setReminderPreset('custom');
                        }}
                        placeholder="11:00 AM"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                  </View>
                </View>

                {/* Quick Date Fill Shortcuts */}
                <View style={styles.manualQuickChipsRow}>
                  {[
                    { label: 'Today', date: new Date().toISOString().slice(0, 10) },
                    {
                      label: 'Tomorrow',
                      date: (() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        return d.toISOString().slice(0, 10);
                      })(),
                    },
                    {
                      label: 'In 2 Days',
                      date: (() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 2);
                        return d.toISOString().slice(0, 10);
                      })(),
                    },
                    {
                      label: 'Next Week',
                      date: (() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        return d.toISOString().slice(0, 10);
                      })(),
                    },
                  ].map(c => (
                    <TouchableOpacity
                      key={c.label}
                      style={[styles.manualQuickChip, reminderManualDate === c.date && styles.manualQuickChipActive]}
                      onPress={() => {
                        setReminderManualDate(c.date);
                        setReminderPreset('custom');
                      }}
                    >
                      <Text style={[styles.manualQuickChipText, reminderManualDate === c.date && styles.manualQuickChipTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Repeat Snooze Every 5 Min Toggle (Request 6) */}
              <TouchableOpacity
                style={[styles.repeatSnoozeToggle, repeatSnooze5Min && styles.repeatSnoozeToggleActive]}
                onPress={() => setRepeatSnooze5Min(!repeatSnooze5Min)}
                activeOpacity={0.8}
              >
                <View style={styles.repeatSnoozeLeft}>
                  <Ionicons
                    name={repeatSnooze5Min ? 'repeat' : 'repeat-outline'}
                    size={20}
                    color={repeatSnooze5Min ? theme.warning : theme.textSecondary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.repeatSnoozeTitle, repeatSnooze5Min && { color: theme.warning, fontWeight: '800' }]}>
                      Continuous 5-Min Repeat Snooze
                    </Text>
                    <Text style={styles.repeatSnoozeDesc}>
                      {repeatSnooze5Min ? 'Alert repeats every 5 minutes (requires 2x confirmation)' : 'Turn on to repeat reminder every 5 mins'}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={repeatSnooze5Min ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={repeatSnooze5Min ? theme.warning : theme.textMuted}
                />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.reminderActionsRow}>
              <TouchableOpacity style={styles.lostCancelBtn} onPress={() => setShowReminderModal(false)}>
                <Text style={styles.lostCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.lostConfirmBtn, { backgroundColor: theme.warning }]} onPress={handleSetReminderSubmit}>
                <Ionicons name="notifications-outline" size={16} color="#000" />
                <Text style={[styles.lostConfirmBtnText, { color: '#000', fontWeight: '800' }]}>Set Alert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Schedule Site Visit Modal (Request 11 & Manual Date/Time) ─────── */}
      <Modal visible={showSiteVisitModal} transparent animationType="slide" onRequestClose={() => setShowSiteVisitModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => !schedulingSiteVisit && setShowSiteVisitModal(false)}>
          <View style={styles.siteVisitModalContent}>
            <View style={styles.stageModalHeader}>
              <View>
                <Text style={styles.stageModalTitle}>Schedule Property Site Visit</Text>
                <Text style={styles.reminderModalSub}>Coordinate tour for {lead?.name || 'prospect'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSiteVisitModal(false)} disabled={schedulingSiteVisit}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Manual Date & Time Inputs for Site Visit */}
              <Text style={styles.reminderSectionLabel}>MANUAL VISIT DATE & TIME</Text>
              <View style={styles.manualInputRow}>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.manualInputSubLabel}>Visit Date (YYYY-MM-DD)</Text>
                  <View style={styles.manualInputBox}>
                    <Ionicons name="calendar" size={15} color={theme.purple} />
                    <TextInput
                      style={styles.manualTextInput}
                      value={visitManualDate}
                      onChangeText={setVisitManualDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.manualInputSubLabel}>Visit Time</Text>
                  <View style={styles.manualInputBox}>
                    <Ionicons name="time" size={15} color={theme.purple} />
                    <TextInput
                      style={styles.manualTextInput}
                      value={visitManualTime}
                      onChangeText={setVisitManualTime}
                      placeholder="11:00 AM"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Quick Date Presets */}
              <Text style={styles.reminderSectionLabel}>OR SELECT QUICK PRESET</Text>
              <View style={styles.reminderGrid}>
                {['Tomorrow', 'Today', 'This Saturday', 'This Sunday'].map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.reminderOptionChip, visitDateOption === d && styles.reminderOptionChipActive]}
                    onPress={() => {
                      setVisitDateOption(d);
                      if (d === 'Today') setVisitManualDate(new Date().toISOString().slice(0, 10));
                      else if (d === 'Tomorrow') {
                        const dt = new Date();
                        dt.setDate(dt.getDate() + 1);
                        setVisitManualDate(dt.toISOString().slice(0, 10));
                      }
                    }}
                  >
                    <Ionicons name="calendar-outline" size={14} color={visitDateOption === d ? theme.purple : theme.textSecondary} />
                    <Text style={[styles.reminderOptionText, visitDateOption === d && { color: theme.purple, fontWeight: '800' }]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quick Time Presets */}
              <View style={styles.reminderGrid}>
                {['10:30 AM', '12:00 PM', '02:30 PM', '04:30 PM', '06:00 PM'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.reminderOptionChip, visitTimeOption === t && styles.reminderOptionChipActive]}
                    onPress={() => {
                      setVisitTimeOption(t);
                      setVisitManualTime(t);
                    }}
                  >
                    <Ionicons name="time-outline" size={14} color={visitTimeOption === t ? theme.purple : theme.textSecondary} />
                    <Text style={[styles.reminderOptionText, visitTimeOption === t && { color: theme.purple, fontWeight: '800' }]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Project Site Details */}
              <Text style={styles.reminderSectionLabel}>LOCATION / DEVELOPMENT</Text>
              <View style={styles.siteVisitProjectBox}>
                <Ionicons name="business" size={18} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.siteVisitProjectName}>{lead?.project?.name || lead?.project_name || 'G.H.A.R Project Site'}</Text>
                  <Text style={styles.siteVisitProjectLocation}>{lead?.project?.location || 'Sales Experience Center'}</Text>
                </View>
              </View>

              {/* Accompanying Notes */}
              <Text style={styles.reminderSectionLabel}>VISIT INSTRUCTIONS & REMARKS</Text>
              <TextInput
                style={styles.siteVisitInput}
                placeholder="e.g. Client requested sample flat tour of 3 BHK, arrange cab pickup from gate..."
                placeholderTextColor={theme.textMuted}
                value={visitNotes}
                onChangeText={setVisitNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.reminderActionsRow}>
              <TouchableOpacity style={styles.lostCancelBtn} onPress={() => setShowSiteVisitModal(false)} disabled={schedulingSiteVisit}>
                <Text style={styles.lostCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lostConfirmBtn, { backgroundColor: theme.purple }]}
                onPress={handleSiteVisitSubmit}
                disabled={schedulingSiteVisit}
              >
                {schedulingSiteVisit ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-circle-outline" size={17} color="#fff" />
                    <Text style={[styles.lostConfirmBtnText, { color: '#fff', fontWeight: '800' }]}>Confirm & Schedule</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Record Site Visit Done Modal (New Request) ────────────────────── */}
      <Modal visible={showSiteVisitDoneModal} transparent animationType="slide" onRequestClose={() => setShowSiteVisitDoneModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => !savingVisitDone && setShowSiteVisitDoneModal(false)}>
          <View style={styles.siteVisitModalContent}>
            <View style={styles.stageModalHeader}>
              <View>
                <Text style={[styles.stageModalTitle, { color: theme.pink }]}>Record Site Visit Completed</Text>
                <Text style={styles.reminderModalSub}>Record visit date, time & outcome for {lead?.name || 'client'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSiteVisitDoneModal(false)} disabled={savingVisitDone}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Manual Date & Time of Completed Visit */}
              <Text style={styles.reminderSectionLabel}>DATE & TIME OF COMPLETED VISIT</Text>
              <View style={styles.manualInputRow}>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.manualInputSubLabel}>Conducted Date (YYYY-MM-DD)</Text>
                  <View style={styles.manualInputBox}>
                    <Ionicons name="calendar-outline" size={15} color={theme.pink} />
                    <TextInput
                      style={styles.manualTextInput}
                      value={doneVisitDate}
                      onChangeText={setDoneVisitDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.manualInputSubLabel}>Conducted Time</Text>
                  <View style={styles.manualInputBox}>
                    <Ionicons name="time-outline" size={15} color={theme.pink} />
                    <TextInput
                      style={styles.manualTextInput}
                      value={doneVisitTime}
                      onChangeText={setDoneVisitTime}
                      placeholder="04:30 PM"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Quick Fill Shortcuts for Done Date */}
              <View style={styles.manualQuickChipsRow}>
                {[
                  { label: 'Today', date: new Date().toISOString().slice(0, 10) },
                  {
                    label: 'Yesterday',
                    date: (() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      return d.toISOString().slice(0, 10);
                    })(),
                  },
                  {
                    label: '2 Days Ago',
                    date: (() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 2);
                      return d.toISOString().slice(0, 10);
                    })(),
                  },
                ].map(c => (
                  <TouchableOpacity
                    key={c.label}
                    style={[styles.manualQuickChip, doneVisitDate === c.date && { borderColor: theme.pink, backgroundColor: `${theme.pink}15` }]}
                    onPress={() => setDoneVisitDate(c.date)}
                  >
                    <Text style={[styles.manualQuickChipText, doneVisitDate === c.date && { color: theme.pink, fontWeight: '700' }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Feedback / Outcome */}
              <Text style={styles.reminderSectionLabel}>CLIENT FEEDBACK & NEXT ACTION</Text>
              <TextInput
                style={styles.siteVisitInput}
                placeholder="e.g. Client liked 3 BHK layout, discussed pricing with family, requested revised quotation and floor plan..."
                placeholderTextColor={theme.textMuted}
                value={doneVisitFeedback}
                onChangeText={setDoneVisitFeedback}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={[styles.siteVisitProjectBox, { borderColor: `${theme.pink}30`, backgroundColor: `${theme.pink}10` }]}>
                <Ionicons name="information-circle-outline" size={18} color={theme.pink} />
                <Text style={{ fontSize: 12, color: theme.textSecondary, flex: 1 }}>
                  Marking "Site Visit Done" updates pipeline stage, records the datetime in Client Summary, and increments visit counter.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.reminderActionsRow}>
              <TouchableOpacity style={styles.lostCancelBtn} onPress={() => setShowSiteVisitDoneModal(false)} disabled={savingVisitDone}>
                <Text style={styles.lostCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lostConfirmBtn, { backgroundColor: theme.pink }]}
                onPress={handleSiteVisitDoneSubmit}
                disabled={savingVisitDone}
              >
                {savingVisitDone ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color="#fff" />
                    <Text style={[styles.lostConfirmBtnText, { color: '#fff', fontWeight: '800' }]}>Save & Mark Done</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Reassign Modal ───────────────────────────────────────────────────── */}
      <ReassignModal
        visible={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        leadName={lead.name}
        currentAssigneeId={lead.assigned_to}
        onSelectUser={handleReassignUser}
      />
    </KeyboardAvoidingView>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
function DetailRow({ label, value, icon, isGold, isError, noBorder, theme }) {
  const color = isGold ? theme.primary : isError ? theme.error : theme.textPrimary;
  return (
    <View style={[{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 2,
      borderBottomWidth: noBorder ? 0 : 1,
      borderBottomColor: theme.borderLight,
    }]}>
      <Ionicons name={icon} size={14} color={theme.textMuted} style={{ marginRight: 10, width: 18 }} />
      <Text style={{ flex: 1, fontSize: 13, color: theme.textSecondary, fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color, maxWidth: 180, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function SummaryStat({ icon, color, label, value, theme }) {
  return (
    <View style={{
      width: '30%',
      backgroundColor: theme.surface2,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    }}>
      <View style={[{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.textPrimary }}>{value}</Text>
      <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600', textAlign: 'center', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function SummaryDetail({ label, value, icon, theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.borderLight }}>
      <Ionicons name={icon} size={14} color={theme.textMuted} style={{ marginRight: 10, width: 18 }} />
      <Text style={{ flex: 1, fontSize: 12.5, color: theme.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textPrimary, maxWidth: 170, textAlign: 'right' }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function EmptyState({ icon, text, sub, theme }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
      <Ionicons name={icon} size={36} color={theme.textMuted} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textSecondary }}>{text}</Text>
      {sub && <Text style={{ fontSize: 12, color: theme.textMuted, textAlign: 'center', paddingHorizontal: 20 }}>{sub}</Text>}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
function makeStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    loaderCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loaderText: { fontSize: 13, color: theme.textSecondary, fontWeight: '600' },
    deleteBtn: { padding: 6, borderRadius: 10, backgroundColor: `${theme.error}15` },
    scroll: { padding: 14 },

    // Hero Card
    heroCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: theme.isDark ? 0.3 : 0.07,
      shadowRadius: 8,
      elevation: 4,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatarBig: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarBigText: { fontSize: 17, fontWeight: '800' },
    heroMeta: { flex: 1 },
    heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    heroName: { fontSize: 17, fontWeight: '800', color: theme.textPrimary, maxWidth: 170 },
    priorityPill: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 7, paddingVertical: 2,
      borderRadius: 999, borderWidth: 1, backgroundColor: theme.surface2,
    },
    priorityPillText: { fontSize: 10, fontWeight: '700' },
    heroContactRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    heroPhone: { fontSize: 12.5, color: theme.textSecondary, fontWeight: '600' },
    heroEmail: { fontSize: 11.5, color: theme.textMuted },

    heroTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    heroTag: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: theme.surface2,
      paddingHorizontal: 9, paddingVertical: 4.5,
      borderRadius: 8, borderWidth: 1, borderColor: theme.border,
    },
    heroTagText: { fontSize: 11.5, fontWeight: '600', color: theme.textPrimary },
    heroTagGold: { backgroundColor: theme.primaryLight, borderColor: theme.borderAccent },
    heroTagGoldText: { fontSize: 11.5, fontWeight: '800', color: theme.primary },
    stageBadgeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4.5, borderRadius: 999, borderWidth: 1, gap: 4 },
    stageDot: { width: 6, height: 6, borderRadius: 3 },
    stageBadgeBtnText: { fontSize: 11.5, fontWeight: '700' },

    assigneeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    assigneeLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    assigneeLabel: { fontSize: 12, color: theme.textSecondary },
    assigneeName: { fontSize: 12, fontWeight: '700', color: theme.textPrimary },
    reassignBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 8, backgroundColor: theme.primaryLight,
      borderWidth: 1, borderColor: theme.borderAccent,
    },
    reassignBtnText: { fontSize: 11, fontWeight: '700', color: theme.primary },

    // Quick Actions Strip
    quickActionsStrip: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    contactActionBtn: {
      flex: 1, minWidth: 70,
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 10, borderRadius: 14,
      borderWidth: 1, gap: 4, position: 'relative',
    },
    contactActionText: { fontSize: 11, fontWeight: '700' },
    callCountBadge: {
      position: 'absolute', top: 4, right: 4,
      width: 18, height: 18, borderRadius: 9,
      alignItems: 'center', justifyContent: 'center',
    },
    callCountText: { fontSize: 9, fontWeight: '800', color: '#fff' },

    // Snooze Card
    snoozeCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.surface,
      borderRadius: 14, padding: 12,
      borderWidth: 1, borderColor: theme.border,
      marginBottom: 12,
    },
    snoozeLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    snoozeTitle: { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
    snoozeSub: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },
    snoozeBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 7,
      borderRadius: 10, borderWidth: 1,
    },
    snoozeBtnText: { fontSize: 11.5, fontWeight: '700' },

    // Quick Log
    quickLogCard: {
      backgroundColor: theme.surface,
      borderRadius: 16, padding: 14,
      borderWidth: 1, borderColor: theme.border,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.2 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    quickLogTitle: { fontSize: 14, fontWeight: '700', color: theme.textPrimary, marginBottom: 10 },
    logTypeScroll: { marginBottom: 10 },
    logTypeRow: { flexDirection: 'row', gap: 8 },
    logTypeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 999, borderWidth: 1,
      borderColor: theme.border, backgroundColor: theme.surface2,
    },
    logTypeChipActive: { borderColor: `${theme.primary}60`, backgroundColor: theme.primaryLight },
    logTypeChipText: { fontSize: 11.5, fontWeight: '600', color: theme.textSecondary },
    logTypeChipTextActive: { color: theme.primary, fontWeight: '700' },
    logInput: {
      backgroundColor: theme.surface2,
      borderRadius: 12, borderWidth: 1, borderColor: theme.border,
      padding: 12, fontSize: 13, color: theme.textPrimary,
      minHeight: 72, textAlignVertical: 'top', marginBottom: 10,
    },
    logSubmitBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 11,
    },
    logSubmitBtnDisabled: { opacity: 0.4 },
    logSubmitBtnText: { fontSize: 14, fontWeight: '700', color: theme.textInverse },

    // Tabs
    tabsScroll: { marginBottom: 8 },
    tabsHeader: { flexDirection: 'row', gap: 6, paddingRight: 14 },
    tabBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 10, borderWidth: 1,
      borderColor: theme.border, backgroundColor: theme.surface,
    },
    tabBtnActive: { borderColor: `${theme.primary}50`, backgroundColor: theme.primaryLight },
    tabBtnText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
    tabBtnTextActive: { color: theme.primary, fontWeight: '700' },

    // Tab Content Card
    tabContentCard: {
      backgroundColor: theme.surface,
      borderRadius: 16, padding: 14,
      borderWidth: 1, borderColor: theme.border,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.2 : 0.05,
      shadowRadius: 5,
      elevation: 2,
    },

    // Timeline
    timelineItem: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    timelineIconBox: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    timelineBody: { flex: 1 },
    timelineHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    timelineTypeLabel: { fontSize: 11.5, fontWeight: '700' },
    timelineTimeText: { fontSize: 11, color: theme.textMuted },
    timelineContent: { fontSize: 13, color: theme.textPrimary, lineHeight: 18 },
    timelineAuthor: { fontSize: 11, color: theme.textMuted, marginTop: 4 },

    // Remarks
    remarkStatsBanner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
      backgroundColor: theme.surface2, borderRadius: 12,
      paddingVertical: 14, marginBottom: 14, borderWidth: 1, borderColor: theme.border,
    },
    remarkStatItem: { alignItems: 'center', gap: 4 },
    remarkStatValue: { fontSize: 22, fontWeight: '800', color: theme.primary },
    remarkStatLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '600' },
    remarkStatDivider: { width: 1, height: 36, backgroundColor: theme.border },
    remarkItem: {
      backgroundColor: theme.surface2, borderRadius: 12, padding: 12,
      marginBottom: 10, borderWidth: 1, borderColor: theme.border,
    },
    remarkMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    remarkNumBadge: { backgroundColor: `${theme.primary}20`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    remarkNumText: { fontSize: 10, fontWeight: '800', color: theme.primary },
    remarkDate: { fontSize: 11, color: theme.textSecondary, fontWeight: '600' },
    remarkRelative: { fontSize: 10, color: theme.textMuted, marginLeft: 'auto' },
    remarkContent: { fontSize: 13, color: theme.textPrimary, lineHeight: 18 },
    remarkAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
    remarkAuthor: { fontSize: 11, color: theme.textMuted },

    // Tasks
    tasksHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    tasksTitle: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
    addTaskInlineBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 8, backgroundColor: theme.primaryLight,
      borderWidth: 1, borderColor: theme.borderAccent,
    },
    addTaskInlineBtnText: { fontSize: 12, fontWeight: '700', color: theme.primary },
    taskItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderLight,
    },
    taskItemDone: { opacity: 0.55 },
    taskCheckbox: {
      width: 24, height: 24, borderRadius: 12, borderWidth: 2,
      borderColor: theme.border, alignItems: 'center', justifyContent: 'center',
    },
    taskMeta: { flex: 1 },
    taskTitle: { fontSize: 13.5, fontWeight: '600', color: theme.textPrimary },
    taskTitleDone: { textDecorationLine: 'line-through', color: theme.textMuted },
    taskSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    taskDueDate: { fontSize: 11, color: theme.textMuted },

    // Summary
    summaryTitle: { fontSize: 15, fontWeight: '800', color: theme.textPrimary, marginBottom: 14 },
    summarySubheading: { fontSize: 12, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    summaryDetailList: {},
    summaryCallRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
    summaryCallNum: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    summaryCallNumText: { fontSize: 11, fontWeight: '800' },
    summaryCallContent: { fontSize: 12.5, color: theme.textPrimary, lineHeight: 17 },
    summaryCallDate: { fontSize: 11, color: theme.textMuted, marginTop: 2 },

    // Stage Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    stageModalContent: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20,
    },
    stageModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    stageModalTitle: { fontSize: 16, fontWeight: '800', color: theme.textPrimary },
    stageOptionRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 13, paddingHorizontal: 4,
      borderBottomWidth: 1, borderBottomColor: theme.borderLight,
    },
    stageOptionRowActive: { backgroundColor: theme.primaryLight, borderRadius: 10 },
    stageOptionText: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, flex: 1 },
    stageOptionTextActive: { color: theme.primary, fontWeight: '700' },

    // Lost Modal
    modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 },
    lostModalContent: { backgroundColor: theme.surface, borderRadius: 20, padding: 20 },
    lostModalTitle: { fontSize: 16, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
    lostModalSub: { fontSize: 13, color: theme.textSecondary, marginBottom: 16 },
    lostOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    lostReasonChip: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface2,
    },
    lostReasonChipActive: { borderColor: `${theme.error}50`, backgroundColor: `${theme.error}12` },
    lostReasonText: { fontSize: 12.5, fontWeight: '600', color: theme.textSecondary },
    lostReasonTextActive: { color: theme.error, fontWeight: '700' },
    lostActionsRow: { flexDirection: 'row', gap: 10 },
    lostCancelBtn: {
      flex: 1, paddingVertical: 12, borderRadius: 12,
      borderWidth: 1, borderColor: theme.border, alignItems: 'center',
    },
    lostCancelBtnText: { fontSize: 14, fontWeight: '700', color: theme.textSecondary },
    lostConfirmBtn: {
      flex: 2, paddingVertical: 12, borderRadius: 12,
      backgroundColor: theme.error, alignItems: 'center', justifyContent: 'center',
      flexDirection: 'row', gap: 6,
    },
    lostConfirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

    // Enhanced Reminder Modal Styles
    reminderModalContent: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    reminderModalSub: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    reminderSectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.textMuted,
      letterSpacing: 0.6,
      marginTop: 12,
      marginBottom: 8,
    },
    reminderGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    reminderOptionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface2,
    },
    reminderOptionChipActive: {
      borderColor: theme.warning,
      backgroundColor: `${theme.warning}15`,
    },
    reminderOptionText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    reminderOptionTextActive: {
      color: theme.warning,
      fontWeight: '800',
    },
    repeatSnoozeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface2,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginVertical: 8,
    },
    repeatSnoozeToggleActive: {
      borderColor: `${theme.warning}50`,
      backgroundColor: `${theme.warning}10`,
    },
    repeatSnoozeLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      marginRight: 8,
    },
    repeatSnoozeTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    repeatSnoozeDesc: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    reminderActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },

    // Site Visit Modal Styles
    siteVisitModalContent: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '82%',
    },
    siteVisitProjectBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.surface2,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
    },
    siteVisitProjectName: {
      fontSize: 13.5,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    siteVisitProjectLocation: {
      fontSize: 11.5,
      color: theme.textSecondary,
      marginTop: 1,
    },
    siteVisitInput: {
      backgroundColor: theme.surface2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 10,
      fontSize: 12.5,
      color: theme.textPrimary,
      minHeight: 70,
      marginBottom: 12,
    },
    manualEntryContainer: {
      backgroundColor: theme.surface2,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginVertical: 8,
    },
    manualEntryLabel: {
      fontSize: 10.5,
      fontWeight: '800',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    manualInputRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 8,
    },
    manualInputSubLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
      marginBottom: 4,
    },
    manualInputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 8,
      height: 38,
    },
    manualTextInput: {
      flex: 1,
      fontSize: 12.5,
      color: theme.textPrimary,
      padding: 0,
    },
    manualQuickChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    manualQuickChip: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    manualQuickChipActive: {
      borderColor: theme.warning,
      backgroundColor: `${theme.warning}15`,
    },
    manualQuickChipText: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    manualQuickChipTextActive: {
      color: theme.warning,
      fontWeight: '700',
    },
  });
}
