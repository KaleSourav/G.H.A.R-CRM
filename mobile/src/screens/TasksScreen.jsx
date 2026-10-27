import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { tasksAPI, useAutoRefresh } from '../services/api';
import { Radius, Typography, Shadow } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { TASK_TYPES } from '../utils/constants';
import { formatDateTime, isOverdue } from '../utils/helpers';
import AppHeader from '../components/AppHeader';

export default function TasksScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'overdue' | 'today' | 'upcoming' | 'completed'

  const loadTasks = useCallback(async () => {
    try {
      const res = await tasksAPI.list({ limit: 150 });
      const data = res?.data || res || {};
      const rawTasks = data.tasks || (Array.isArray(data) ? data : []);
      const normalized = rawTasks.map(t => ({
        ...t,
        completed: t.completed !== undefined ? t.completed : t.status === 'completed',
      }));
      setTasks(normalized);
    } catch (err) {
      console.error('[TasksScreen] load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  // Auto-refresh instantly on any mutation broadcast
  useAutoRefresh(loadTasks);

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const handleToggleCompleted = async (task) => {
    const isCompleted = task.completed !== undefined ? task.completed : task.status === 'completed';
    const newCompleted = !isCompleted;
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted, status: newCompleted ? 'completed' : 'pending' } : t));

    try {
      await tasksAPI.update(task.id, { 
        status: newCompleted ? 'completed' : 'pending',
        completed: newCompleted,
      });
    } catch (err) {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: isCompleted, status: isCompleted ? 'completed' : 'pending' } : t));
      Alert.alert('Error', 'Failed to update task');
    }
  };

  // Filter computations
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const overdueTasks = tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) < now);
  const todayTasks = tasks.filter(t => !t.completed && t.due_date && t.due_date.slice(0, 10) === todayStr);
  const upcomingTasks = tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) > now && t.due_date.slice(0, 10) !== todayStr);
  const completedTasks = tasks.filter(t => t.completed);

  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'overdue') return !t.completed && t.due_date && new Date(t.due_date) < now;
    if (activeFilter === 'today') return !t.completed && t.due_date && t.due_date.slice(0, 10) === todayStr;
    if (activeFilter === 'upcoming') return !t.completed && t.due_date && new Date(t.due_date) > now && t.due_date.slice(0, 10) !== todayStr;
    if (activeFilter === 'completed') return t.completed;
    return true;
  });

  return (
    <View style={styles.container}>
      <AppHeader
        title="Task Center"
        subtitle="Follow-ups & Schedules"
        rightAction={
          <TouchableOpacity
            style={styles.addTaskTopBtn}
            onPress={() => navigation.navigate('TaskCreate')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={17} color={theme.bg} />
            <Text style={styles.addTaskTopBtnText}>New Task</Text>
          </TouchableOpacity>
        }
        navigation={navigation}
      />

      {/* Task Center Metrics Strip */}
      <View style={styles.metricsStrip}>
        <TouchableOpacity
          style={[styles.metricBox, activeFilter === 'overdue' && styles.metricBoxActive]}
          onPress={() => setActiveFilter('overdue')}
          activeOpacity={0.8}
        >
          <Text style={[styles.metricCount, { color: theme.error }]}>{overdueTasks.length}</Text>
          <Text style={styles.metricLabel}>Overdue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.metricBox, activeFilter === 'today' && styles.metricBoxActive]}
          onPress={() => setActiveFilter('today')}
          activeOpacity={0.8}
        >
          <Text style={[styles.metricCount, { color: theme.primary }]}>{todayTasks.length}</Text>
          <Text style={styles.metricLabel}>Due Today</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.metricBox, activeFilter === 'upcoming' && styles.metricBoxActive]}
          onPress={() => setActiveFilter('upcoming')}
          activeOpacity={0.8}
        >
          <Text style={[styles.metricCount, { color: theme.info }]}>{upcomingTasks.length}</Text>
          <Text style={styles.metricLabel}>Upcoming</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.metricBox, activeFilter === 'completed' && styles.metricBoxActive]}
          onPress={() => setActiveFilter('completed')}
          activeOpacity={0.8}
        >
          <Text style={[styles.metricCount, { color: theme.success }]}>{completedTasks.length}</Text>
          <Text style={styles.metricLabel}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {[
          { id: 'all', label: 'All Tasks' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'today', label: 'Today' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'completed', label: 'Done' },
        ].map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, activeFilter === f.id && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === f.id && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={styles.loaderText}>Loading scheduled tasks...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
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
            const taskIsOverdue = !item.completed && item.due_date && isOverdue(item.due_date);
            const typeConfig = TASK_TYPES.find(t => t.value === item.type) || {
              label: item.type || 'Task',
              icon: 'checkbox-outline',
            };

            return (
              <View style={[styles.taskCard, item.completed && styles.taskCardDone]}>
                {/* Instant Checkbox */}
                <TouchableOpacity
                  style={[styles.checkbox, item.completed && styles.checkboxChecked]}
                  onPress={() => handleToggleCompleted(item)}
                  activeOpacity={0.7}
                >
                  {item.completed && <Ionicons name="checkmark" size={15} color={theme.bg} />}
                </TouchableOpacity>

                <View style={styles.taskBody}>
                  {/* Title & Type Badge */}
                  <View style={styles.taskTitleRow}>
                    <Text
                      style={[styles.taskTitle, item.completed && styles.taskTitleDone]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.typeBadge}>
                      <Ionicons name={typeConfig.icon} size={11} color={theme.textSecondary} />
                      <Text style={styles.typeBadgeText}>{typeConfig.label}</Text>
                    </View>
                  </View>

                  {/* Description if present */}
                  {item.description ? (
                    <Text style={styles.taskDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Bottom Meta Row: Due date + Linked lead */}
                  <View style={styles.taskMetaRow}>
                    <View style={[styles.dueBadge, taskIsOverdue && styles.dueBadgeOverdue]}>
                      <Ionicons
                        name="time-outline"
                        size={11}
                        color={taskIsOverdue ? theme.error : theme.textMuted}
                      />
                      <Text style={[styles.dueText, taskIsOverdue && styles.dueTextOverdue]}>
                        {item.due_date ? formatDateTime(item.due_date) : 'No due date'}
                      </Text>
                    </View>

                    {item.lead && (
                      <TouchableOpacity
                        style={styles.leadChip}
                        onPress={() => navigation.navigate('LeadDetail', { leadId: item.lead.id || item.lead_id })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="person-outline" size={11} color={theme.primary} />
                        <Text style={styles.leadChipText} numberOfLines={1}>
                          {item.lead.name || 'Lead'}
                        </Text>
                        <Ionicons name="chevron-forward" size={10} color={theme.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="checkmark-done-circle-outline" size={38} color={theme.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySubtitle}>
                No tasks in this category. Schedule new customer follow-ups and site visits easily.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    addTaskTopBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.md,
    },
    addTaskTopBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.bg,
    },
    metricsStrip: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: 8,
    },
    metricBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface2,
      paddingVertical: 8,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    metricBoxActive: {
      borderColor: theme.primary,
      backgroundColor: 'rgba(232, 160, 32, 0.1)',
    },
    metricCount: {
      fontSize: 17,
      fontWeight: '800',
    },
    metricLabel: {
      fontSize: 10.5,
      fontWeight: '600',
      color: theme.textSecondary,
      marginTop: 2,
    },
    filterTabsRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    filterChip: {
      backgroundColor: theme.surface,
      paddingHorizontal: 10,
      paddingVertical: 5.5,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterChipActive: {
      backgroundColor: 'rgba(232, 160, 32, 0.15)',
      borderColor: theme.primary,
    },
    filterChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    filterChipTextActive: {
      fontWeight: '700',
      color: theme.primary,
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
      paddingHorizontal: 12,
      paddingBottom: 30,
    },
    taskCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: 12,
      marginBottom: 9,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    taskCardDone: {
      opacity: 0.55,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.8,
      borderColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
    },
    taskBody: {
      flex: 1,
    },
    taskTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    taskTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: theme.textPrimary,
      flex: 1,
      lineHeight: 18,
    },
    taskTitleDone: {
      textDecorationLine: 'line-through',
      color: theme.textMuted,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.surface2,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.xs,
    },
    typeBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    taskDesc: {
      fontSize: 11.5,
      color: theme.textSecondary,
      marginTop: 4,
      lineHeight: 16,
    },
    taskMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    dueBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dueBadgeOverdue: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.xs,
    },
    dueText: {
      fontSize: 11,
      color: theme.textMuted,
    },
    dueTextOverdue: {
      color: theme.error,
      fontWeight: '700',
    },
    leadChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(232, 160, 32, 0.1)',
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: Radius.xs,
    },
    leadChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
      maxWidth: 100,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
      paddingHorizontal: 24,
    },
    emptyIconBox: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
}
