import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";

interface ReportAnalysisScreenProps {
  onBack: () => void;
  onNavigateToUpload: () => void;
  onNavigateToChat: () => void;
}

export const ReportAnalysisScreen: React.FC<ReportAnalysisScreenProps> = ({ onBack, onNavigateToUpload, onNavigateToChat }) => {
  const handleUpload = () => {
    onNavigateToUpload();
  }
  const handleChat = () => {
    onNavigateToChat();
  }
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analyse Report</Text>
      </View>

      <TouchableOpacity onPress={handleUpload} style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.icon}>🔬</Text>
          <Text style={styles.title}>Upload image,pdf or capture image</Text>

        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleChat} style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.icon}>💬</Text>
          <Text style={styles.title}>Chat with AI</Text>

        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: SPACING.sm },
  backText: { color: COLORS.primary, fontWeight: "600", fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textHeader, marginLeft: SPACING.md },
  content: { padding: SPACING.lg, alignItems: "center" },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: "center",
    width: "100%",
    ...SHADOWS.medium,
    marginBottom: SPACING.xl,
  },
  icon: { fontSize: 60, marginBottom: SPACING.md },
  title: { fontSize: 22, fontWeight: "bold", color: COLORS.textHeader, textAlign: "center", marginBottom: SPACING.sm },
});
