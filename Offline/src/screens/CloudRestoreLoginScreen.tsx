import React, { useState } from 'react';
import { useTheme } from "../context/ThemeContext";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SPACING, RADIUS, SHADOWS } from "../constants/theme";
import AuthService, { UserAccount } from '../services/AuthService';
import StorageService from '../services/StorageService';
import * as ReactNativeFS from 'react-native-fs';

interface CloudRestoreLoginScreenProps {
  cloudData: any;
  onRestoreSuccess: (user: UserAccount) => void;
  onBack: () => void;
}

/**
 * Extracts the users array from various possible backend response shapes:
 *   { auth: { users: [...] } }
 *   { users: [...] }
 *   [...]
 */
function extractUsers(cloudData: any): any[] {
  if (Array.isArray(cloudData?.auth?.users)) return cloudData.auth.users;
  if (Array.isArray(cloudData?.users))        return cloudData.users;
  if (Array.isArray(cloudData))               return cloudData;
  return [];
}

export const CloudRestoreLoginScreen: React.FC<CloudRestoreLoginScreenProps> = ({
  cloudData,
  onRestoreSuccess,
  onBack,
}) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);

  const handleRestore = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your username and password.');
      return;
    }

    setIsLoading(true);
    try {
      // ── DEBUG: Log raw cloudData structure ──────────────────────────────
      console.log('[CloudRestore] Raw cloudData keys:', Object.keys(cloudData || {}));
      console.log('[CloudRestore] cloudData.auth:', JSON.stringify(cloudData?.auth));
      console.log('[CloudRestore] cloudData.users:', JSON.stringify(cloudData?.users));

      const users = extractUsers(cloudData);

      console.log('[CloudRestore] Extracted users count:', users.length);
      console.log('[CloudRestore] Extracted users:', JSON.stringify(users));

      if (users.length === 0) {
        Alert.alert(
          'No Users Found',
          'Could not find any user accounts in the cloud backup. Please check your backup data.',
        );
        return;
      }

      // ── DEBUG: Log what we're comparing ────────────────────────────────
      console.log('[CloudRestore] Entered username:', username.trim());
      console.log('[CloudRestore] Entered password:', password);
      users.forEach((u: any, i: number) => {
        console.log(`[CloudRestore] User[${i}] username="${u.username}", passwordHash="${u.passwordHash}"`);
        console.log(`[CloudRestore] User[${i}] username match:`, u.username?.toLowerCase() === username.trim().toLowerCase());
        console.log(`[CloudRestore] User[${i}] password match:`, u.passwordHash === password);
      });

      // Match against the stored passwordHash (plain-text in this app)
      const matchedUser = users.find(
        (u: any) =>
          u.username?.toLowerCase() === username.trim().toLowerCase() &&
          u.passwordHash === password,
      );

      if (!matchedUser) {
        Alert.alert(
          'Incorrect Credentials',
          'Username or password does not match the cloud backup. Please double-check and try again.',
        );
        return;
      }

      // ── Restore auth files ──────────────────────────────────────────────
      const authDir = `${ReactNativeFS.DocumentDirectoryPath}/auth`;
      if (!(await ReactNativeFS.exists(authDir))) await ReactNativeFS.mkdir(authDir);
      await ReactNativeFS.writeFile(
        `${authDir}/users.json`,
        JSON.stringify(users),
        'utf8',
      );
      await ReactNativeFS.writeFile(
        `${authDir}/session.json`,
        JSON.stringify({ userId: matchedUser.id }),
        'utf8',
      );
      await StorageService.setUser(matchedUser.id);

      // ── Restore profile, chats, plans ──────────────────────────────────
      // Support both top-level and nested-under-user structures
      const profile = cloudData?.profile;
      const chats   = Array.isArray(cloudData?.chats) ? cloudData.chats : [];
      const plans   = Array.isArray(cloudData?.plans) ? cloudData.plans : [];

      if (profile) await StorageService.saveProfile(profile);
      for (const chat of chats) await StorageService.saveChat(chat);
      for (const plan of plans) await StorageService.savePlan(plan);

      Alert.alert(
        '✅ Restore Successful',
        `Welcome back, ${matchedUser.username}! Your data has been restored.`,
        [{ text: 'Continue', onPress: () => onRestoreSuccess(matchedUser) }],
      );
    } catch (e) {
      console.error('[CloudRestore] Error:', e);
      Alert.alert('Restore Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          {/* Icon + Title */}
          <Text style={styles.icon}>☁️</Text>
          <Text style={styles.brand}>MediNova</Text>
          <Text style={styles.title}>Restore from Cloud</Text>
          <Text style={styles.subtitle}>
            Enter the credentials you used when you backed up your data to verify your identity and restore your account.
          </Text>

          <View style={styles.form}>
            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. john_doe"
                placeholderTextColor={COLORS.textSub}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textSub}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Restore button */}
            <TouchableOpacity
              style={[styles.restoreButton, isLoading && styles.disabledButton]}
              onPress={handleRestore}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.restoreButtonText}>🔄 Restore My Data</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔒 Your credentials are verified locally.{'\n'}No data is sent back to the server.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  backButton: {
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  backText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.medium,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  brand: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textHeader,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSub,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  form: {
    gap: SPACING.lg,
    width: '100%',
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.textMain,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.textMain,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  restoreButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.light,
  },
  disabledButton: {
    backgroundColor: COLORS.textMuted,
  },
  restoreButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
