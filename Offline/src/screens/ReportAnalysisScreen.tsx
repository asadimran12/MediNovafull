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
  };

  return (
    <View style={styles.container}>
      {/* ── Page Header ───────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {onBack && (
            <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
              <View style={styles.backButtonPrimary}>
                <Text style={styles.backButtonTextWhite}>‹ Back</Text>
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Report Analysis</Text>
          </View>
          <View style={{ width: 70 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
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

        <View style={{ marginTop: SPACING.xxl, paddingHorizontal: SPACING.lg }}>
          <Text style={styles.sectionHeader}>History & Archive</Text>

          <TouchableOpacity onPress={onNavigateToChat} style={styles.verticalCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#F2994A15' }]}>
              <Text style={[styles.gridIcon, { color: '#F2994A' }]}>🕒</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.gridTitle}>Report Discussions</Text>
              <Text style={styles.gridSubtitle}>Review your past AI analyses</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* ── Online Analyze Report 2.0 Card ── */}
          <TouchableOpacity
            style={styles.premiumCard}
            activeOpacity={0.9}
            onPress={() => Alert.alert("MediNova 2.0", "Cloud-based advanced medical analysis is coming soon in the next update!")}
          >
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>NEW</Text>
            </View>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.gridIcon}>⚡</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.premiumTitle}>Online Analyze 2.0</Text>
              <Text style={styles.premiumSubtitle}>Advanced Cloud AI Processing</Text>
            </View>
            <Text style={styles.premiumChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.howItWorks} onPress={() => Alert.alert("Coming Soon", "Detailed instructions will be added here.")}>
          <Text style={styles.howItWorksText}>❓ How it works</Text>
        </TouchableOpacity>
      </ScrollView>

    </View>
  );
};

const createStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.light,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...SHADOWS.light,
  },
  backButtonTextWhite: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "700",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.textHeader,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 30,
    marginBottom: 30,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 16,
    marginLeft: 4,
  },
  verticalList: {
    paddingHorizontal: SPACING.lg,
    gap: 12,
  },
  verticalCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    ...SHADOWS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  premiumCard: {
    flexDirection: "row",
    backgroundColor: COLORS.primary, // Premium dark color
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  premiumBadge: {
    position: 'absolute',
    top: 0,
    right: 20,
    backgroundColor: '#FFD700', // Gold
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  gridIcon: {
    fontSize: 22,
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
  premiumTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: '#fff',
  },
  premiumSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  premiumChevron: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '300',
  },
  howItWorks: {
    alignSelf: "center",
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADIUS.pill,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  howItWorksText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
});
