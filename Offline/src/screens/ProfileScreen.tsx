import React, { useState, useEffect } from "react";
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
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";
import StorageService, { UserProfile } from "../services/StorageService";

interface ProfileScreenProps {
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
}

const GENDERS = ["Male", "Female", "Other"];
const SEVERITIES = ["Low", "Medium", "High"];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onClose, onSave }) => {
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Personal Health Profile</Text>
          <Text style={styles.subtitle}>
            Tell us more about yourself to get personalized health insights. All data is stored locally and securely.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 30"
              placeholderTextColor={COLORS.textSub}
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.optionsRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.optionButton,
                    gender === g && styles.selectedOption,
                  ]}
                  onPress={() => setGender(g as UserProfile["gender"])}
                >
                  <Text
                    style={[
                      styles.optionTag,
                      gender === g && styles.selectedOptionText,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medical Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Hypertension, Diabetes, Asthma"
              placeholderTextColor={COLORS.textSub}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={conditions}
              onChangeText={setConditions}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Severity level of conditions (if any)</Text>
            <View style={styles.optionsRow}>
              {SEVERITIES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.optionButton,
                    severity === s && styles.selectedOption,
                  ]}
                  onPress={() => setSeverity(s as UserProfile["severity"])}
                >
                  <Text
                    style={[
                      styles.optionTag,
                      severity === s && styles.selectedOptionText,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.securityContainer}>
            <Text style={styles.sectionTitle}>🔐 Security Question</Text>
            <Text style={styles.sectionSubtitle}>
              This will help you recover your account if you forget your password.
            </Text>

            {/* Question Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Security Question</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. What is your pet's name?"
                placeholderTextColor={COLORS.textSub}
                value={forgetPasswordQuestion}
                onChangeText={setForgetPasswordQuestion}
              />
            </View>

            {/* Answer Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Answer</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your answer"
                placeholderTextColor={COLORS.textSub}
                value={forgetPasswordAnswer}
                onChangeText={setForgetPasswordAnswer}
              />

            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Details</Text>
          </TouchableOpacity>
          {(age || conditions || gender) ? (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete My Data</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.skipButton} onPress={onClose}>
            <Text style={styles.skipButtonText}>{isSet ? "Back to Chat" : "Skip for now"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({

  securityContainer: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: "#F8FAFC",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textHeader,
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSub,
    marginBottom: SPACING.md,
  },

  inputGroup: {
    marginBottom: SPACING.md,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 4,
  },

  input: {
    backgroundColor: "#FFF",
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 15,
    color: COLORS.textMain,
  },


  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl * 2,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSub,
    lineHeight: 20,
  },
  form: {
    gap: SPACING.lg,
  },
  textArea: {
    minHeight: 100,
    paddingTop: SPACING.sm,
  },
  optionsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  optionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.light,
  },
  selectedOption: {
    backgroundColor: COLORS.primary,
  },
  optionTag: {
    color: COLORS.textSub,
    fontSize: 14,
    fontWeight: "500",
  },
  selectedOptionText: {
    color: COLORS.surface,
  },
  footer: {
    marginTop: SPACING.xl * 2,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    ...SHADOWS.medium,
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "bold",
  },
  skipButton: {
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  skipButtonText: {
    color: COLORS.textSub,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  deleteButton: {
    paddingVertical: SPACING.sm,
    alignItems: "center",
    marginTop: SPACING.md,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "600",
  },
});
