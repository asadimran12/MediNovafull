import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";

interface ReportAnalysisScreenProps {
  onBack: () => void;
}

export const ReportAnalysisScreen: React.FC<ReportAnalysisScreenProps> = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analyse Report</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.icon}>🔬</Text>
          <Text style={styles.title}>Medical Report Analysis</Text>
          <Text style={styles.desc}>
            This feature will allow you to upload or scan medical reports (blood tests, prescriptions, etc.) and get an AI-powered summary and explanation of the results.
          </Text>
          
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>COMING SOON</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔒 Privacy First</Text>
          <Text style={styles.infoText}>
            Just like all other features in MediNova, report analysis will happen 100% on your device. Your sensitive medical documents never leave your phone.
          </Text>
        </View>
      </ScrollView>
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
  desc: { fontSize: 16, color: COLORS.textSub, textAlign: "center", lineHeight: 24, marginBottom: SPACING.lg },
  comingSoonBadge: {
    backgroundColor: COLORS.primary + "22",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  comingSoonText: { color: COLORS.primary, fontWeight: "900", letterSpacing: 1 },
  infoBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.primary + "44",
  },
  infoTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.textHeader, marginBottom: 8 },
  infoText: { fontSize: 14, color: COLORS.textMain, lineHeight: 20 },
});
