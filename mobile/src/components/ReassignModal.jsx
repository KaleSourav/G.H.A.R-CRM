import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Radius, Typography } from '../theme/tokens';
import { teamAPI } from '../services/api';
import { getInitials } from '../utils/helpers';

export default function ReassignModal({
  visible,
  onClose,
  leadName,
  currentAssigneeId,
  onSelectUser,
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadTeam();
    }
  }, [visible]);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const res = await teamAPI.list();
      const list = res?.data || res || [];
      setTeamMembers(list.filter(u => u.status === 'active'));
    } catch (err) {
      console.error('[ReassignModal] loadTeam error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (user) => {
    setSubmitting(true);
    try {
      await onSelectUser(user);
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to reassign lead');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Transfer Lead</Text>
              <Text style={styles.subTitle} numberOfLines={1}>
                {leadName ? `Assign "${leadName}" to:` : 'Select a team member:'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.primary} size="small" />
              <Text style={styles.loadingText}>Loading team roster...</Text>
            </View>
          ) : (
            <FlatList
              data={teamMembers}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingVertical: 6 }}
              renderItem={({ item }) => {
                const isCurrent = item.id === currentAssigneeId;
                return (
                  <TouchableOpacity
                    style={[styles.memberRow, isCurrent && styles.memberRowCurrent]}
                    onPress={() => handleSelect(item)}
                    disabled={submitting}
                    activeOpacity={0.7}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(item.name || item.email)}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>{item.name || 'Unnamed'}</Text>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>CURRENT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memberRole}>{item.role || 'Sales Advisor'}</Text>
                    </View>

                    <Ionicons
                      name={isCurrent ? 'checkmark-circle' : 'chevron-forward'}
                      size={18}
                      color={isCurrent ? theme.primary : theme.textMuted}
                    />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No active team members found.</Text>
              }
            />
          )}

          {submitting && (
            <View style={styles.submittingOverlay}>
              <ActivityIndicator color={theme.primary} size="large" />
              <Text style={styles.submittingText}>Transferring lead...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.border,
      maxHeight: '75%',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    subTitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      padding: 4,
    },
    loadingBox: {
      padding: 30,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    loadingText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    memberRowCurrent: {
      backgroundColor: `${theme.primary}12`,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.surface2,
      borderWidth: 1,
      borderColor: theme.borderAccent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    avatarText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    memberInfo: {
      flex: 1,
    },
    memberNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    memberName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    currentBadge: {
      backgroundColor: `${theme.primary}15`,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    currentBadgeText: {
      fontSize: 9.5,
      fontWeight: '700',
      color: theme.primary,
    },
    memberRole: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 1,
      textTransform: 'capitalize',
    },
    emptyText: {
      padding: 20,
      textAlign: 'center',
      fontSize: 12,
      color: theme.textMuted,
    },
    submittingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(13, 21, 38, 0.85)',
      borderRadius: Radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    submittingText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
    },
  });
}
