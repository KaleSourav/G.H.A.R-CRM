import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leadsAPI, projectsAPI, teamAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Radius, Typography, Shadow } from '../theme/tokens';
import { CONFIGURATIONS, LEAD_SOURCES } from '../utils/constants';
import AppHeader from '../components/AppHeader';

const DEFAULT_CONFIGS = [
  '1 BHK', '1.5 BHK', '2 BHK', '2.5 BHK', '3 BHK', '3.5 BHK', '4 BHK', '5+ BHK / Penthouse',
  'Luxury Villa', 'Studio Apartment', 'Commercial Office', 'Retail Shop', 'Residential Plot'
];

export default function LeadCreateScreen({ navigation }) {
  const { refreshAssignedStats } = useAuth();
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [projectId, setProjectId] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [budget, setBudget] = useState('');
  const [source, setSource] = useState('Website Form');
  const [priority, setPriority] = useState('warm');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');

  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Modal Dropdown States
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showConfigPicker, setShowConfigPicker] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);

  useEffect(() => {
    projectsAPI.list().then(res => {
      const list = res?.data || res || [];
      setProjects(list);
    }).catch(() => {});

    teamAPI.list().then(res => {
      const list = res?.data || (Array.isArray(res) ? res : []);
      setTeamMembers(list.filter(u => u.status === 'active'));
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Please enter the lead full name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Missing Field', 'Please enter a contact phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const parsedBudget = budget ? Number(budget.replace(/\D/g, '')) : undefined;
      await leadsAPI.create({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        project_id: projectId || undefined,
        configuration: configuration || undefined,
        budget: parsedBudget,
        budget_max: parsedBudget,
        budget_min: parsedBudget,
        source,
        priority,
        assigned_to: assignedTo || undefined,
        notes: notes.trim() || undefined,
      });

      // Refresh badge & counts
      refreshAssignedStats?.();

      Alert.alert('Success', 'New lead registered successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create lead.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProject = projects.find(p => p.id === projectId);
  const selectedAssignee = teamMembers.find(m => m.id === assignedTo);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <AppHeader
        showBack
        onBack={() => navigation.goBack()}
        title="Register New Lead"
        subtitle="Add prospect to sales pipeline"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Contact</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={16} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputBox}>
              <Ionicons name="call-outline" size={16} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={theme.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address (Optional)</Text>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={16} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="rahul@example.com"
                placeholderTextColor={theme.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* ── Property Requirements Card (Dropdowns instead of slide scroll) ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Property Requirement</Text>

          {/* Interested Project Dropdown Menu */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Interested Project</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setShowProjectPicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownBtnLeft}>
                <Ionicons name="business-outline" size={17} color={theme.primary} />
                <Text style={[styles.dropdownBtnText, !projectId && styles.dropdownPlaceholder]}>
                  {selectedProject ? selectedProject.name : 'Select Project / Development'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Property Requirement / Configuration Dropdown Menu */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Unit Configuration / BHK Requirement</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setShowConfigPicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownBtnLeft}>
                <Ionicons name="home-outline" size={17} color={theme.accent} />
                <Text style={[styles.dropdownBtnText, !configuration && styles.dropdownPlaceholder]}>
                  {configuration ? configuration : 'Choose BHK or Property Type'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Budget */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Budget (INR)</Text>
            <View style={styles.inputBox}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 75,00,000 (75 Lakhs)"
                placeholderTextColor={theme.textMuted}
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Qualification & Assignment Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sales Assignment</Text>

          {/* Priority */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Deal Priority</Text>
            <View style={styles.priorityRow}>
              {[
                { id: 'hot', label: 'Hot Lead', color: theme.error, icon: 'flame' },
                { id: 'warm', label: 'Warm Lead', color: theme.warning, icon: 'sunny' },
                { id: 'cold', label: 'Cold Lead', color: theme.textSecondary, icon: 'snow' },
              ].map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.priorityBtn,
                    priority === p.id && { borderColor: p.color, backgroundColor: `${p.color}18` },
                  ]}
                  onPress={() => setPriority(p.id)}
                >
                  <Ionicons name={p.icon} size={14} color={priority === p.id ? p.color : theme.textSecondary} />
                  <Text style={[styles.priorityBtnText, priority === p.id && { color: p.color, fontWeight: '800' }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Lead Source Dropdown */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Lead Source</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setShowSourcePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownBtnLeft}>
                <Ionicons name="git-network-outline" size={17} color={theme.purple} />
                <Text style={styles.dropdownBtnText}>{source || 'Select Lead Source'}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Assignee Dropdown */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Assign to Sales Advisor</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setShowAssigneePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownBtnLeft}>
                <Ionicons name="person-circle-outline" size={17} color={theme.primary} />
                <Text style={[styles.dropdownBtnText, !assignedTo && styles.dropdownPlaceholder]}>
                  {selectedAssignee ? `${selectedAssignee.name} (${selectedAssignee.role})` : 'Unassigned (Pool)'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Initial Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Initial Client Remarks / Notes</Text>
            <View style={[styles.inputBox, styles.textAreaBox]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Client preferences, specific possession requirements, funding status..."
                placeholderTextColor={theme.textMuted}
                value={notes}
                onChangeText={setNotes}
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
                <Ionicons name="checkmark-circle" size={18} color={theme.textInverse} />
                <Text style={styles.submitBtnText}>Create Lead</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Project Picker Modal Dropdown ── */}
      <Modal visible={showProjectPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProjectPicker(false)}
        >
          <View style={styles.dropdownModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Interested Project</Text>
              <TouchableOpacity onPress={() => setShowProjectPicker(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ id: '', name: 'No Specific Project / Any Project' }, ...projects]}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, projectId === item.id && styles.modalItemActive]}
                  onPress={() => {
                    setProjectId(item.id);
                    setShowProjectPicker(false);
                  }}
                >
                  <Ionicons
                    name="business-outline"
                    size={17}
                    color={projectId === item.id ? theme.primary : theme.textSecondary}
                  />
                  <Text style={[styles.modalItemText, projectId === item.id && styles.modalItemTextActive]}>
                    {item.name}
                  </Text>
                  {projectId === item.id && (
                    <Ionicons name="checkmark" size={18} color={theme.primary} style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Configuration / BHK Picker Modal Dropdown ── */}
      <Modal visible={showConfigPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowConfigPicker(false)}
        >
          <View style={styles.dropdownModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Property Requirement</Text>
              <TouchableOpacity onPress={() => setShowConfigPicker(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DEFAULT_CONFIGS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, configuration === item && styles.modalItemActive]}
                  onPress={() => {
                    setConfiguration(item);
                    setShowConfigPicker(false);
                  }}
                >
                  <Ionicons
                    name="home-outline"
                    size={17}
                    color={configuration === item ? theme.accent : theme.textSecondary}
                  />
                  <Text style={[styles.modalItemText, configuration === item && styles.modalItemTextActive]}>
                    {item}
                  </Text>
                  {configuration === item && (
                    <Ionicons name="checkmark" size={18} color={theme.primary} style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Lead Source Picker Modal Dropdown ── */}
      <Modal visible={showSourcePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSourcePicker(false)}
        >
          <View style={styles.dropdownModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Lead Source</Text>
              <TouchableOpacity onPress={() => setShowSourcePicker(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={LEAD_SOURCES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, source === item && styles.modalItemActive]}
                  onPress={() => {
                    setSource(item);
                    setShowSourcePicker(false);
                  }}
                >
                  <Ionicons
                    name="git-network-outline"
                    size={17}
                    color={source === item ? theme.purple : theme.textSecondary}
                  />
                  <Text style={[styles.modalItemText, source === item && styles.modalItemTextActive]}>
                    {item}
                  </Text>
                  {source === item && (
                    <Ionicons name="checkmark" size={18} color={theme.primary} style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Assignee Picker Modal Dropdown ── */}
      <Modal visible={showAssigneePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAssigneePicker(false)}
        >
          <View style={styles.dropdownModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to Sales Advisor</Text>
              <TouchableOpacity onPress={() => setShowAssigneePicker(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ id: '', name: 'Unassigned (General Pool)', role: 'pool' }, ...teamMembers]}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, assignedTo === item.id && styles.modalItemActive]}
                  onPress={() => {
                    setAssignedTo(item.id);
                    setShowAssigneePicker(false);
                  }}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={18}
                    color={assignedTo === item.id ? theme.primary : theme.textSecondary}
                  />
                  <Text style={[styles.modalItemText, assignedTo === item.id && styles.modalItemTextActive]}>
                    {item.name} {item.role ? `· ${item.role}` : ''}
                  </Text>
                  {assignedTo === item.id && (
                    <Ionicons name="checkmark" size={18} color={theme.primary} style={{ marginLeft: 'auto' }} />
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
    currencyPrefix: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.primary,
      marginRight: 6,
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
    dropdownBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface2,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      minHeight: 46,
    },
    dropdownBtnLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    dropdownBtnText: {
      fontSize: 13.5,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    dropdownPlaceholder: {
      color: theme.textMuted,
      fontWeight: '400',
    },
    priorityRow: {
      flexDirection: 'row',
      gap: 8,
    },
    priorityBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface2,
      gap: 5,
    },
    priorityBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
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
      justifyContent: 'center',
      padding: 20,
    },
    dropdownModalCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.border,
      maxHeight: '75%',
      paddingBottom: 10,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    modalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      paddingHorizontal: 16,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    modalItemActive: {
      backgroundColor: `${theme.primary}12`,
    },
    modalItemText: {
      fontSize: 13.5,
      color: theme.textSecondary,
    },
    modalItemTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
  });
}
