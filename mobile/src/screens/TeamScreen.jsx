import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { teamAPI, useAutoRefresh } from '../services/api';
import { getInitials, formatPhone } from '../utils/helpers';
import { Radius, Typography, Shadow } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';

const AVAILABLE_ROLES = [
  { id: 'super_admin', label: 'Super Admin' },
  { id: 'admin', label: 'Admin' },
  { id: 'manager', label: 'Sales Manager' },
  { id: 'executive', label: 'Sales Executive' },
];

export default function TeamScreen({ navigation }) {
  const { user, isSuperAdmin } = useAuth();
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Super Admin Management Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // New member form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('executive');
  const [newStatus, setNewStatus] = useState('active');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await teamAPI.list();
      const list = res?.data || (Array.isArray(res) ? res : []);
      setTeam(list);
    } catch (err) {
      console.error('[TeamScreen] load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Auto-refresh instantly on any mutation broadcast
  useAutoRefresh(load);

  const onRefresh = () => { setRefreshing(true); load(); };

  // ── Toggle Active / Inactive Status (Super Admin) ────────────────────────
  const handleToggleStatus = async (member) => {
    if (!isSuperAdmin) return;
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      await teamAPI.update(member.id, { status: nextStatus });
      setTeam(prev => prev.map(m => m.id === member.id ? { ...m, status: nextStatus } : m));
    } catch (err) {
      Alert.alert('Status Update Failed', err.message || 'Could not update user status.');
    }
  };

  // ── Change Role (Super Admin) ────────────────────────────────────────────
  const handleChangeRole = async (targetRole) => {
    if (!selectedMember || !isSuperAdmin) return;
    try {
      await teamAPI.update(selectedMember.id, { role: targetRole });
      setTeam(prev => prev.map(m => m.id === selectedMember.id ? { ...m, role: targetRole } : m));
      setShowRoleModal(false);
      setSelectedMember(null);
    } catch (err) {
      Alert.alert('Role Update Failed', err.message || 'Could not update role.');
    }
  };

  // ── Delete Member (Super Admin) ──────────────────────────────────────────
  const handleDeleteMember = (member) => {
    if (!isSuperAdmin) return;
    if (member.id === user?.id) {
      Alert.alert('Action Denied', 'You cannot delete your own account.');
      return;
    }

    Alert.alert(
      'Delete Member',
      `Permanently remove "${member.name || member.email}" from the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await teamAPI.delete(member.id);
              setTeam(prev => prev.filter(m => m.id !== member.id));
              Alert.alert('Deleted', 'Member was removed successfully.');
            } catch (err) {
              Alert.alert('Delete Failed', err.message || 'Could not delete member.');
            }
          },
        },
      ]
    );
  };

  // ── Add New Member (Super Admin) ─────────────────────────────────────────
  const handleAddMemberSubmit = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      Alert.alert('Missing Fields', 'Please provide at least a full name and email address.');
      return;
    }

    setSubmitting(true);
    try {
      await teamAPI.create({
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || undefined,
        password: newPassword.trim() || 'Ghar@12345',
        role: newRole,
        status: newStatus,
      });

      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setNewRole('executive');
      setNewStatus('active');
      load();

      Alert.alert('Member Added', 'New team advisor has been registered.');
    } catch (err) {
      Alert.alert('Failed to Add', err.message || 'Could not create team user.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
      case 'superadmin':
        return { label: 'Super Admin', color: theme.primary, bg: `${theme.primary}18` };
      case 'admin':
        return { label: 'Admin', color: theme.purple, bg: `${theme.purple}18` };
      case 'manager':
        return { label: 'Sales Manager', color: theme.accent, bg: `${theme.accent}18` };
      case 'executive':
        return { label: 'Sales Executive', color: theme.success, bg: `${theme.success}18` };
      default:
        return { label: role?.replace(/_/g, ' ') || 'Advisor', color: theme.textSecondary, bg: theme.surface2 };
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        showBack
        onBack={() => navigation.goBack()}
        title="Team Directory"
        subtitle={isSuperAdmin ? 'Super Admin Management Center' : 'Sales Leaders & Advisors'}
        rightAction={
          isSuperAdmin ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add" size={15} color={theme.textInverse} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={styles.loaderText}>Loading team roster...</Text>
        </View>
      ) : (
        <FlatList
          data={team}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          renderItem={({ item }) => {
            const roleBadge = getRoleBadge(item.role);
            const phoneDigits = item.phone ? String(item.phone).replace(/\D/g, '').slice(-10) : '';
            const isActive = item.status === 'active' || !item.status;

            return (
              <View style={[styles.memberCard, !isActive && styles.memberCardInactive]}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.avatarText}>{getInitials(item.name || item.email)}</Text>
                </View>

                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>{item.name || 'Team Member'}</Text>
                    {/* Active / Inactive Badge with Toggle for Super Admin */}
                    {isSuperAdmin ? (
                      <TouchableOpacity
                        style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}
                        onPress={() => handleToggleStatus(item)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.statusDot, { backgroundColor: isActive ? theme.success : theme.error }]} />
                        <Text style={[styles.statusText, { color: isActive ? theme.success : theme.error }]}>
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                        <View style={[styles.statusDot, { backgroundColor: isActive ? theme.success : theme.error }]} />
                        <Text style={[styles.statusText, { color: isActive ? theme.success : theme.error }]}>
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.memberEmail}>{item.email}</Text>

                  <View style={styles.metaRow}>
                    {/* Role Pill - Tap to change role for Super Admin */}
                    <TouchableOpacity
                      style={[styles.rolePill, { backgroundColor: roleBadge.bg }]}
                      onPress={() => {
                        if (isSuperAdmin) {
                          setSelectedMember(item);
                          setShowRoleModal(true);
                        }
                      }}
                      disabled={!isSuperAdmin}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.roleText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
                      {isSuperAdmin && (
                        <Ionicons name="chevron-down" size={11} color={roleBadge.color} style={{ marginLeft: 3 }} />
                      )}
                    </TouchableOpacity>

                    {item.current_lead_count !== undefined && (
                      <Text style={styles.leadCountText}>
                        {item.current_lead_count} active leads
                      </Text>
                    )}
                  </View>
                </View>

                {/* Actions: Call, Email, Delete */}
                <View style={styles.actionCol}>
                  {phoneDigits ? (
                    <TouchableOpacity
                      style={styles.actionBtnCall}
                      onPress={() => Linking.openURL(`tel:+91${phoneDigits}`)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={14} color={theme.info} />
                    </TouchableOpacity>
                  ) : null}

                  {item.email ? (
                    <TouchableOpacity
                      style={styles.actionBtnEmail}
                      onPress={() => Linking.openURL(`mailto:${item.email}`)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="mail" size={14} color={theme.primary} />
                    </TouchableOpacity>
                  ) : null}

                  {/* Super Admin Delete Button */}
                  {isSuperAdmin && (
                    <TouchableOpacity
                      style={styles.actionBtnDelete}
                      onPress={() => handleDeleteMember(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={44} color={theme.textMuted} />
              <Text style={styles.emptyText}>No team members found</Text>
            </View>
          }
        />
      )}

      {/* ── Super Admin Add Member Modal (Request 10) ── */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => !submitting && setShowAddModal(false)}>
          <View style={styles.addModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Team Member</Text>
                <Text style={styles.modalSubtitle}>Create new admin or advisor account</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)} disabled={submitting}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name <Text style={{ color: theme.error }}>*</Text></Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Asif Sheikh"
                  placeholderTextColor={theme.textMuted}
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email Address <Text style={{ color: theme.error }}>*</Text></Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="asif@ghar.in"
                  placeholderTextColor={theme.textMuted}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="10-digit mobile"
                  placeholderTextColor={theme.textMuted}
                  value={newPhone}
                  onChangeText={setNewPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Initial Password</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Default: Ghar@12345"
                  placeholderTextColor={theme.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Role Assignment</Text>
                <View style={styles.rolesGrid}>
                  {AVAILABLE_ROLES.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.roleSelectChip, newRole === r.id && styles.roleSelectChipActive]}
                      onPress={() => setNewRole(r.id)}
                    >
                      <Text style={[styles.roleSelectChipText, newRole === r.id && styles.roleSelectChipTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Initial Status</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {['active', 'inactive'].map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusSelectChip, newStatus === s && styles.statusSelectChipActive]}
                      onPress={() => setNewStatus(s)}
                    >
                      <Text style={[styles.statusSelectText, newStatus === s && { color: s === 'active' ? theme.success : theme.error, fontWeight: '800' }]}>
                        {s.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)} disabled={submitting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddMemberSubmit} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color={theme.textInverse} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Create User</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Change Role Modal (Request 10) ── */}
      <Modal visible={showRoleModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlayCenter} activeOpacity={1} onPress={() => setShowRoleModal(false)}>
          <View style={styles.roleModalCard}>
            <Text style={styles.modalTitle}>Change Position / Role</Text>
            <Text style={styles.modalSubtitle}>
              Update role for {selectedMember?.name || 'this member'}
            </Text>

            <View style={{ gap: 8, marginVertical: 14 }}>
              {AVAILABLE_ROLES.map(r => {
                const isSelected = selectedMember?.role === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.roleRow, isSelected && styles.roleRowSelected]}
                    onPress={() => handleChangeRole(r.id)}
                  >
                    <Ionicons
                      name={isSelected ? 'shield-checkmark' : 'shield-outline'}
                      size={18}
                      color={isSelected ? theme.primary : theme.textSecondary}
                    />
                    <Text style={[styles.roleRowText, isSelected && styles.roleRowTextSelected]}>
                      {r.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={theme.primary} style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRoleModal(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    loaderText: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Radius.md,
      gap: 4,
    },
    addBtnText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: theme.textInverse,
    },
    list: {
      padding: 14,
      paddingBottom: 32,
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      padding: 14,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 10,
    },
    memberCardInactive: {
      opacity: 0.65,
      backgroundColor: theme.surface2,
    },
    memberAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.surface2,
      borderWidth: 1.5,
      borderColor: theme.borderAccent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.primary,
    },
    memberInfo: {
      flex: 1,
    },
    memberNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    memberName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textPrimary,
      flex: 1,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
    },
    statusBadgeActive: {
      backgroundColor: `${theme.success}15`,
      borderColor: `${theme.success}35`,
    },
    statusBadgeInactive: {
      backgroundColor: `${theme.error}15`,
      borderColor: `${theme.error}35`,
    },
    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    statusText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    memberEmail: {
      fontSize: 11.5,
      color: theme.textSecondary,
      marginTop: 1,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    rolePill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: Radius.xs,
    },
    roleText: {
      fontSize: 10,
      fontWeight: '700',
    },
    leadCountText: {
      fontSize: 11,
      color: theme.textMuted,
    },
    actionCol: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginLeft: 8,
    },
    actionBtnCall: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: `${theme.info}18`,
      borderWidth: 1,
      borderColor: `${theme.info}40`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnEmail: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: `${theme.primary}18`,
      borderWidth: 1,
      borderColor: `${theme.primary}40`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnDelete: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: `${theme.error}15`,
      borderWidth: 1,
      borderColor: `${theme.error}35`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textMuted,
      marginTop: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    modalOverlayCenter: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      padding: 20,
    },
    addModalCard: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      maxHeight: '85%',
    },
    roleModalCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    modalSubtitle: {
      fontSize: 11.5,
      color: theme.textSecondary,
      marginTop: 2,
    },
    formGroup: {
      marginBottom: 12,
    },
    formLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 6,
    },
    formInput: {
      backgroundColor: theme.surface2,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: theme.textPrimary,
    },
    rolesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    roleSelectChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface2,
    },
    roleSelectChipActive: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}18`,
    },
    roleSelectChipText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    roleSelectChipTextActive: {
      color: theme.primary,
      fontWeight: '800',
    },
    statusSelectChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface2,
      alignItems: 'center',
    },
    statusSelectChipActive: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}15`,
    },
    statusSelectText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    submitBtn: {
      flex: 2,
      paddingVertical: 12,
      borderRadius: Radius.md,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.textInverse,
    },
    roleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: Radius.md,
      backgroundColor: theme.surface2,
      borderWidth: 1,
      borderColor: theme.border,
    },
    roleRowSelected: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}15`,
    },
    roleRowText: {
      fontSize: 13.5,
      color: theme.textPrimary,
      fontWeight: '600',
    },
    roleRowTextSelected: {
      color: theme.primary,
      fontWeight: '800',
    },
  });
}
