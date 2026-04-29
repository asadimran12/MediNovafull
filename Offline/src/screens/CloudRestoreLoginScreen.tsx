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
  Image,
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
 * Extracts the users array from various possible backend response shapes.
 */
function extractUsers(cloudData: any): any[] {
  if (Array.isArray(cloudData?.auth?.users)) return cloudData.auth.users;
  if (Array.isArray(cloudData?.users)) return cloudData.users;
  if (Array.isArray(cloudData)) return cloudData;
  return [];
}

export const CloudRestoreLoginScreen: React.FC<CloudRestoreLoginScreenProps> = ({
  cloudData,
  onRestoreSuccess,
  onBack,
}) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRestore = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const users = extractUsers(cloudData);

      if (users.length === 0) {
        Alert.alert(
          'No Users Found',
          'Could not find any user accounts in the cloud backup.',
        );
        return;
      }

      const matchedUser = users.find(
        (u: any) =>
          u.username?.toLowerCase() === username.trim().toLowerCase() &&
          u.passwordHash === password,
      );

      if (!matchedUser) {
        Alert.alert(
          'Incorrect Credentials',
          'Username or password does not match the cloud backup.',
        );
        return;
      }

      // Restore auth files
      const authDir = `${ReactNativeFS.DocumentDirectoryPath}/auth`;
      if (!(await ReactNativeFS.exists(authDir))) await ReactNativeFS.mkdir(authDir);
      await ReactNativeFS.writeFile(`${authDir}/users.json`, JSON.stringify(users), 'utf8');
      await ReactNativeFS.writeFile(`${authDir}/session.json`, JSON.stringify({ userId: matchedUser.id }), 'utf8');
      await StorageService.setUser(matchedUser.id);

      // Restore profile, chats, plans
      const profile = cloudData?.profile;
      const chats = Array.isArray(cloudData?.chats) ? cloudData.chats : [];
      const plans = Array.isArray(cloudData?.plans) ? cloudData.plans : [];

      if (profile) await StorageService.saveProfile(profile);
      for (const chat of chats) await StorageService.saveChat(chat);
      for (const plan of plans) await StorageService.savePlan(plan);

      Alert.alert(
        '✅ Restore Successful',
        `Welcome back, ${matchedUser.username}! Your data has been restored.`,
        [{ text: 'Continue', onPress: () => onRestoreSuccess(matchedUser) }],
      );
    } catch (e) {
      Alert.alert('Restore Failed', 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Image source={require("../assets/images/splash_logo.png")} style={{
            width: 200,
            height: 200,
            resizeMode: "contain",
            alignSelf: "center",
            margin: -50
          }} />
          <Text style={styles.title}>Cloud Recovery</Text>
          <Text style={styles.subtitle}>
            Enter the credentials used during your last backup to verify and restore your health records.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor={COLORS.textSub}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textSub}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.authButton, isLoading && styles.disabledButton]}
              onPress={handleRestore}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.authButtonText}>Start Restoration</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔒 Your credentials are verified locally against the backup.{"\n"}No data is sent back to the server.
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
    justifyContent: "center",
    padding: SPACING.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    ...SHADOWS.light,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.medium,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textHeader,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  form: {
    gap: SPACING.lg,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMain,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.textMain,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    justifyContent: "center",
  },
  eyeIcon: {
    fontSize: 18,
    color: COLORS.textMain,
  },
  authButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    marginTop: SPACING.md,
    ...SHADOWS.light,
  },
  disabledButton: {
    backgroundColor: COLORS.textMuted,
  },
  authButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    marginTop: SPACING.xl,
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
