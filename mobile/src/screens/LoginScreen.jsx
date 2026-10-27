import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Spacing, Radius, Typography, Shadow } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const { theme, isDark } = useTheme();
  const styles = makeStyles(theme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      {/* Background glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>G</Text>
            </View>
            <Text style={styles.appName}>G.H.A.R CRM</Text>
            <Text style={styles.tagline}>Gem Homes Advisory & Realtors</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSub}>Sign in to your account</Text>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@ghar.in"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingRight: 44 }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={theme.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.bg} size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color={theme.bg} />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              Contact your administrator if you don't have access.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    glowTop: {
      position: 'absolute',
      top: -100,
      right: -100,
      width: 400,
      height: 400,
      borderRadius: 200,
      backgroundColor: 'rgba(232, 160, 32, 0.06)',
    },
    glowBottom: {
      position: 'absolute',
      bottom: -150,
      left: -100,
      width: 400,
      height: 400,
      borderRadius: 200,
      backgroundColor: 'rgba(59, 130, 246, 0.04)',
    },
    kav: { flex: 1 },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: Spacing.xl,
      paddingTop: 60,
      paddingBottom: 40,
    },
    header: {
      alignItems: 'center',
      marginBottom: Spacing.xxl,
    },
    logoBox: {
      width: 64,
      height: 64,
      borderRadius: Radius.lg,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
      ...Shadow.md,
      shadowColor: theme.primary,
      shadowOpacity: 0.4,
    },
    logoLetter: {
      fontSize: 32,
      fontWeight: Typography.extrabold,
      color: theme.bg,
    },
    appName: {
      fontSize: Typography.xxl,
      fontWeight: Typography.bold,
      color: theme.textPrimary,
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: Typography.sm,
      color: theme.textSecondary,
      marginTop: 4,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      padding: Spacing.xxl,
      borderWidth: 1,
      borderColor: theme.border,
      ...Shadow.lg,
    },
    cardTitle: {
      fontSize: Typography.xl,
      fontWeight: Typography.bold,
      color: theme.textPrimary,
      marginBottom: 4,
    },
    cardSub: {
      fontSize: Typography.sm,
      color: theme.textSecondary,
      marginBottom: Spacing.xxl,
    },
    fieldGroup: {
      marginBottom: Spacing.lg,
    },
    label: {
      fontSize: Typography.sm,
      color: theme.textSecondary,
      fontWeight: Typography.medium,
      marginBottom: Spacing.sm,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface2,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: Spacing.md,
      height: 48,
    },
    inputIcon: {
      marginRight: Spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: Typography.base,
      color: theme.textPrimary,
      height: '100%',
    },
    eyeBtn: {
      position: 'absolute',
      right: Spacing.md,
      height: '100%',
      justifyContent: 'center',
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: theme.primary,
      borderRadius: Radius.md,
      height: 52,
      marginTop: Spacing.md,
      ...Shadow.sm,
      shadowColor: theme.primary,
      shadowOpacity: 0.4,
    },
    btnDisabled: {
      opacity: 0.7,
    },
    btnText: {
      fontSize: Typography.base,
      fontWeight: Typography.semibold,
      color: theme.bg,
    },
    hint: {
      fontSize: Typography.xs,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: Spacing.lg,
      lineHeight: 18,
    },
  });
}
