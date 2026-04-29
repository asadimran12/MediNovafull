import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SPACING, RADIUS, SHADOWS } from "../constants/theme";
import StorageService, { UserProfile } from "../services/StorageService";

interface ProfileScreenProps {
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
}

const GENDERS = ["Male", "Female", "Other"];
const SEVERITIES = ["Low", "Medium", "High"];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onClose, onSave }) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  const [age, setAge] = useState("");
  const [gender, setGender] = useState<UserProfile["gender"]>("");
  const [conditions, setConditions] = useState("");
  const [severity, setSeverity] = useState<UserProfile["severity"]>("");
  const [isSet, setIsSet] = useState(false);
  const [forgetPasswordQuestion, setForgetPasswordQuestion] = useState("");
  const [forgetPasswordAnswer, setForgetPasswordAnswer] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const profile = await StorageService.getProfile();
    if (profile.isSet) {
      setAge(profile.age || "");
      setGender(profile.gender || "");
      setConditions(profile.conditions || "");
      setSeverity(profile.severity || "");
      setForgetPasswordAnswer(profile.forgetPasswordAnswer || "");
      setForgetPasswordQuestion(profile.forgetPasswordQuestion || "");
      setIsSet(true);
    } else {
      setIsSet(false);
    }
  };

  const handleSave = async () => {
    const profile: UserProfile = {
      age,
      gender,
      conditions,
      severity,
      forgetPasswordQuestion,
      forgetPasswordAnswer,
      isSet: true,
    };
    await StorageService.saveProfile(profile);
    onSave(profile);
  };

  const handleDelete = async () => {
    Alert.alert(
      "Delete Profile",
      "Are you sure you want to delete your personal health profile? This will reset your personalized experience.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await StorageService.deleteProfile();
            onSave({ isSet: false });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Page Header ───────────────────────────── */}
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.backBtn}>
          <View style={styles.backBtnContainer}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Health Profile</Text>
        <View style={{ width: 80 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* INTRO HEADER */}
          <View style={styles.introHeader}>
            <View style={styles.headerIconBox}>
              <Text style={styles.headerIcon}>👤</Text>
            </View>
            <Text style={styles.introSubtitle}>
              Personalize your MediNova experience. This data helps the AI provide more accurate and relevant health guidance.
            </Text>
          </View>

          {/* BASIC INFO SECTION */}
          <Text style={styles.sectionLabel}>BASIC DETAILS</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 30"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />
            </View>

            <View style={[styles.inputGroup, { marginBottom: 0 }]}>
              <Text style={styles.label}>Gender Identity</Text>
              <View style={styles.optionsRow}>
                {GENDERS.map((g) => {
                  const isSelected = gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      activeOpacity={0.8}
                      style={[styles.optionBtn, isSelected && styles.optionBtnActive]}
                      onPress={() => setGender(g as UserProfile["gender"])}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* MEDICAL HISTORY SECTION */}
          <Text style={styles.sectionLabel}>MEDICAL CONTEXT</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chronic Conditions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Type 2 Diabetes, Hypertension"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={conditions}
                onChangeText={(text) => setConditions(text.replace(/[^a-zA-Z0-9\s,]/g, ""))}
              />
              <Text style={styles.helperText}>Separate multiple conditions with commas</Text>
            </View>

            <View style={[styles.inputGroup, { marginBottom: 0 }]}>
              <Text style={styles.label}>Condition Severity</Text>
              <View style={styles.optionsRow}>
                {SEVERITIES.map((s) => {
                  const isSelected = severity === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      activeOpacity={0.8}
                      style={[styles.optionBtn, isSelected && styles.optionBtnActive]}
                      onPress={() => setSeverity(s as UserProfile["severity"])}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* SECURITY SECTION */}
          <Text style={styles.sectionLabel}>ACCOUNT SECURITY</Text>
          <View style={styles.securityCard}>
            <View style={styles.securityHeader}>
              <View style={styles.securityIconBox}>
                <Text style={styles.securityIcon}>🔐</Text>
              </View>
              <View>
                <Text style={styles.securityTitle}>Recovery Question</Text>
                <Text style={styles.securitySubtitle}>Helps you regain access if you forget your password</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Security Question</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Your first school name?"
                placeholderTextColor={COLORS.textMuted}
                value={forgetPasswordQuestion}
                onChangeText={setForgetPasswordQuestion}
              />
            </View>

            <View style={[styles.inputGroup, { marginBottom: 0 }]}>
              <Text style={styles.label}>Answer</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter answer"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                value={forgetPasswordAnswer}
                onChangeText={setForgetPasswordAnswer}
              />
            </View>
          </View>

          {/* ACTIONS */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {isSet ? "Update Health Profile" : "Save and Continue"}
              </Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              {(isSet) && (
                <TouchableOpacity onPress={handleDelete} style={styles.dangerBtn}>
                  <Text style={styles.deleteText}>Clear Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={styles.privacyNote}>
            🔒 Your health data is processed locally and never leaves this device.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textHeader,
  },
  backBtn: {
    width: 80,
  },
  backBtnContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 60,
  },

  // Intro
  introHeader: {
    alignItems: "center",
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  headerIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(89, 170, 111, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  headerIcon: {
    fontSize: 34,
  },
  introSubtitle: {
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
  },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 4,
  },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },

  // Security Card
  securityCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  securityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xl,
    gap: 12,
  },
  securityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 149, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  securityIcon: {
    fontSize: 22,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textHeader,
  },
  securitySubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    maxWidth: '90%',
  },

  // Form Elements
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 8,
    marginLeft: 2,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    color: COLORS.textMain,
  },
  textArea: {
    minHeight: 100,
  },
  helperText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
    marginLeft: 4,
    fontStyle: 'italic',
  },

  // Toggle Options
  optionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionBtnActive: {
    backgroundColor: "rgba(89, 170, 111, 0.1)",
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSub,
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: "800",
  },

  // Footer Actions
  footer: {
    marginTop: 30,
  },
  primaryButton: {
    backgroundColor: COLORS.button,
    paddingVertical: 18,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    ...SHADOWS.medium,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: SPACING.sm,
  },
  secondaryBtn: {
    paddingVertical: 8,
  },
  dangerBtn: {
    paddingVertical: 8,
  },
  skipText: {
    color: COLORS.textSub,
    fontSize: 14,
    fontWeight: "600",
  },
  deleteText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  privacyNote: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 30,
    fontWeight: '500',
  },
});
