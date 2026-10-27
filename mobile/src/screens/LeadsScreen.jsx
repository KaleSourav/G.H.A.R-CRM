import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Modal, ScrollView, Alert, Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { leadsAPI, projectsAPI, useAutoRefresh } from '../services/api';
import { Radius, Typography, Shadow } from '../theme/tokens';
import { PIPELINE_STAGES, STAGE_CONFIG, LEAD_SOURCES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';
import LeadCard from '../components/LeadCard';

const PRESET_FILTERS = [
  { id: 'all', label: 'All', icon: 'layers-outline' },
  { id: 'hot', label: 'Hot Priority', icon: 'flame' },
  { id: 'sla', label: 'SLA Breaches', icon: 'alert-circle-outline' },
  { id: 'new', label: 'New Leads', icon: 'star-outline' },
  { id: 'site_visit', label: 'Site Visit', icon: 'calendar-outline' },
  { id: 'qualified', label: 'Qualified', icon: 'checkmark-circle-outline' },
];

export default function LeadsScreen({ navigation, route }) {
  const { user, isSuperAdmin, assignedStats, refreshAssignedStats } = useAuth();
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  // User requested: 1st tab = All Leads, 2nd tab = My Leads, 3rd tab = Unassigned
  const [queueTab, setQueueTab] = useState('all');
  const [activePreset, setActivePreset] = useState(route.params?.filter || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState([]);
  const [totalAllCount, setTotalAllCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Advanced Filter Modal State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({
    stage: '',
    priority: '',
    project_id: '',
    source: '',
  });

  // Import / Export Excel Modal States for Super Admin
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [selectedFileMeta, setSelectedFileMeta] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    projectsAPI.list().then(res => {
      const list = res?.data || res || [];
      setProjects(list);
    }).catch(() => {});
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: 100,
        sort_by: 'created_at',
        sort_dir: 'desc',
      };

      if (queueTab === 'my') {
        params.assigned_to = 'me';
      } else if (queueTab === 'unassigned') {
        params.assigned_to = 'unassigned';
      }

      // Handle preset filters
      if (activePreset === 'hot') {
        params.priority = 'hot';
      } else if (activePreset === 'sla') {
        params.sla_breach = 'true';
      } else if (activePreset === 'new') {
        params.stage = 'New / Unassigned';
      } else if (activePreset === 'site_visit') {
        params.stage = 'Site Visit Scheduled';
      } else if (activePreset === 'qualified') {
        params.stage = 'Qualified';
      }

      // Apply search
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      // Apply extra modal filters
      if (filters.stage) params.stage = filters.stage;
      if (filters.priority) params.priority = filters.priority;
      if (filters.project_id) params.project_id = filters.project_id;
      if (filters.source) params.source = filters.source;

      const res = await leadsAPI.list(params);
      const data = res?.data || res || {};
      const leadList = data.leads || (Array.isArray(data) ? data : []);
      setLeads(leadList);
      if (queueTab === 'all' && !searchTerm && activePreset === 'all') {
        setTotalAllCount(data.total || leadList.length);
      }
    } catch (err) {
      console.error('[LeadsScreen] loadLeads error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [queueTab, activePreset, searchTerm, filters]);

  // Auto-refresh when focused
  useFocusEffect(
    useCallback(() => {
      loadLeads();
      refreshAssignedStats?.();
    }, [loadLeads, refreshAssignedStats])
  );

  // Auto-refresh instantly on any mutation broadcast
  useAutoRefresh(loadLeads);

  const onRefresh = () => {
    setRefreshing(true);
    refreshAssignedStats?.();
    loadLeads();
  };

  const hasActiveFilters = Boolean(filters.stage || filters.priority || filters.project_id || filters.source);

  const clearAllFilters = () => {
    setFilters({ stage: '', priority: '', project_id: '', source: '' });
    setActivePreset('all');
    setSearchTerm('');
    setShowFilterModal(false);
  };

  // ── Super Admin Export Leads (CSV/Excel) ──────────────────────────────────
  const handleExportExcel = async () => {
    if (!leads || leads.length === 0) {
      Alert.alert('No Leads', 'There are no lead records to export.');
      return;
    }

    try {
      // Build standard CSV
      const headers = ['Full Name', 'Phone', 'Email', 'Project', 'Configuration', 'Budget', 'Stage', 'Priority', 'Source', 'Created At'];
      const rows = leads.map(l => [
        `"${(l.name || '').replace(/"/g, '""')}"`,
        `"${(l.phone || '').replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(l.project?.name || l.project_name || '').replace(/"/g, '""')}"`,
        `"${(l.configuration || '').replace(/"/g, '""')}"`,
        `"${l.budget || l.budget_max || l.budget_min || ''}"`,
        `"${(l.stage || '').replace(/"/g, '""')}"`,
        `"${(l.priority || '').replace(/"/g, '""')}"`,
        `"${(l.source || '').replace(/"/g, '""')}"`,
        `"${l.created_at || ''}"`,
      ].join(','));

      const csvString = [headers.join(','), ...rows].join('\n');

      await Share.share({
        message: csvString,
        title: 'GHAR_Leads_Database.csv',
      });
    } catch (err) {
      Alert.alert('Export Notice', 'Could not open share dialog.');
    }
  };

  // ── Super Admin Import Leads (CSV/Excel) ──────────────────────────────────
  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;

      const file = res.assets[0];
      setSelectedFileMeta(file);

      let text = '';
      try {
        text = await FileSystem.readAsStringAsync(file.uri);
      } catch {
        const response = await fetch(file.uri);
        text = await response.text();
      }

      if (text) {
        setImportCsvText(text.trim());
        const count = text.split('\n').filter(l => l.trim()).length;
        Alert.alert(
          'File Loaded Successfully',
          `"${file.name}" loaded (${count} rows). Review data below and tap "Import Leads".`
        );
      }
    } catch (err) {
      Alert.alert('File Pick Error', err.message || 'Could not select or read file.');
    }
  };

  const handleImportSubmit = async () => {
    if (!importCsvText.trim()) {
      Alert.alert('Empty Data', 'Please enter or paste CSV lines to import.');
      return;
    }

    setImporting(true);
    try {
      const lines = importCsvText.trim().split('\n').filter(l => l.trim().length > 0);
      let successCount = 0;
      let errorCount = 0;

      for (const line of lines) {
        // Skip header line if present
        if (line.toLowerCase().includes('name') && line.toLowerCase().includes('phone')) {
          continue;
        }

        const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2 && parts[0] && parts[1]) {
          const leadBudget = parts[4] ? Number(parts[4].replace(/\D/g, '')) : undefined;
          const leadObj = {
            name: parts[0],
            phone: parts[1],
            email: parts[2] || undefined,
            configuration: parts[3] || undefined,
            budget: leadBudget,
            budget_max: leadBudget,
            budget_min: leadBudget,
            source: 'Excel Import',
            priority: 'warm',
          };
          try {
            await leadsAPI.create(leadObj);
            successCount++;
          } catch {
            errorCount++;
          }
        }
      }

      setImportCsvText('');
      setShowImportModal(false);
      Alert.alert(
        'Import Completed',
        `Successfully imported ${successCount} leads.${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
        [{ text: 'OK', onPress: () => onRefresh() }]
      );
    } catch (err) {
      Alert.alert('Import Failed', err.message || 'Error processing sheet');
    } finally {
      setImporting(false);
    }
  };

  const handlePasteTemplate = () => {
    setImportCsvText(
      'Amit Patel, 9876543210, amit@gmail.com, 3 BHK, 8500000\n' +
      'Neha Sharma, 9811223344, neha@outlook.com, 2 BHK, 6500000\n' +
      'Rajesh Verma, 9988776655, rajesh@corp.in, 4 BHK Villa, 15000000'
    );
  };

  const myLeadsCount = assignedStats?.assignedToMeCount || 0;
  const unassignedCount = assignedStats?.unassignedCount || 0;
  const displayAllCount = totalAllCount || (leads.length > 0 ? leads.length : 0);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Leads Management"
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Super Admin Excel Options */}
            {isSuperAdmin && (
              <>
                <TouchableOpacity
                  style={styles.adminActionBtn}
                  onPress={handleExportExcel}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={16} color={theme.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.adminActionBtn}
                  onPress={() => setShowImportModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color={theme.accent} />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.addLeadBtn}
              onPress={() => navigation.navigate('LeadCreate')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color={theme.textInverse} />
              <Text style={styles.addLeadBtnText}>New</Text>
            </TouchableOpacity>
          </View>
        }
        navigation={navigation}
      />

      {/* ── Top Queue Segmented Bar: All Leads FIRST, then My Leads, then Unassigned ── */}
      <View style={styles.queueTabBar}>
        {/* 1. All Leads */}
        <TouchableOpacity
          style={[styles.queueTab, queueTab === 'all' && styles.queueTabActive]}
          onPress={() => setQueueTab('all')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people"
            size={14}
            color={queueTab === 'all' ? theme.primary : theme.textSecondary}
          />
          <Text style={[styles.queueTabText, queueTab === 'all' && styles.queueTabTextActive]}>
            All Leads
          </Text>
          <View style={[styles.queueCountBadge, queueTab === 'all' && styles.queueCountBadgeActive]}>
            <Text style={[styles.queueCountText, queueTab === 'all' && styles.queueCountTextActive]}>
              {displayAllCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 2. My Leads */}
        <TouchableOpacity
          style={[styles.queueTab, queueTab === 'my' && styles.queueTabActive]}
          onPress={() => setQueueTab('my')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="person"
            size={13}
            color={queueTab === 'my' ? theme.primary : theme.textSecondary}
          />
          <Text style={[styles.queueTabText, queueTab === 'my' && styles.queueTabTextActive]}>
            My Leads
          </Text>
          <View style={[styles.queueCountBadge, queueTab === 'my' && styles.queueCountBadgeActive]}>
            <Text style={[styles.queueCountText, queueTab === 'my' && styles.queueCountTextActive]}>
              {myLeadsCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 3. Unassigned Pool */}
        <TouchableOpacity
          style={[styles.queueTab, queueTab === 'unassigned' && styles.queueTabActive]}
          onPress={() => setQueueTab('unassigned')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="archive-outline"
            size={13}
            color={queueTab === 'unassigned' ? theme.primary : theme.textSecondary}
          />
          <Text style={[styles.queueTabText, queueTab === 'unassigned' && styles.queueTabTextActive]}>
            Unassigned
          </Text>
          <View style={[styles.queueCountBadge, unassignedCount > 0 && styles.queueCountBadgeWarning]}>
            <Text style={[styles.queueCountText, unassignedCount > 0 && styles.queueCountTextWarning]}>
              {unassignedCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Trigger Bar */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, phone, project..."
            placeholderTextColor={theme.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={hasActiveFilters ? theme.primary : theme.textSecondary}
          />
          {hasActiveFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Preset Filters Carousel */}
      <View style={styles.presetCarouselWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetScroll}
        >
          {PRESET_FILTERS.map((p) => {
            const isActive = activePreset === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.presetChip, isActive && styles.presetChipActive]}
                onPress={() => setActivePreset(p.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={p.icon}
                  size={12}
                  color={isActive ? theme.primary : theme.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Leads FlatList */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={styles.loadingText}>Fetching live leads...</Text>
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => (
            <LeadCard
              lead={item}
              onPress={() => navigation.navigate('LeadDetail', { leadId: item.id })}
              showAssignee={queueTab === 'all' || queueTab === 'unassigned'}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>No Leads Found</Text>
              <Text style={styles.emptySub}>
                {searchTerm
                  ? `No leads matched "${searchTerm}"`
                  : 'Try selecting a different filter or register a new prospect.'}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity style={styles.resetFiltersBtn} onPress={clearAllFilters}>
                  <Text style={styles.resetFiltersBtnText}>Reset All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── Advanced Filter Modal ── */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.filterModalCard}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Leads</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Pipeline Stage */}
              <Text style={styles.filterGroupTitle}>Pipeline Stage</Text>
              <View style={styles.filterOptionsGrid}>
                {PIPELINE_STAGES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.filterChoicePill, filters.stage === s && styles.filterChoicePillActive]}
                    onPress={() => setFilters(prev => ({ ...prev, stage: prev.stage === s ? '' : s }))}
                  >
                    <Text style={[styles.filterChoiceText, filters.stage === s && styles.filterChoiceTextActive]}>
                      {STAGE_CONFIG[s]?.short || s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Deal Priority */}
              <Text style={styles.filterGroupTitle}>Deal Priority</Text>
              <View style={styles.filterOptionsGrid}>
                {['hot', 'warm', 'cold'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.filterChoicePill, filters.priority === p && styles.filterChoicePillActive]}
                    onPress={() => setFilters(prev => ({ ...prev, priority: prev.priority === p ? '' : p }))}
                  >
                    <Text style={[styles.filterChoiceText, filters.priority === p && styles.filterChoiceTextActive]}>
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Project */}
              {projects.length > 0 && (
                <>
                  <Text style={styles.filterGroupTitle}>Project</Text>
                  <View style={styles.filterOptionsGrid}>
                    {projects.map((proj) => (
                      <TouchableOpacity
                        key={proj.id}
                        style={[styles.filterChoicePill, filters.project_id === proj.id && styles.filterChoicePillActive]}
                        onPress={() => setFilters(prev => ({ ...prev, project_id: prev.project_id === proj.id ? '' : proj.id }))}
                      >
                        <Text style={[styles.filterChoiceText, filters.project_id === proj.id && styles.filterChoiceTextActive]}>
                          {proj.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.filterModalFooter}>
              <TouchableOpacity style={styles.filterClearBtn} onPress={clearAllFilters}>
                <Text style={styles.filterClearBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterApplyBtn}
                onPress={() => {
                  setShowFilterModal(false);
                  loadLeads();
                }}
              >
                <Text style={styles.filterApplyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Super Admin Import Modal ── */}
      <Modal visible={showImportModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !importing && setShowImportModal(false)}
        >
          <View style={styles.importModalCard}>
            <View style={styles.filterModalHeader}>
              <View>
                <Text style={styles.filterModalTitle}>Import XL / CSV Leads</Text>
                <Text style={styles.importModalSubtitle}>Super Admin Data Import Tool</Text>
              </View>
              <TouchableOpacity onPress={() => setShowImportModal(false)} disabled={importing}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.importFormatHint}>
              Format each line as:{'\n'}
              <Text style={{ fontWeight: '700', color: theme.primary }}>
                Name, Phone, Email, Configuration, Budget
              </Text>
            </Text>

            {/* Choose File from Device System */}
            <TouchableOpacity
              style={styles.filePickerBtn}
              onPress={handlePickFile}
              disabled={importing}
              activeOpacity={0.8}
            >
              <Ionicons name="folder-open-outline" size={20} color={theme.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.filePickerBtnTitle} numberOfLines={1}>
                  {selectedFileMeta ? selectedFileMeta.name : 'Choose File from Device Storage'}
                </Text>
                <Text style={styles.filePickerBtnSub}>
                  {selectedFileMeta
                    ? `${Math.round((selectedFileMeta.size || 0) / 1024)} KB · Tap to change file`
                    : 'Select .CSV, .XLSX or .TXT file from files or downloads'}
                </Text>
              </View>
              <Ionicons name="cloud-upload-outline" size={18} color={theme.accent} />
            </TouchableOpacity>

            <View style={styles.orDividerRow}>
              <View style={styles.orDividerLine} />
              <Text style={styles.orDividerText}>OR PASTE / EDIT CSV DATA</Text>
              <View style={styles.orDividerLine} />
            </View>

            <TextInput
              style={styles.importTextInput}
              placeholder="Paste comma-separated rows or tap sample template below..."
              placeholderTextColor={theme.textMuted}
              value={importCsvText}
              onChangeText={setImportCsvText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!importing}
            />

            <TouchableOpacity
              style={styles.templateBtn}
              onPress={handlePasteTemplate}
              disabled={importing}
            >
              <Ionicons name="document-text-outline" size={14} color={theme.primary} />
              <Text style={styles.templateBtnText}>Load Sample Rows</Text>
            </TouchableOpacity>

            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.filterClearBtn}
                onPress={() => setShowImportModal(false)}
                disabled={importing}
              >
                <Text style={styles.filterClearBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterApplyBtn}
                onPress={handleImportSubmit}
                disabled={importing}
              >
                {importing ? (
                  <ActivityIndicator color={theme.textInverse} size="small" />
                ) : (
                  <Text style={styles.filterApplyBtnText}>Import Leads</Text>
                )}
              </TouchableOpacity>
            </View>
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
    adminActionBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.surface2,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addLeadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: Radius.md,
      gap: 4,
    },
    addLeadBtnText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: theme.textInverse,
    },
    queueTabBar: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: 8,
    },
    queueTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: Radius.md,
      backgroundColor: theme.surface2,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 6,
    },
    queueTabActive: {
      backgroundColor: `${theme.primary}15`,
      borderColor: theme.primary,
    },
    queueTabText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    queueTabTextActive: {
      color: theme.primary,
      fontWeight: '800',
    },
    queueCountBadge: {
      backgroundColor: theme.surface,
      borderRadius: Radius.full,
      paddingHorizontal: 6,
      paddingVertical: 1,
      minWidth: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    queueCountBadgeActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    queueCountBadgeWarning: {
      backgroundColor: `${theme.warning}25`,
      borderColor: theme.warning,
    },
    queueCountText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    queueCountTextActive: {
      color: theme.textInverse,
    },
    queueCountTextWarning: {
      color: theme.warning,
    },
    searchBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 10,
    },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: Radius.md,
      paddingHorizontal: 12,
      height: 40,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: theme.textPrimary,
      paddingVertical: 0,
    },
    clearSearchBtn: {
      padding: 4,
    },
    filterBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    filterBtnActive: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}15`,
    },
    filterDot: {
      position: 'absolute',
      top: 7,
      right: 7,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.primary,
    },
    presetCarouselWrapper: {
      marginBottom: 8,
    },
    presetScroll: {
      paddingHorizontal: 16,
      gap: 6,
    },
    presetChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.border,
    },
    presetChipActive: {
      backgroundColor: `${theme.primary}15`,
      borderColor: theme.primary,
    },
    presetText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    presetTextActive: {
      color: theme.primary,
      fontWeight: '800',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    loadingCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    loadingText: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 20,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
      marginTop: 14,
    },
    emptySub: {
      fontSize: 12.5,
      color: theme.textSecondary,
      marginTop: 6,
      textAlign: 'center',
      lineHeight: 18,
    },
    resetFiltersBtn: {
      marginTop: 16,
      backgroundColor: theme.surface2,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    resetFiltersBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    filterModalCard: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      padding: 18,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    importModalCard: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      padding: 18,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      maxHeight: '80%',
    },
    importModalSubtitle: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 2,
    },
    importFormatHint: {
      fontSize: 12,
      color: theme.textSecondary,
      backgroundColor: theme.surface2,
      padding: 10,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
      lineHeight: 18,
    },
    importTextInput: {
      backgroundColor: theme.surface2,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      fontSize: 12.5,
      color: theme.textPrimary,
      minHeight: 110,
      marginBottom: 10,
    },
    templateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: Radius.sm,
      backgroundColor: `${theme.primary}12`,
      marginBottom: 12,
    },
    templateBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: theme.primary,
    },
    filterModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginBottom: 12,
    },
    filterModalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    filterGroupTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 12,
      marginBottom: 8,
    },
    filterOptionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    filterChoicePill: {
      backgroundColor: theme.surface2,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterChoicePillActive: {
      backgroundColor: `${theme.primary}15`,
      borderColor: theme.primary,
    },
    filterChoiceText: {
      fontSize: 11.5,
      color: theme.textSecondary,
    },
    filterChoiceTextActive: {
      fontWeight: '700',
      color: theme.primary,
    },
    filterModalFooter: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    filterClearBtn: {
      flex: 1,
      backgroundColor: theme.surface2,
      paddingVertical: 11,
      borderRadius: Radius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterClearBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    filterApplyBtn: {
      flex: 2,
      backgroundColor: theme.primary,
      paddingVertical: 11,
      borderRadius: Radius.md,
      alignItems: 'center',
    },
    filterApplyBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.textInverse,
    },
    filePickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.surface2,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: `${theme.accent}60`,
      borderRadius: Radius.md,
      padding: 12,
      marginBottom: 10,
    },
    filePickerBtnTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    filePickerBtnSub: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    orDividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginVertical: 6,
    },
    orDividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    orDividerText: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.textMuted,
      letterSpacing: 0.5,
    },
  });
}
