import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Switch,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getInitials } from '../utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';

function SettingRow({ icon, label, subtitle, onPress, value, danger, color, rightElement, theme }) {
  const iconColor = danger ? theme.error : (color || theme.primary);
  return (
    <TouchableOpacity
      style={[s_row.row, { borderBottomColor: theme.borderLight }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[s_row.rowIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={s_row.rowContent}>
        <Text style={[s_row.rowLabel, { color: danger ? theme.error : theme.textPrimary }]}>{label}</Text>
        {subtitle && <Text style={[s_row.rowSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      {value && <Text style={[s_row.rowValue, { color: theme.textMuted }]}>{value}</Text>}
      {rightElement ? rightElement : (
        onPress && <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const s_row = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 13.5, fontWeight: '700' },
  rowSubtitle: { fontSize: 11, marginTop: 2 },
  rowValue: { fontSize: 12, fontWeight: '600', marginRight: 8 },
});

export default function SettingsScreen({ navigation }) {
  const { user, signOut, isSuperAdmin, isAdmin, isManager } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(theme);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of G.H.A.R CRM?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const roleLabel = () => {
    if (isSuperAdmin) return 'Super Admin (Founder)';
    if (isAdmin) return 'Admin';
    if (isManager) return 'Sales Manager';
    return user?.role?.replace(/_/g, ' ') || 'Sales Executive';
  };

  const initials = getInitials(user?.name || user?.email);

  return (
    <View style={styles.container}>
      <AppHeader
        showBack
        onBack={() => navigation.goBack()}
        title="Settings & Account"
        subtitle="Profile & Preferences"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile Card ───────────────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Partner'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.rolePill}>
              <Ionicons name="shield-checkmark-outline" size={10} color={theme.primary} style={{ marginRight: 4 }} />
              <Text style={styles.rolePillText}>{roleLabel()}</Text>
            </View>
          </View>
        </View>

        {/* ── Appearance ──────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.card}>
          <SettingRow
            theme={theme}
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            label={isDark ? 'Dark Mode' : 'Light Mode'}
            subtitle={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            color={isDark ? theme.purple : theme.warning}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.surface3, true: `${theme.primary}60` }}
                thumbColor={isDark ? theme.primary : theme.textMuted}
                ios_backgroundColor={theme.surface3}
              />
            }
          />
        </View>

        {/* ── Workspace Tools ─────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>WORKSPACE TOOLS</Text>
        <View style={styles.card}>
          <SettingRow
            theme={theme}
            icon="business-outline"
            label="Master Inventory & Projects"
            subtitle="Browse all registered developments"
            onPress={() => navigation.navigate('Projects')}
            color={theme.primary}
          />
          {(isAdmin || isSuperAdmin || isManager) && (
            <SettingRow
              theme={theme}
              icon="people-outline"
              label="Team Directory"
              subtitle="Sales managers & executives"
              onPress={() => navigation.navigate('Team')}
              color={theme.accent}
            />
          )}
        </View>

        {/* ── About Application ───────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ABOUT APPLICATION</Text>
        <View style={styles.card}>
          <SettingRow
            theme={theme}
            icon="home-outline"
            label="G.H.A.R Real Estate CRM"
            subtitle="Gem Homes Advisory & Realtors"
            value="v1.0"
            color={theme.success}
          />
          <SettingRow
            theme={theme}
            icon="phone-portrait-outline"
            label="Mobile Platform"
            value="Expo React Native"
            color={theme.info}
          />
        </View>

        {/* ── Session ─────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>SESSION</Text>
        <View style={styles.card}>
          <SettingRow
            theme={theme}
            icon="log-out-outline"
            label="Sign Out"
            subtitle="End current session on this device"
            onPress={handleSignOut}
            danger
          />
        </View>

        <Text style={styles.footer}>
          G.H.A.R Real Estate CRM · Mobile Suite{'\n'}Gem Homes Advisory & Realtors
        </Text>
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
    scroll: {
      padding: 14,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: theme.isDark ? 0.3 : 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    profileAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.isDark ? theme.surface2 : theme.primaryLight,
      borderWidth: 2,
      borderColor: theme.borderAccent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    profileAvatarText: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.primary,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 17,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    profileEmail: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    rolePill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      marginTop: 6,
    },
    rolePillText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: theme.primary,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 18,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.2 : 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    footer: {
      textAlign: 'center',
      fontSize: 11,
      color: theme.textMuted,
      lineHeight: 16,
      marginTop: 10,
      marginBottom: 30,
    },
  });
}
