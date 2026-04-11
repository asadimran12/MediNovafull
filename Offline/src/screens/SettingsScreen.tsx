import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Share,
  ScrollView,
} from "react-native";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";
import storageService from "../services/StorageService";

interface SettingsScreenProps {
  onClearAll: () => void;
  onManageModels: () => void;
  onManageProfile: () => void;
  onBack?: () => void;
  onLogout?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onClearAll,
  onManageModels,
  onManageProfile,
  onBack,
  onLogout,
}) => {

  const handleExportLocally = async () => {
    try {
      const exportPath = await storageService.exportAllDataLocally();
      await Share.share({
        title: "MediNova Backup",
        message: `MediNova backup file saved at:\n${exportPath}`,
        url: `file://${exportPath}`,
      });
      Alert.alert("Export Successful", `Your data has been exported to:\n\n${exportPath}`);
    } catch (error) {
      Alert.alert("Export Failed", "Failed to export data. Please try again.");
    }
  };

  const handleExportOnCloud = async () => {
    try {
      await storageService.exportAllDataOnCloud();
      Alert.alert("Export Successful", "Your data has been exported to the cloud.");
    } catch (error) {
      Alert.alert("Export Failed", "Failed to export data. Please try again.");
    }
  };

  const handleExportData = () => {
    Alert.alert("Export Data", "Choose where to save your backup:", [
      { text: "Cancel", style: "cancel" },
      { text: "☁️ Export on Cloud", onPress: handleExportOnCloud },
      { text: "📱 Export Locally", onPress: handleExportLocally },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* ── Page Header ───────────────────────────── */}
      <View style={styles.pageHeader}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.pageTitle}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── AI & Models ───────────────────────────── */}
        <Text style={styles.sectionLabel}>AI & MODELS</Text>
        <View style={styles.card}>
          <SettingRow
            icon="🤖"
            title="AI Models"
            subtitle="Download & manage local models"
            actionLabel="Manage"
            onAction={onManageModels}
          />
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🧠</Text>
              <View>
                <Text style={styles.rowTitle}>Model Context</Text>
                <Text style={styles.rowSubtitle}>Token limit per conversation</Text>
              </View>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>4096 Tokens</Text>
            </View>
          </View>
        </View>

        {/* ── Account ───────────────────────────── */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <SettingRow
            icon="👤"
            title="Your Profile"
            subtitle="Name, age, health preferences"
            actionLabel="Edit"
            onAction={onManageProfile}
          />
        </View>

        {/* ── Data ───────────────────────────── */}
        <Text style={styles.sectionLabel}>DATA & STORAGE</Text>
        <View style={styles.card}>
          <SettingRow
            icon="📤"
            title="Export Data"
            subtitle="Save backup locally or to cloud"
            actionLabel="Export"
            onAction={handleExportData}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="🗑️"
            title="Clear All History"
            subtitle="Erase all chats and saved plans"
            actionLabel="Reset"
            onAction={() =>
              Alert.alert("Clear All Data", "This will permanently delete all chat history and plans. Are you sure?", [
                { text: "Cancel", style: "cancel" },
                { text: "Clear All", style: "destructive", onPress: onClearAll },
              ])
            }
            actionDanger
          />
        </View>

        {/* ── Logout ───────────────────────────── */}
        {onLogout && (
          <>
            <Text style={styles.sectionLabel}>SESSION</Text>
            <TouchableOpacity
              style={styles.logoutCard}
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert("Logout", "Are you sure you want to logout?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Logout", style: "destructive", onPress: onLogout },
                ])
              }
            >
              <Text style={styles.logoutIcon}>🚪</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.logoutTitle}>Logout</Text>
                <Text style={styles.logoutSubtitle}>Sign out of your account</Text>
              </View>
              <Text style={styles.logoutChevron}>›</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Footer ───────────────────────────── */}
        <Text style={styles.footer}>MediNova · Private AI Health Assistant</Text>
      </ScrollView>
    </View>
  );
};

// ── Sub-component ─────────────────────────────────────────────
interface SettingRowProps {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  actionDanger?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({ icon, title, subtitle, actionLabel, onAction, actionDanger }) => (
  <View style={styles.row}>
    <View style={styles.rowLeft}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
    </View>
    <TouchableOpacity
      onPress={onAction}
      style={[styles.actionBtn, actionDanger && styles.actionBtnDanger]}
      activeOpacity={0.75}
    >
      <Text style={[styles.actionBtnText, actionDanger && styles.actionBtnTextDanger]}>
        {actionLabel}
      </Text>
    </TouchableOpacity>
  </View>
);

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },

  // Header
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: "900",
    marginTop: -2,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textHeader,
  },

  // Scroll
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 50,
  },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    ...SHADOWS.light,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 60,
  },

  // Rows inside cards
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  rowIcon: {
    fontSize: 22,
    width: 36,
    textAlign: "center",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textHeader,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 12,
    color: COLORS.textSub,
    fontWeight: "400",
  },

  // Action button
  actionBtn: {
    backgroundColor: "rgba(89,170,111,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: "rgba(89,170,111,0.25)",
  },
  actionBtnDanger: {
    backgroundColor: "rgba(255,59,48,0.08)",
    borderColor: "rgba(255,59,48,0.2)",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  actionBtnTextDanger: {
    color: COLORS.danger,
  },

  // Badge (read-only value)
  badge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSub,
  },

  // Logout card
  logoutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.2)",
    ...SHADOWS.light,
  },
  logoutIcon: {
    fontSize: 22,
    width: 36,
    textAlign: "center",
  },
  logoutTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.danger,
    marginBottom: 2,
  },
  logoutSubtitle: {
    fontSize: 12,
    color: COLORS.textSub,
  },
  logoutChevron: {
    fontSize: 22,
    color: COLORS.danger,
    fontWeight: "bold",
    opacity: 0.6,
  },

  // Footer
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 36,
    marginBottom: 10,
    fontWeight: "500",
  },
});
