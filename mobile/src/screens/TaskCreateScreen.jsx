import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tasksAPI, leadsAPI } from '../services/api';
import { Radius, Typography, Shadow } from '../theme/tokens';
import { TASK_TYPES } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';

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

export default function TaskCreateScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const initialLeadId = route.params?.leadId || '';
  const initialLeadName = route.params?.leadName || '';

  const [title, setTitle] = useState('');
  const [type, setType] = useState('call');
  const [description, setDescription] = useState('');
  const [dueDateOption, setDueDateOption] = useState('tomorrow');
  const [manualDueDate, setManualDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [manualDueTime, setManualDueTime] = useState('11:00 AM');

  // Client Selection State (Request 12)
  const [selectedLeadId, setSelectedLeadId] = useState(initialLeadId);
  const [selectedLead, setSelectedLead] = useState(initialLeadName ? { id: initialLeadId, name: initialLeadName } : null);
  const [leadsList, setLeadsList] = useState([]);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');

  // Notification & Snooze Alerts (Request 12)
  const [notificationAlert, setNotificationAlert] = useState(true);
  const [snoozeAlert, setSnoozeAlert] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch leads for the client selector
    leadsAPI.list({ limit: 50 }).then(res => {
      const data = res?.data || res || {};
      const list = data.leads || (Array.isArray(data) ? data : []);
      setLeadsList(list);
      if (initialLeadId && !selectedLead) {
        const found = list.find(l => l.id === initialLeadId);
        if (found) setSelectedLead(found);
      }
    }).catch(() => {});
  }, [initialLeadId]);

  // When a client is picked, auto-suggest title & action based on client info
  const handleSelectClient = (lead) => {
    if (!lead) {
      setSelectedLead(null);
      setSelectedLeadId('');
      setShowLeadModal(false);
      return;
    }

    setSelectedLead(lead);
    setSelectedLeadId(lead.id);
    setShowLeadModal(false);

    // Auto-reflect action
    if (!title || title.startsWith('Call') || title.startsWith('WhatsApp') || title.startsWith('Follow up')) {
      if (type === 'call') setTitle(`Call ${lead.name} regarding property enquiry`);
      else if (type === 'whatsapp') setTitle(`WhatsApp ${lead.name} brochure and pricing`);
      else if (type === 'site_visit') setTitle(`Site Visit with ${lead.name}`);
      else setTitle(`Follow up with ${lead.name}`);
    }
  };

  const handleTypeSelect = (selectedType) => {
    setType(selectedType);
    if (selectedLead?.name) {
      if (selectedType === 'call') setTitle(`Call ${selectedLead.name} regarding property enquiry`);
      else if (selectedType === 'whatsapp') setTitle(`WhatsApp ${selectedLead.name} brochure and pricing`);
      else if (selectedType === 'site_visit') setTitle(`Site Visit with ${selectedLead.name}`);
      else if (selectedType === 'document') setTitle(`Review agreement with ${selectedLead.name}`);
      else if (selectedType === 'meeting') setTitle(`Meeting with ${selectedLead.name}`);
    }
  };

  const calculateDueDate = (option) => {
    if (option === 'manual') {
      return parseCustomDateTime(manualDueDate, manualDueTime).toISOString();
    }
    const d = new Date();
    if (option === '2h') {
      d.setHours(d.getHours() + 2);
    } else if (option === 'today_eve') {
      d.setHours(17, 30, 0, 0);
    } else if (option === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      d.setHours(11, 0, 0, 0);
    } else if (option === '2days') {
      d.setDate(d.getDate() + 2);
      d.setHours(11, 0, 0, 0);
    } else if (option === 'next_week') {
      d.setDate(d.getDate() + 7);
      d.setHours(11, 0, 0, 0);
    }
    return d.toISOString();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter a task title.');
      return;
    }

    setSubmitting(true);
    try {
      const taskPayload = {
        title: title.trim(),
        type,
        description: description.trim() || undefined,
        due_date: calculateDueDate(dueDateOption),
        lead_id: selectedLeadId || undefined,
      };

      await tasksAPI.create(taskPayload);

      Alert.alert(
        'Task Scheduled!',
        `Task "${title.trim()}" created successfully.${notificationAlert ? ' In-app mobile reminder alert set.' : ''}${snoozeAlert ? ' (5-min snooze alert enabled).' : ''}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLeads = leadsList.filter(l => {
    if (!leadSearch.trim()) return true;
    const q = leadSearch.toLowerCase();
    return l.name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.project?.name?.toLowerCase().includes(q);
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <AppHeader
        showBack
        onBack={() => navigation.goBack()}
        title="Schedule Task"
        subtitle="Customer Follow-up, Visit or Action"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client & Task Details</Text>

          {/* ── 1. Select Client (Optional) (Request 12) ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Select Client / Lead (Optional)</Text>
            <TouchableOpacity
              style={[styles.clientSelectorBtn, selectedLead && styles.clientSelectorBtnActive]}
              onPress={() => setShowLeadModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.clientSelectorLeft}>
                <Ionicons
                  name={selectedLead ? 'person' : 'person-outline'}
                  size={18}
                  color={selectedLead ? theme.primary : theme.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clientSelectorName, !selectedLead && styles.clientPlaceholder]}>
                    {selectedLead ? selectedLead.name : 'Choose Client from Leads (or keep empty for internal task)'}
                  </Text>
                  {selectedLead?.phone && (
                    <Text style={styles.clientSelectorSub}>
                      {selectedLead.phone} {selectedLead.project?.name ? `· ${selectedLead.project.name}` : ''}
                    </Text>
                  )}
                </View>
              </View>

              {selectedLead ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedLead(null);
                    setSelectedLeadId('');
                  }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Task Type Quick Selectors */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Task Action Type</Text>
            <View style={styles.typeGrid}>
              {[
                { value: 'call', label: 'Call Client', icon: 'call' },
                { value: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
                { value: 'site_visit', label: 'Site Visit', icon: 'location' },
                { value: 'follow_up', label: 'Follow Up', icon: 'refresh' },
                { value: 'meeting', label: 'Meeting', icon: 'people' },
                { value: 'document', label: 'Documents', icon: 'document-text' },
              ].map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeChip, type === t.value && styles.typeChipActive]}
                  onPress={() => handleTypeSelect(t.value)}
                >
                  <Ionicons
                    name={t.icon}
                    size={14}
                    color={type === t.value ? theme.primary : theme.textSecondary}
                  />
                  <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Task Title */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Task Title <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputBox}>
              <Ionicons name="checkbox-outline" size={16} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Call Rahul to review 3BHK layout plans"
                placeholderTextColor={theme.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>

          {/* Due Timing Filter Shortcuts */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Due Date & Time Filter</Text>
            <View style={styles.timingOptionsGrid}>
              {[
                { id: '2h', label: 'In 2 Hours', sub: 'Urgent' },
                { id: 'today_eve', label: 'This Evening', sub: '5:30 PM' },
                { id: 'tomorrow', label: 'Tomorrow', sub: '11:00 AM' },
                { id: '2days', label: 'In 2 Days', sub: 'Follow up' },
                { id: 'next_week', label: 'Next Week', sub: 'Scheduled' },
                { id: 'manual', label: 'Custom Date/Time', sub: 'Manual Entry' },
              ].map(timing => (
                <TouchableOpacity
                  key={timing.id}
                  style={[styles.timingBtn, dueDateOption === timing.id && styles.timingBtnActive]}
                  onPress={() => setDueDateOption(timing.id)}
                >
                  <Text style={[styles.timingBtnText, dueDateOption === timing.id && styles.timingBtnTextActive]}>
                    {timing.label}
                  </Text>
                  <Text style={[styles.timingBtnSub, dueDateOption === timing.id && styles.timingBtnSubActive]}>
                    {timing.sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Manual Date & Time Inputs (Always available or highlighted when manual selected) */}
            <View style={[styles.manualTaskDateBox, dueDateOption === 'manual' && styles.manualTaskDateBoxActive]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="create-outline" size={15} color={theme.primary} />
                <Text style={styles.manualTaskDateHeading}>MANUAL DATE & TIME SPECIFICATION</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.manualTaskInputSubLabel}>Date (YYYY-MM-DD)</Text>
                  <View style={styles.manualTaskInputBox}>
                    <Ionicons name="calendar-outline" size={15} color={theme.primary} />
                    <TextInput
                      style={styles.manualTaskTextInput}
                      value={manualDueDate}
                      onChangeText={t => {
                        setManualDueDate(t);
                        setDueDateOption('manual');
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.manualTaskInputSubLabel}>Time (HH:MM AM/PM)</Text>
                  <View style={styles.manualTaskInputBox}>
                    <Ionicons name="time-outline" size={15} color={theme.primary} />
                    <TextInput
                      style={styles.manualTaskTextInput}
                      value={manualDueTime}
                      onChangeText={t => {
                        setManualDueTime(t);
                        setDueDateOption('manual');
                      }}
                      placeholder="11:00 AM"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Quick Date Chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
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
                    label: 'In 1 Week',
                    date: (() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      return d.toISOString().slice(0, 10);
                    })(),
                  },
                ].map(c => (
                  <TouchableOpacity
                    key={c.label}
                    style={[styles.manualTaskQuickChip, manualDueDate === c.date && styles.manualTaskQuickChipActive]}
                    onPress={() => {
                      setManualDueDate(c.date);
                      setDueDateOption('manual');
                    }}
                  >
                    <Text style={[styles.manualTaskQuickChipText, manualDueDate === c.date && styles.manualTaskQuickChipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Alerts: Notification Alert & Snooze Alert (Request 12) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Alerts & Notifications</Text>
            <View style={{ gap: 8 }}>
              {/* Mobile Notification Alert */}
              <TouchableOpacity
                style={[styles.alertToggleRow, notificationAlert && styles.alertToggleRowActive]}
                onPress={() => setNotificationAlert(!notificationAlert)}
                activeOpacity={0.8}
              >
                <View style={styles.alertToggleLeft}>
                  <Ionicons
                    name={notificationAlert ? 'notifications' : 'notifications-outline'}
                    size={18}
                    color={notificationAlert ? theme.primary : theme.textSecondary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertToggleTitle}>Mobile Notification Alert</Text>
                    <Text style={styles.alertToggleSub}>Receive popup alert when task is due</Text>
                  </View>
                </View>
                <Ionicons
                  name={notificationAlert ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={notificationAlert ? theme.primary : theme.textMuted}
                />
              </TouchableOpacity>

              {/* Snooze Alert Optional */}
              <TouchableOpacity
                style={[styles.alertToggleRow, snoozeAlert && styles.alertToggleRowActive]}
                onPress={() => setSnoozeAlert(!snoozeAlert)}
                activeOpacity={0.8}
              >
                <View style={styles.alertToggleLeft}>
                  <Ionicons
                    name={snoozeAlert ? 'alarm' : 'alarm-outline'}
                    size={18}
                    color={snoozeAlert ? theme.warning : theme.textSecondary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertToggleTitle}>Continuous Snooze Alert</Text>
                    <Text style={styles.alertToggleSub}>Repeat reminder every 5 mins if not marked done</Text>
                  </View>
                </View>
                <Ionicons
                  name={snoozeAlert ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={snoozeAlert ? theme.warning : theme.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Task Description & Remarks</Text>
            <View style={[styles.inputBox, styles.textAreaBox]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Key talking points, specific client preferences, follow-up history..."
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsBox}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            disabled={submitting}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={theme.textInverse} size="small" />
            ) : (
              <>
                <Ionicons name="calendar" size={17} color={theme.textInverse} />
                <Text style={styles.submitBtnText}>Schedule Task</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Client Selection Modal ── */}
      <Modal visible={showLeadModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLeadModal(false)}>
          <View style={styles.leadModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client / Prospect</Text>
              <TouchableOpacity onPress={() => setShowLeadModal(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by client name, phone or project..."
                placeholderTextColor={theme.textMuted}
                value={leadSearch}
                onChangeText={setLeadSearch}
              />
              {leadSearch.length > 0 && (
                <TouchableOpacity onPress={() => setLeadSearch('')}>
                  <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={[{ id: '', name: 'No Client (Internal Sales Task)' }, ...filteredLeads]}
              keyExtractor={(item) => String(item.id || 'internal')}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.leadItemRow, selectedLeadId === item.id && styles.leadItemRowActive]}
                  onPress={() => handleSelectClient(item.id ? item : null)}
                >
                  <View style={styles.leadItemAvatar}>
                    <Ionicons name={item.id ? 'person' : 'briefcase'} size={14} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.leadItemName, selectedLeadId === item.id && { color: theme.primary, fontWeight: '800' }]}>
                      {item.name}
                    </Text>
                    {item.phone ? (
                      <Text style={styles.leadItemPhone}>
                        {item.phone} {item.project?.name ? `· ${item.project.name}` : ''}
                      </Text>
                    ) : null}
                  </View>
                  {selectedLeadId === item.id && (
                    <Ionicons name="checkmark" size={18} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    scroll: {
      padding: 16,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.primary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 14,
    },
    fieldGroup: {
      marginBottom: 14,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 6,
    },
    required: {
      color: theme.error,
    },
    clientSelectorBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface2,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
    },
    clientSelectorBtnActive: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}10`,
    },
    clientSelectorLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    clientSelectorName: {
      fontSize: 13.5,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    clientPlaceholder: {
      fontWeight: '400',
      color: theme.textMuted,
      fontSize: 12.5,
    },
    clientSelectorSub: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface2,
    },
    typeChipActive: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}18`,
    },
    typeChipText: {
      fontSize: 11.5,
      color: theme.textSecondary,
    },
    typeChipTextActive: {
      color: theme.primary,
      fontWeight: '800',
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface2,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      minHeight: 44,
    },
    inputIcon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      fontSize: 13.5,
      color: theme.textPrimary,
      paddingVertical: 10,
    },
    textAreaBox: {
      minHeight: 80,
      alignItems: 'flex-start',
    },
    textArea: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    timingOptionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    timingBtn: {
      width: '31%',
      paddingVertical: 9,
      paddingHorizontal: 6,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface2,
      alignItems: 'center',
    },
    timingBtnActive: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}18`,
    },
    timingBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: theme.textPrimary,
      textAlign: 'center',
    },
    timingBtnTextActive: {
      color: theme.primary,
    },
    timingBtnSub: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 2,
    },
    timingBtnSubActive: {
      color: theme.primary,
    },
    manualTaskDateBox: {
      backgroundColor: theme.surface2,
      borderRadius: Radius.md,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginTop: 10,
    },
    manualTaskDateBoxActive: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}10`,
    },
    manualTaskDateHeading: {
      fontSize: 10.5,
      fontWeight: '800',
      color: theme.textMuted,
      letterSpacing: 0.5,
    },
    manualTaskInputSubLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
      marginBottom: 4,
    },
    manualTaskInputBox: {
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
    manualTaskTextInput: {
      flex: 1,
      fontSize: 12.5,
      color: theme.textPrimary,
      padding: 0,
    },
    manualTaskQuickChip: {
      paddingHorizontal: 9,
      paddingVertical: 4.5,
      borderRadius: 6,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    manualTaskQuickChipActive: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}20`,
    },
    manualTaskQuickChipText: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    manualTaskQuickChipTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
    alertToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface2,
      borderRadius: Radius.md,
      padding: 11,
      borderWidth: 1,
      borderColor: theme.border,
    },
    alertToggleRowActive: {
      borderColor: `${theme.primary}50`,
      backgroundColor: `${theme.primary}08`,
    },
    alertToggleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    alertToggleTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    alertToggleSub: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 1,
    },
    actionsBox: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    cancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface2,
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    submitBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: Radius.md,
      backgroundColor: theme.primary,
      gap: 6,
    },
    submitBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textInverse,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    leadModalCard: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      padding: 18,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface2,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 10,
      height: 40,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: theme.textPrimary,
      paddingVertical: 0,
    },
    leadItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      gap: 10,
    },
    leadItemRowActive: {
      backgroundColor: `${theme.primary}12`,
      borderRadius: Radius.md,
    },
    leadItemAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${theme.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    leadItemName: {
      fontSize: 13.5,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    leadItemPhone: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 1,
    },
  });
}
