import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Modal, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { projectsAPI, useAutoRefresh } from '../services/api';
import { Radius, Typography, Shadow } from '../theme/tokens';
import { formatCurrency } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';

export default function ProjectsScreen({ navigation }) {
  const { isSuperAdmin } = useAuth();
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Property Detail Modal (Request 12)
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Super Admin Edit Price Modal (Request 12)
  const [showEditPriceModal, setShowEditPriceModal] = useState(false);
  const [editPriceMin, setEditPriceMin] = useState('');
  const [editPriceMax, setEditPriceMax] = useState('');
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // Super Admin Add Property Modal (Request 12)
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDeveloper, setAddDeveloper] = useState('');
  const [addLocation, setAddLocation] = useState('');
  const [addPriceMin, setAddPriceMin] = useState('');
  const [addPriceMax, setAddPriceMax] = useState('');
  const [addTotalUnits, setAddTotalUnits] = useState('');
  const [addAvailableUnits, setAddAvailableUnits] = useState('');
  const [addConfigs, setAddConfigs] = useState('2 BHK, 3 BHK, 4 BHK');
  const [addingProperty, setAddingProperty] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const res = await projectsAPI.list();
      const list = res?.data || (Array.isArray(res) ? res : []);
      setProjects(list);
    } catch (err) {
      console.error('[ProjectsScreen] load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects])
  );

  // Auto-refresh instantly on any mutation broadcast
  useAutoRefresh(loadProjects);

  const onRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  const handleOpenDetail = (proj) => {
    setSelectedProject(proj);
    setEditPriceMin(proj.price_min ? String(proj.price_min) : '');
    setEditPriceMax(proj.price_max ? String(proj.price_max) : '');
    setShowDetailModal(true);
  };

  // ── Super Admin Save Price Edit ──────────────────────────────────────────
  const handleSavePriceEdit = async () => {
    if (!selectedProject || !isSuperAdmin) return;
    setUpdatingPrice(true);
    try {
      const minNum = editPriceMin ? Number(editPriceMin.replace(/\D/g, '')) : undefined;
      const maxNum = editPriceMax ? Number(editPriceMax.replace(/\D/g, '')) : undefined;

      await projectsAPI.update(selectedProject.id, {
        price_min: minNum,
        price_max: maxNum,
      });

      // Update local state
      const updated = { ...selectedProject, price_min: minNum, price_max: maxNum };
      setSelectedProject(updated);
      setProjects(prev => prev.map(p => p.id === selectedProject.id ? updated : p));
      setShowEditPriceModal(false);

      Alert.alert('Price Updated', 'Property price range updated successfully.');
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Could not update property price.');
    } finally {
      setUpdatingPrice(false);
    }
  };

  // ── Super Admin Add Property ─────────────────────────────────────────────
  const handleAddPropertySubmit = async () => {
    if (!addName.trim()) {
      Alert.alert('Missing Field', 'Please enter property name.');
      return;
    }

    setAddingProperty(true);
    try {
      const minNum = addPriceMin ? Number(addPriceMin.replace(/\D/g, '')) : undefined;
      const maxNum = addPriceMax ? Number(addPriceMax.replace(/\D/g, '')) : undefined;
      const totalNum = addTotalUnits ? Number(addTotalUnits.replace(/\D/g, '')) : 50;
      const availNum = addAvailableUnits ? Number(addAvailableUnits.replace(/\D/g, '')) : totalNum;

      const configList = addConfigs ? addConfigs.split(',').map(s => s.trim()) : ['2 BHK', '3 BHK'];
      await projectsAPI.create({
        name: addName.trim(),
        developer: addDeveloper.trim() || undefined,
        developer_name: addDeveloper.trim() || undefined,
        location: addLocation.trim() || undefined,
        price_min: minNum,
        price_max: maxNum,
        total_units: totalNum,
        available_units: availNum,
        amenities: configList,
        configurations: configList,
        status: 'active',
      });

      setShowAddPropertyModal(false);
      setAddName('');
      setAddDeveloper('');
      setAddLocation('');
      setAddPriceMin('');
      setAddPriceMax('');
      setAddTotalUnits('');
      setAddAvailableUnits('');
      loadProjects();

      Alert.alert('Property Added', 'New real estate property added to inventory.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create property.');
    } finally {
      setAddingProperty(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.location?.toLowerCase().includes(term) ||
      p.developer?.toLowerCase().includes(term)
    );
  });

  const totalInventory = projects.reduce((acc, p) => acc + (p.total_units || 0), 0);
  const availableInventory = projects.reduce((acc, p) => acc + (p.available_units || 0), 0);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Master Inventory"
        subtitle="Active Residential & Commercial Projects"
        navigation={navigation}
        rightAction={
          isSuperAdmin ? (
            <TouchableOpacity
              style={styles.addPropertyBtn}
              onPress={() => setShowAddPropertyModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color={theme.textInverse} />
              <Text style={styles.addPropertyBtnText}>Add Property</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Inventory Stat Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryNumber}>{projects.length}</Text>
          <Text style={styles.summaryLabel}>Projects</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCol}>
          <Text style={styles.summaryNumber}>{availableInventory}</Text>
          <Text style={styles.summaryLabel}>Units Available</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCol}>
          <Text style={styles.summaryNumber}>{totalInventory}</Text>
          <Text style={styles.summaryLabel}>Total Capacity</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects, location, developer..."
            placeholderTextColor={theme.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Projects List */}
      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={styles.loaderText}>Loading inventory portfolio...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
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
          renderItem={({ item }) => {
            const total = item.total_units || 0;
            const available = item.available_units ?? total;
            const percentAvailable = total > 0 ? Math.round((available / total) * 100) : 0;
            const isSoldOut = total > 0 && available === 0;

            return (
              <TouchableOpacity
                style={styles.projectCard}
                onPress={() => handleOpenDetail(item)}
                activeOpacity={0.82}
              >
                {/* Header: Name + Status */}
                <View style={styles.projectHeader}>
                  <View style={styles.projectNameCol}>
                    <Text style={styles.projectName}>{item.name}</Text>
                    {item.developer ? (
                      <Text style={styles.developerName}>by {item.developer}</Text>
                    ) : null}
                  </View>

                  <View style={[styles.statusBadge, isSoldOut && styles.statusBadgeSoldOut]}>
                    <Text style={[styles.statusBadgeText, isSoldOut && styles.statusBadgeTextSoldOut]}>
                      {isSoldOut ? 'Sold Out' : (item.status || 'Active')}
                    </Text>
                  </View>
                </View>

                {/* Location */}
                {item.location ? (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={13} color={theme.textSecondary} />
                    <Text style={styles.locationText}>{item.location}</Text>
                  </View>
                ) : null}

                {/* Units Availability Bar */}
                <View style={styles.availabilityBox}>
                  <View style={styles.availabilityLabels}>
                    <Text style={styles.availTextLeft}>
                      <Text style={{ fontWeight: '800', color: theme.textPrimary }}>{available}</Text>
                      {' '}of {total} Units Available
                    </Text>
                    <Text style={styles.availTextRight}>{percentAvailable}% Open</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(percentAvailable, 100)}%`,
                          backgroundColor: percentAvailable > 20 ? theme.success : theme.warning,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Pricing & Configurations Row */}
                <View style={styles.bottomMetaRow}>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceLabel}>Price Range</Text>
                    <Text style={styles.priceValue}>
                      {item.price_min ? formatCurrency(item.price_min) : '—'}
                      {item.price_max ? ` - ${formatCurrency(item.price_max)}` : ''}
                    </Text>
                  </View>

                  {item.configurations && (
                    <View style={styles.configsRow}>
                      {(Array.isArray(item.configurations) ? item.configurations : String(item.configurations).split(','))
                        .slice(0, 3)
                        .map((c, i) => (
                          <View key={i} style={styles.configChip}>
                            <Text style={styles.configChipText}>{String(c).trim()}</Text>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="business-outline" size={36} color={theme.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Projects Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchTerm ? 'No projects match your search.' : 'No inventory projects configured yet.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Property Detail & Specification Modal (Request 12) ── */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDetailModal(false)}>
          <View style={styles.detailModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailModalTitle}>{selectedProject?.name}</Text>
                <Text style={styles.detailModalSubtitle}>
                  {selectedProject?.developer ? `By ${selectedProject.developer} · ` : ''}{selectedProject?.location || 'Prime Location'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Pricing Row with Super Admin Edit Button */}
              <View style={styles.detailPriceCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailPriceLabel}>Pricing Structure</Text>
                  <Text style={styles.detailPriceAmount}>
                    {selectedProject?.price_min ? formatCurrency(selectedProject.price_min) : 'Price on Request'}
                    {selectedProject?.price_max ? ` - ${formatCurrency(selectedProject.price_max)}` : ''}
                  </Text>
                </View>

                {isSuperAdmin && (
                  <TouchableOpacity
                    style={styles.editPriceBtn}
                    onPress={() => setShowEditPriceModal(true)}
                  >
                    <Ionicons name="pencil" size={13} color={theme.primary} />
                    <Text style={styles.editPriceBtnText}>Edit Price</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* BHK Configurations Breakdown */}
              <Text style={styles.sectionHeading}>UNIT CONFIGURATIONS & BHK SPECS</Text>
              <View style={styles.bhkGrid}>
                {[
                  { bhk: '1 BHK', area: '450 - 550 sq.ft', price: '₹45 L - 55 L' },
                  { bhk: '2 BHK', area: '750 - 920 sq.ft', price: '₹68 L - 85 L' },
                  { bhk: '3 BHK', area: '1,200 - 1,450 sq.ft', price: '₹1.15 Cr - 1.45 Cr' },
                  { bhk: '4 BHK / Villa', area: '2,100 - 3,200 sq.ft', price: '₹2.20 Cr - 3.50 Cr' },
                ].map((spec, idx) => (
                  <View key={idx} style={styles.bhkCard}>
                    <View style={styles.bhkCardTop}>
                      <Ionicons name="home-outline" size={16} color={theme.accent} />
                      <Text style={styles.bhkTitle}>{spec.bhk}</Text>
                    </View>
                    <Text style={styles.bhkArea}>{spec.area}</Text>
                    <Text style={styles.bhkPrice}>{spec.price}</Text>
                  </View>
                ))}
              </View>

              {/* ── Images Section (Request 12) ── */}
              <Text style={styles.sectionHeading}>PROPERTY SHOWCASE & IMAGES</Text>
              <View style={styles.imageGalleryNotice}>
                <Ionicons name="images-outline" size={18} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.imageGalleryNoticeTitle}>Image Gallery Showcase</Text>
                  <Text style={styles.imageGalleryNoticeSub}>
                    High-resolution layout plans, elevations, and sample flat visuals slot.
                  </Text>
                </View>
              </View>

              {/* Image Placeholder Preview Cards */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageCardsScroll}>
                {[
                  { label: 'Exterior Elevation', icon: 'business-outline' },
                  { label: 'Living Room Flat', icon: 'easel-outline' },
                  { label: 'Master Bedroom', icon: 'bed-outline' },
                  { label: 'Master Floor Plan', icon: 'map-outline' },
                ].map((slot, i) => (
                  <View key={i} style={styles.imageSlotCard}>
                    <Ionicons name={slot.icon} size={28} color={theme.primary} />
                    <Text style={styles.imageSlotLabel}>{slot.label}</Text>
                    <View style={styles.imageSlotBadge}>
                      <Text style={styles.imageSlotBadgeText}>Ready for link</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Super Admin Edit Price Modal (Request 12) ── */}
      <Modal visible={showEditPriceModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlayCenter} activeOpacity={1} onPress={() => setShowEditPriceModal(false)}>
          <View style={styles.priceModalCard}>
            <Text style={styles.modalTitle}>Edit Property Price</Text>
            <Text style={styles.modalSubtitle}>Update price range for {selectedProject?.name}</Text>

            <View style={{ gap: 12, marginVertical: 16 }}>
              <View>
                <Text style={styles.fieldLabel}>Starting Price (Min INR)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. 6500000 (65 Lakhs)"
                  placeholderTextColor={theme.textMuted}
                  value={editPriceMin}
                  onChangeText={setEditPriceMin}
                  keyboardType="numeric"
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Maximum Price (Max INR)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. 12500000 (1.25 Cr)"
                  placeholderTextColor={theme.textMuted}
                  value={editPriceMax}
                  onChangeText={setEditPriceMax}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditPriceModal(false)} disabled={updatingPrice}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSavePriceEdit} disabled={updatingPrice}>
                {updatingPrice ? (
                  <ActivityIndicator color={theme.textInverse} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Price</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Super Admin Add Property Modal (Request 12) ── */}
      <Modal visible={showAddPropertyModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => !addingProperty && setShowAddPropertyModal(false)}>
          <View style={styles.addPropertyModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Real Estate Property</Text>
                <Text style={styles.modalSubtitle}>Super Admin Manual Inventory Entry</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddPropertyModal(false)} disabled={addingProperty}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Property Name <Text style={{ color: theme.error }}>*</Text></Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Godrej Woods"
                  placeholderTextColor={theme.textMuted}
                  value={addName}
                  onChangeText={setAddName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Developer / Builder</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Godrej Properties"
                  placeholderTextColor={theme.textMuted}
                  value={addDeveloper}
                  onChangeText={setAddDeveloper}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Location</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Sector 43, Noida"
                  placeholderTextColor={theme.textMuted}
                  value={addLocation}
                  onChangeText={setAddLocation}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Starting Price</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Min INR"
                    placeholderTextColor={theme.textMuted}
                    value={addPriceMin}
                    onChangeText={setAddPriceMin}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Max Price</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Max INR"
                    placeholderTextColor={theme.textMuted}
                    value={addPriceMax}
                    onChangeText={setAddPriceMax}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Total Units</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. 100"
                    placeholderTextColor={theme.textMuted}
                    value={addTotalUnits}
                    onChangeText={setAddTotalUnits}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Available Units</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. 45"
                    placeholderTextColor={theme.textMuted}
                    value={addAvailableUnits}
                    onChangeText={setAddAvailableUnits}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={[styles.formGroup, { marginTop: 10 }]}>
                <Text style={styles.fieldLabel}>BHK Configurations (comma separated)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="2 BHK, 3 BHK, 4 BHK"
                  placeholderTextColor={theme.textMuted}
                  value={addConfigs}
                  onChangeText={setAddConfigs}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddPropertyModal(false)} disabled={addingProperty}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddPropertySubmit} disabled={addingProperty}>
                {addingProperty ? (
                  <ActivityIndicator color={theme.textInverse} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Add Property</Text>
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
    addPropertyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.md,
      gap: 4,
    },
    addPropertyBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.textInverse,
    },
    summaryBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    summaryCol: {
      flex: 1,
      alignItems: 'center',
    },
    summaryNumber: {
      fontSize: 17,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    summaryLabel: {
      fontSize: 10.5,
      color: theme.textSecondary,
      marginTop: 2,
    },
    summaryDivider: {
      width: 1,
      height: 24,
      backgroundColor: theme.border,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    searchBox: {
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
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    projectCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 10,
    },
    projectHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    projectNameCol: {
      flex: 1,
      marginRight: 8,
    },
    projectName: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    developerName: {
      fontSize: 11.5,
      color: theme.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      backgroundColor: `${theme.success}18`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: `${theme.success}35`,
    },
    statusBadgeSoldOut: {
      backgroundColor: `${theme.error}18`,
      borderColor: `${theme.error}35`,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.success,
    },
    statusBadgeTextSoldOut: {
      color: theme.error,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 10,
    },
    locationText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    availabilityBox: {
      backgroundColor: theme.surface2,
      padding: 10,
      borderRadius: Radius.md,
      marginBottom: 10,
    },
    availabilityLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    availTextLeft: {
      fontSize: 11.5,
      color: theme.textSecondary,
    },
    availTextRight: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    progressTrack: {
      height: 5,
      borderRadius: 2.5,
      backgroundColor: theme.surface,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2.5,
    },
    bottomMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingTop: 8,
    },
    priceCol: {
      flex: 1,
    },
    priceLabel: {
      fontSize: 10,
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    priceValue: {
      fontSize: 12.5,
      fontWeight: '700',
      color: theme.primary,
      marginTop: 1,
    },
    configsRow: {
      flexDirection: 'row',
      gap: 4,
    },
    configChip: {
      backgroundColor: theme.surface2,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    configChipText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
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
    },
    emptySubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
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
    detailModalCard: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      padding: 18,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      maxHeight: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginBottom: 12,
    },
    detailModalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    detailModalSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    detailPriceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface2,
      padding: 14,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 14,
    },
    detailPriceLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textMuted,
      textTransform: 'uppercase',
    },
    detailPriceAmount: {
      fontSize: 17,
      fontWeight: '800',
      color: theme.primary,
      marginTop: 2,
    },
    editPriceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: theme.borderAccent,
      backgroundColor: `${theme.primary}12`,
    },
    editPriceBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.textMuted,
      letterSpacing: 0.6,
      marginTop: 10,
      marginBottom: 8,
    },
    bhkGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    bhkCard: {
      width: '48.5%',
      backgroundColor: theme.surface2,
      borderRadius: Radius.md,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    bhkCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    bhkTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    bhkArea: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    bhkPrice: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.accent,
      marginTop: 4,
    },
    imageGalleryNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: `${theme.primary}12`,
      padding: 10,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.borderAccent,
      marginBottom: 10,
    },
    imageGalleryNoticeTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: theme.primary,
    },
    imageGalleryNoticeSub: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 1,
    },
    imageCardsScroll: {
      gap: 10,
      paddingBottom: 20,
    },
    imageSlotCard: {
      width: 140,
      height: 110,
      borderRadius: Radius.md,
      backgroundColor: theme.surface2,
      borderWidth: 1,
      borderColor: theme.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
    },
    imageSlotLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textPrimary,
      textAlign: 'center',
      marginTop: 6,
    },
    imageSlotBadge: {
      backgroundColor: `${theme.primary}15`,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.xs,
      marginTop: 4,
    },
    imageSlotBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.primary,
    },
    priceModalCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    modalSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 6,
    },
    fieldInput: {
      backgroundColor: theme.surface2,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: theme.textPrimary,
    },
    modalActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
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
    addPropertyModalCard: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      padding: 18,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      maxHeight: '85%',
    },
    formGroup: {
      marginBottom: 12,
    },
  });
}
