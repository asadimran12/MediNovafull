import React from "react";
import { useTheme } from "../context/ThemeContext";

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Dimensions } from "react-native";
import { SPACING, RADIUS, SHADOWS } from "../constants/theme";

interface ReportAnalysisScreenProps {
  onBack: () => void;
  onNavigateToUpload: (type?: 'gallery' | 'pdf' | 'camera') => void;
  onNavigateToChat: () => void;
}

export const ReportAnalysisScreen: React.FC<ReportAnalysisScreenProps> = ({ onBack, onNavigateToUpload, onNavigateToChat }) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  const handleSelect = (type: 'gallery' | 'pdf' | 'camera') => {
    onNavigateToUpload(type);
  }
  return (
    <View style={styles.container}>

      <Text style={styles.subtitle}>Choose your report format to begin analysis</Text>

      <View style={styles.verticalList}>
        <TouchableOpacity onPress={() => handleSelect('gallery')} style={styles.verticalCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#4A90E215' }]}>
            <Text style={[styles.gridIcon, { color: '#4A90E2' }]}>🖼️</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.gridTitle}>Gallery</Text>
            <Text style={styles.gridSubtitle}>Select from your photos</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleSelect('pdf')} style={styles.verticalCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#9B51E015' }]}>
            <Text style={[styles.gridIcon, { color: '#9B51E0' }]}>📄</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.gridTitle}>PDF Document</Text>
            <Text style={styles.gridSubtitle}>Select a PDF file</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleSelect('camera')} style={styles.verticalCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#27AE6015' }]}>
            <Text style={[styles.gridIcon, { color: '#27AE60' }]}>📸</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.gridTitle}>Take a Photo</Text>
            <Text style={styles.gridSubtitle}>Capture using camera</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.howItWorks} onPress={() => Alert.alert("Coming Soon", "Detailed instructions will be added here.")}>
        <Text style={styles.howItWorksText}>❓ How it works</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (COLORS: any) => StyleSheet.create({
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
  backText: { color: COLORS.primary, fontWeight: "800", fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textHeader, marginLeft: SPACING.md },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  verticalList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  verticalCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    ...SHADOWS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  gridIcon: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textHeader,
  },
  gridSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
  howItWorks: {
    alignSelf: "center",
    marginTop: 40,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.xl,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  howItWorksText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
});
