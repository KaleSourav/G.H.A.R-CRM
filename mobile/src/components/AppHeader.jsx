import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { getInitials } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  navigation,
}) {
  const { user, assignedStats } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [unreadCount, setUnreadCount] = React.useState(0);

  const reloadNotifications = React.useCallback(() => {
    import('../services/api').then(({ authAPI }) => {
      authAPI.notifications().then(res => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        const unread = list.filter(n => !n.read).length;
        setUnreadCount(unread || assignedStats?.newAssignedCount || 0);
      }).catch(() => {
        setUnreadCount(assignedStats?.newAssignedCount || 0);
      });
    }).catch(() => {});
  }, [assignedStats]);

  React.useEffect(() => {
    reloadNotifications();
  }, [reloadNotifications]);

  React.useEffect(() => {
    let unsub = () => {};
    import('../services/api').then(({ onDataMutation }) => {
      unsub = onDataMutation(() => {
        reloadNotifications();
      });
    }).catch(() => {});
    return () => unsub();
  }, [reloadNotifications]);

  return (
    <View style={s.headerContainer}>
      <StatusBar
        barStyle={theme.statusBarStyle}
        backgroundColor={theme.surface}
      />

      <View style={s.topRow}>
        {showBack ? (
          <TouchableOpacity
            style={s.backBtn}
            onPress={onBack || (() => navigation?.goBack?.())}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={s.brandRow}>
            {/* Golden G Emblem matching web app */}
            <View style={s.logoBadge}>
              <Text style={s.logoLetter}>G</Text>
            </View>
            <View style={s.brandTextCol}>
              <View style={s.brandTitleRow}>
                <Text style={s.brandName}>G.H.A.R</Text>
                <Text style={s.brandCrm}> CRM</Text>
              </View>
              <Text style={s.brandTagline}>REAL ESTATE SUITE</Text>
            </View>
          </View>
        )}

        {/* Center Title if specified and showing back button */}
        {showBack && title && (
          <View style={s.centerTitleWrapper}>
            <Text style={s.centerTitle} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={s.centerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        )}

        {/* Right Actions */}
        <View style={s.rightActionsRow}>
          {rightAction}

          {/* In-app Notification Bell */}
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => navigation?.navigate?.('Notifications')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={20} color={theme.textPrimary} />
            {unreadCount > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Profile Avatar */}
          <TouchableOpacity
            style={s.avatarBtn}
            onPress={() => navigation?.navigate?.('Settings')}
            activeOpacity={0.8}
          >
            <Text style={s.avatarText}>{getInitials(user?.name || user?.email)}</Text>
            <View style={s.onlineDot} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    headerContainer: {
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 24) + 8,
      paddingBottom: 12,
      paddingHorizontal: 16,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 40,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    logoBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#E8A020',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#E8A020',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    logoLetter: {
      fontSize: 20,
      fontWeight: '800',
      color: '#080E1A',
      letterSpacing: -0.5,
    },
    brandTextCol: {
      justifyContent: 'center',
    },
    brandTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    brandName: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
      letterSpacing: 0.2,
    },
    brandCrm: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.primary,
      letterSpacing: 0.2,
    },
    brandTagline: {
      fontSize: 8.5,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 1.2,
      marginTop: 1,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: theme.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    centerTitleWrapper: {
      flex: 1,
      marginHorizontal: 12,
    },
    centerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    centerSubtitle: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 1,
    },
    rightActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    notifBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.surface2,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    notifBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: theme.error,
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      borderWidth: 1.5,
      borderColor: theme.surface,
    },
    notifBadgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
    },
    avatarBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.surface2,
      borderWidth: 1.5,
      borderColor: theme.borderAccent,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    avatarText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    onlineDot: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: theme.success,
      borderWidth: 1.5,
      borderColor: theme.surface,
    },
  });
}
