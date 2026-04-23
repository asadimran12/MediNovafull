import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  Image,
} from "react-native";
import { useRef } from "react";
import { SPACING, RADIUS, SHADOWS } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import AuthService, { UserAccount } from "../services/AuthService";
import StorageService from "../services/StorageService";
import * as ReactNativeFS from "react-native-fs";

interface AuthScreenProps {
  onLogin: (user: UserAccount) => void;
  onForgetPassword: () => void;
  onRestore: () => void;
  cloudData?: any;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onForgetPassword, onRestore, cloudData }) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };




  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please fill in all fields.");
      setSuccessMsg("");
      return;
    }


    setIsLoading(true);
    try {
      if (isRegistering) {
        // ── Normal registration (local only) ───────────────────────────────
        const user = await AuthService.register(username, password);
        if (user) {
          setSuccessMsg("Account created successfully!");
          setErrorMsg("");
          setIsRegistering(false);
          setPassword("");
        } else {
          setErrorMsg("Username already exists.");
          setSuccessMsg("");
        }

      } else if (cloudData && Array.isArray(cloudData.auth.users)) {
        // ── Cloud login: check credentials against cloud data ──────────────
        const matchedUser = cloudData.auth.users.find(
          (u: any) =>
            u.username?.toLowerCase() === username.toLowerCase() &&
            u.passwordHash === password
        );

        if (matchedUser) {

          const authDir = `${ReactNativeFS.DocumentDirectoryPath}/auth`;
          if (!(await ReactNativeFS.exists(authDir))) await ReactNativeFS.mkdir(authDir);
          await ReactNativeFS.writeFile(`${authDir}/users.json`, JSON.stringify(cloudData.auth.users), "utf8");
          await ReactNativeFS.writeFile(`${authDir}/session.json`, JSON.stringify({ userId: matchedUser.id }), "utf8");
          await StorageService.setUser(matchedUser.id);

          if (cloudData.profile) {
            await StorageService.saveProfile(cloudData.profile);
          }
          if (Array.isArray(cloudData.chats)) {
            for (const chat of cloudData.chats) {
              await StorageService.saveChat(chat);
            }
          }

          if (Array.isArray(cloudData.plans)) {
            for (const plan of cloudData.plans) {
              await StorageService.savePlan(plan);
            }
          }

          onLogin(matchedUser);
        } else {
          setErrorMsg("Username or password does not match the cloud backup.");
          setSuccessMsg("");
        }

      } else {
        // ── Normal local login ─────────────────────────────────────────────
        const user = await AuthService.login(username, password);
        if (user) {
          onLogin(user);
        } else {
          setErrorMsg("Invalid username or password.");
          setSuccessMsg("");
        }
      }
    } catch (e) {
      setErrorMsg("Authentication failed. Please try again.");
      setSuccessMsg("");
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
        <View style={styles.card}>
          <Image source={require("../assets/images/splash_logo.png")} style={{
            width: 200,
            height: 200,
            resizeMode: "contain",
            alignSelf: "center",
            margin: -50
          }} />
          <Text style={styles.title}>
            {isRegistering ? "Create Account" : "Welcome Back"}
          </Text>
          <Text style={styles.subtitle}>
            {isRegistering
              ? "Join us for personalized health insights."
              : "Login to access your private health data."}
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor={COLORS.textSub}
                value={username}
                onChangeText={(text) => {
                  const cleanedtext = text.replace(/[^a-zA-Z]/g, "");
                  setUsername(cleanedtext);
                }}
                autoCapitalize="none"
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
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.authButtonText}>
                  {isRegistering ? "Sign Up" : "Login"}
                </Text>
              )}
            </TouchableOpacity>

            {!!errorMsg && (
              <Text style={styles.errorMsg}>{errorMsg}</Text>
            )}
            {!!successMsg && (
              <Text style={styles.successMsg}>{successMsg}</Text>
            )}

            <View style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setIsRegistering(!isRegistering)}
              >
                <Text style={styles.toggleText}>
                  {isRegistering
                    ? "Already have an account? Login"
                    : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>


              <TouchableOpacity onPress={onForgetPassword} >
                <Text style={styles.toggleText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Animated.View style={{ transform: [{ scale: scaleAnim }], alignSelf: 'center' }}>
                <TouchableOpacity
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  onPress={onRestore}
                  style={styles.restoreButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.restoreIcon}>📁</Text>
                  <Text style={styles.restoreText}>Restore from Backup</Text>
                </TouchableOpacity>
              </Animated.View>


            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔒 100% Offline & Private{"\n"}All data stays on your device.
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.medium,
  },
  brand: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: SPACING.sm,
    letterSpacing: -1,
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
  toggleButton: {
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'center',
    ...SHADOWS.light,
  },
  restoreIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  restoreText: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: "700",
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
  errorMsg: {
    color: "#E53E3E",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "#FFF5F5",
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: "#FC8181",
  },
  successMsg: {
    color: "#276749",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "#F0FFF4",
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: "#68D391",
  },
});
