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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerIconBox}>
            <Text style={styles.headerIcon}>👤</Text>
          </View>
          <Text style={styles.title}>Health Profile</Text>
          <Text style={styles.subtitle}>
            Tell us about yourself to receive highly personalized AI guidance. All data stays offline.
          </Text>
        </View>

        {/* BASIC INFO */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Basic Details</Text>

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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
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

        {/* MEDICAL INFO */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Medical History</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Existing Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Hypertension, Diabetes, Asthma"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={conditions}
              onChangeText={(text) => {
                const filterd = text.replace(/[^a-zA-Z\s]/g, "");
                setConditions(filterd)
              }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Severity Level</Text>
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

        {/* SECURITY SETTINGS */}
        <View style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <Text style={styles.securityIcon}>🔐</Text>
            <View>
              <Text style={styles.securityTitle}>Account Security</Text>
              <Text style={styles.securitySubtitle}>Used for password recovery</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Security Question</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. What is your pet's name?"
              placeholderTextColor={COLORS.textMuted}
              value={forgetPasswordQuestion}
              onChangeText={setForgetPasswordQuestion}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Answer</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your hidden answer"
              placeholderTextColor={COLORS.textMuted}
              value={forgetPasswordAnswer}
              onChangeText={setForgetPasswordAnswer}
            />
          </View>
        </View>

        {/* FOOTER ACTIONS */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {isSet ? "Update Profile" : "Save Profile"}
            </Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.skipText}>{isSet ? "Go Back" : "Skip setup"}</Text>
            </TouchableOpacity>

            {(age || conditions || gender) && (
              <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.deleteText}>Delete Data</Text>
              </TouchableOpacity>
            )}
          </View>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl * 2,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  headerIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(89, 170, 111, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  headerIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.textHeader,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSub,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: SPACING.lg,
  },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    ...SHADOWS.light,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textHeader,
    marginBottom: SPACING.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Security Card
  securityCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  securityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  securityIcon: {
    fontSize: 28,
    marginRight: 12,
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
  },

  // Form Elements
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    color: COLORS.textMain,
  },
  textArea: {
    minHeight: 90,
  },

  // Toggle Options
  optionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
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
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.button,
    paddingVertical: 16,
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
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  skipText: {
    color: COLORS.textSub,
    fontSize: 13,
    fontWeight: "600",
  },
  deleteText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
  },
});
