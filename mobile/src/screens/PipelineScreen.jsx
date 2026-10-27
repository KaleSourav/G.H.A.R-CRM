import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Modal, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { leadsAPI, useAutoRefresh } from '../services/api';
import { Radius, Typography, Shadow } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { PIPELINE_STAGES, STAGE_CONFIG, LOST_REASONS } from '../utils/constants';
import { formatCurrency, formatPhone, getInitials, getWhatsAppUrl } from '../utils/helpers';
import AppHeader from '../components/AppHeader';

export default function PipelineScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [selectedStage, setSelectedStage] = useState(PIPELINE_STAGES[0]);
  const [leadsByStage, setLeadsByStage] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Move stage modal state
  const [movingLead, setMovingLead] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [selectedLostReason, setSelectedLostReason] = useState(LOST_REASONS[0]);
  const [updating, setUpdating] = useState(false);

  const loadPipeline = useCallback(async () => {
    try {
      const res = await leadsAPI.list({ limit: 300 });
      const data = res?.data || res || {};
      const allLeads = data.leads || [];

      const grouped = {};
      PIPELINE_STAGES.forEach(s => { grouped[s] = []; });
      allLeads.forEach(l => {
        if (grouped[l.stage]) grouped[l.stage].push(l);
        else grouped['New / Unassigned']?.push(l);
      });

      setLeadsByStage(grouped);
    } catch (err) {
      console.error('[PipelineScreen] load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPipeline();
    }, [loadPipeline])
  );

  // Auto-refresh instantly on any mutation broadcast
  useAutoRefresh(loadPipeline);

  const onRefresh = () => {
    setRefreshing(true);
    loadPipeline();
  };

  const handleOpenMoveModal = (lead) => {
    setMovingLead(lead);
    setShowMoveModal(true);
  };

  const handleSelectStage = async (newStage) => {
    if (!movingLead) return;

    if (newStage === 'Lost / Dropped') {
      setShowMoveModal(false);
      setShowLostModal(true);
      return;
    }

    setUpdating(true);
    try {
      await leadsAPI.update(movingLead.id, { stage: newStage });
      setShowMoveModal(false);
      setMovingLead(null);
      loadPipeline();
    } catch (err) {
      Alert.alert('Error', 'Failed to update deal stage');
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmLost = async () => {
    if (!movingLead) return;
    setUpdating(true);
    try {
      await leadsAPI.update(movingLead.id, {
        stage: 'Lost / Dropped',
        lost_reason: selectedLostReason,
      });
      setShowLostModal(false);
      setMovingLead(null);
      loadPipeline();
    } catch (err) {
      Alert.alert('Error', 'Failed to update deal stage');
    } finally {
      setUpdating(false);
    }
  };

  const activeLeads = leadsByStage[selectedStage] || [];
  const currentStageCfg = STAGE_CONFIG[selectedStage] || { color: theme.primary, short: selectedStage };

  const totalStageVolume = activeLeads.reduce((acc, l) => {
    const val = l.budget_max || l.budget_min || l.budget || 0;
    return acc + Number(val || 0);
  }, 0);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Sales Pipeline"
        subtitle="Kanban Deal Funnel"
        navigation={navigation}
      />

      {/* Stage Carousel Selector */}
      <View style={styles.carouselContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselScroll}
        >
          {PIPELINE_STAGES.map(stage => {
            const count = (leadsByStage[stage] || []).length;
            const isSelected = selectedStage === stage;
            const cfg = STAGE_CONFIG[stage] || { color: theme.primary, short: stage };

            return (
              <TouchableOpacity
                key={stage}
                style={[
                  styles.stageTab,
                  isSelected && styles.stageTabActive,
                  isSelected && { borderColor: cfg.color },
                ]}
                onPress={() => setSelectedStage(stage)}
                activeOpacity={0.75}
              >
                <View style={[styles.stageDot, { backgroundColor: cfg.color }]} />
                <Text style={[styles.stageTabText, isSelected && styles.stageTabTextActive]}>
                  {cfg.short}
                </Text>
                <View style={[styles.stageCountBadge, isSelected && { backgroundColor: cfg.color }]}>
                  <Text style={[styles.stageCountText, isSelected && { color: theme.bg }]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Stage Header Banner */}
      <View style={styles.stageBanner}>
        <View style={styles.stageBannerLeft}>
          <View style={[styles.stageIndicatorDot, { backgroundColor: currentStageCfg.color }]} />
          <View>
            <Text style={styles.stageBannerTitle}>{selectedStage}</Text>
            <Text style={styles.stageBannerSub}>
              {activeLeads.length} {activeLeads.length === 1 ? 'Opportunity' : 'Opportunities'}
            </Text>
          </View>
        </View>

        {totalStageVolume > 0 && (
          <View style={styles.stageVolumeBox}>
            <Text style={styles.stageVolumeLabel}>Stage Volume</Text>
            <Text style={styles.stageVolumeText}>{formatCurrency(totalStageVolume)}</Text>
          </View>
        )}
      </View>

      {/* Stage Cards List */}
      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={styles.loaderText}>Loading Pipeline...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.cardsScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {activeLeads.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="layers-outline" size={32} color={theme.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No deals in this stage</Text>
              <Text style={styles.emptySubtitle}>
                Move leads here as they advance through your sales qualification workflow.
              </Text>
            </View>
          ) : (
            activeLeads.map(lead => {
              const projectName = lead.project?.name || lead.project_name;
              const budgetVal = lead.budget_max || lead.budget_min || lead.budget;
              const phoneDigits = lead.phone ? String(lead.phone).replace(/\D/g, '').slice(-10) : '';

              return (
                <TouchableOpacity
                  key={lead.id}
                  style={styles.pipelineCard}
                  onPress={() => navigation.navigate('LeadDetail', { leadId: lead.id })}
                  activeOpacity={0.82}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarMiniText}>{getInitials(lead.name)}</Text>
                    </View>
                    <View style={styles.cardNameCol}>
                      <Text style={styles.cardName} numberOfLines={1}>{lead.name || 'Anonymous'}</Text>
                      <Text style={styles.cardPhone}>{formatPhone(lead.phone)}</Text>
                    </View>
                    {budgetVal ? (
                      <View style={styles.budgetPill}>
                        <Text style={styles.budgetText}>{formatCurrency(budgetVal)}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Project & Assignee row */}
                  <View style={styles.cardMetaRow}>
                    {projectName ? (
                      <View style={styles.metaChip}>
                        <Ionicons name="business-outline" size={11} color={theme.primary} />
                        <Text style={styles.metaChipText} numberOfLines={1}>{projectName}</Text>
                      </View>
                    ) : null}

                    {lead.assignee?.name && (
                      <View style={styles.metaChip}>
                        <Ionicons name="person-outline" size={11} color={theme.textSecondary} />
                        <Text style={styles.metaChipText}>{lead.assignee.name.split(' ')[0]}</Text>
                      </View>
                    )}
                  </View>

                  {/* 1-Tap Actions: Move Stage, WhatsApp, Call */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.moveBtn}
                      onPress={() => handleOpenMoveModal(lead)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="repeat-outline" size={13} color={theme.primary} />
                      <Text style={styles.moveBtnText}>Move Stage</Text>
                    </TouchableOpacity>

                    <View style={styles.quickContactRow}>
                      {phoneDigits ? (
                        <TouchableOpacity
                          style={styles.actionIconWhatsApp}
                          onPress={() => {
                            const url = getWhatsAppUrl(lead.phone, lead.name, projectName);
                            if (url) Linking.openURL(url);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                        </TouchableOpacity>
                      ) : null}

                      {phoneDigits ? (
                        <TouchableOpacity
                          style={styles.actionIconCall}
                          onPress={() => Linking.openURL(`tel:+91${phoneDigits}`)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="call" size={14} color={theme.info} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Move Stage Bottom Sheet */}
      <Modal
        visible={showMoveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Move Deal Stage</Text>
                <Text style={styles.modalSubTitle}>
                  {movingLead ? `Update stage for "${movingLead.name}"` : 'Select target stage'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMoveModal(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {PIPELINE_STAGES.map(stage => {
                const isCurrent = movingLead?.stage === stage;
                const cfg = STAGE_CONFIG[stage] || { color: theme.primary };

                return (
                  <TouchableOpacity
                    key={stage}
                    style={[styles.stageOptionItem, isCurrent && styles.stageOptionItemActive]}
                    onPress={() => handleSelectStage(stage)}
                    disabled={updating}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.stageDot, { backgroundColor: cfg.color }]} />
                    <Text style={[styles.stageOptionName, isCurrent && styles.stageOptionNameActive]}>
                      {stage}
                    </Text>
                    {isCurrent && (
                      <Ionicons name="checkmark-circle" size={18} color={theme.primary} style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Lost Reason Modal */}
      <Modal
        visible={showLostModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLostModal(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.lostModalBox}>
            <Text style={styles.lostTitle}>Reason for Deal Lost</Text>
            <Text style={styles.lostSubtitle}>Why was this deal dropped?</Text>

            <View style={styles.lostChipsGrid}>
              {LOST_REASONS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.lostChip, selectedLostReason === r && styles.lostChipActive]}
                  onPress={() => setSelectedLostReason(r)}
                >
                  <Text style={[styles.lostChipText, selectedLostReason === r && styles.lostChipTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.lostButtonsRow}>
              <TouchableOpacity
                style={styles.lostCancelButton}
                onPress={() => setShowLostModal(false)}
              >
                <Text style={styles.lostCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.lostConfirmButton}
                onPress={handleConfirmLost}
              >
                <Text style={styles.lostConfirmButtonText}>Mark Lost</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    carouselContainer: {
      backgroundColor: theme.surface,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    carouselScroll: {
      paddingHorizontal: 12,
      gap: 6,
    },
    stageTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.surface2,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.border,
    },
    stageTabActive: {
      backgroundColor: 'rgba(232, 160, 32, 0.12)',
    },
    stageDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    stageTabText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    stageTabTextActive: {
      fontWeight: '700',
      color: theme.textPrimary,
    },
    stageCountBadge: {
      backgroundColor: theme.surface,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: Radius.full,
    },
    stageCountText: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.textSecondary,
    },
    stageBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    stageBannerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    stageIndicatorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    stageBannerTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    stageBannerSub: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 1,
    },
    stageVolumeBox: {
      alignItems: 'flex-end',
    },
    stageVolumeLabel: {
      fontSize: 9.5,
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    stageVolumeText: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.primary,
      marginTop: 1,
    },
    loaderCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    loaderText: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    cardsScroll: {
      padding: 14,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
      paddingHorizontal: 24,
    },
    emptyIconBox: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    pipelineCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: 13,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 3,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    avatarMini: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.surface2,
      borderWidth: 1,
      borderColor: theme.borderAccent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 9,
    },
    avatarMiniText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    cardNameCol: {
      flex: 1,
    },
    cardName: {
      fontSize: 13.5,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    cardPhone: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 1,
    },
    budgetPill: {
      backgroundColor: 'rgba(232, 160, 32, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(232, 160, 32, 0.25)',
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: Radius.sm,
    },
    budgetText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    cardMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.surface2,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: Radius.xs,
    },
    metaChipText: {
      fontSize: 10.5,
      color: theme.textSecondary,
      maxWidth: 140,
    },
    cardActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    moveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(232, 160, 32, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(232, 160, 32, 0.3)',
      paddingHorizontal: 9,
      paddingVertical: 4.5,
      borderRadius: Radius.sm,
    },
    moveBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    quickContactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionIconWhatsApp: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(37, 211, 102, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(37, 211, 102, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionIconCall: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
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
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      padding: 18,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    modalSubTitle: {
      fontSize: 11.5,
      color: theme.textSecondary,
      marginTop: 2,
    },
    stageOptionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: Radius.md,
      gap: 8,
    },
    stageOptionItemActive: {
      backgroundColor: 'rgba(232, 160, 32, 0.1)',
    },
    stageOptionName: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    stageOptionNameActive: {
      fontWeight: '800',
      color: theme.primary,
    },
    lostModalBox: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      padding: 18,
      width: '100%',
      borderWidth: 1,
      borderColor: theme.border,
    },
    lostTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.error,
    },
    lostSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
      marginBottom: 12,
    },
    lostChipsGrid: {
      gap: 6,
      marginBottom: 14,
    },
    lostChip: {
      backgroundColor: theme.surface2,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    lostChipActive: {
      borderColor: theme.error,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    lostChipText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    lostChipTextActive: {
      fontWeight: '700',
      color: theme.error,
    },
    lostButtonsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    lostCancelButton: {
      flex: 1,
      backgroundColor: theme.surface2,
      paddingVertical: 10,
      borderRadius: Radius.md,
      alignItems: 'center',
    },
    lostCancelButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    lostConfirmButton: {
      flex: 1.5,
      backgroundColor: theme.error,
      paddingVertical: 10,
      borderRadius: Radius.md,
      alignItems: 'center',
    },
    lostConfirmButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFF',
    },
  });
}
