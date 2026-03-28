import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert, Share } from "react-native";
import { COLORS, SPACING } from "../constants/theme";
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

      // Share the export path via the Share sheet
      await Share.share({
        title: "MediNova Backup",
        message: `MediNova backup file saved at:\n${exportPath}`,
        url: `file://${exportPath}`,
      });

      // Also show an alert so the user knows exactly where the file is
      Alert.alert(
        "Export Successful",
        `Your data has been exported to:\n\n${exportPath}\n\nYou can use a file manager to copy it.`
      );
    } catch (error) {
      console.error("Export failed", error);
      Alert.alert("Export Failed", "Failed to export data. Please try again.");
    }
  };

  const handleExportOnCloud = async () => {
    try {
      await storageService.exportAllDataOnCloud();
      Alert.alert(
        "Export Successful",
        `Your data has been exported to the cloud.`
      );
    } catch (error) {
      console.error("Export failed", error);
      Alert.alert("Export Failed", "Failed to export data. Please try again.");
    }
  };

  const handleExportData = () => {
    Alert.alert(
      "Export Data",
      "Choose where to save your backup:",
      [
        { text: "Cancel", style: "cancel" },
        { text: "☁️ Export on Cloud", onPress: handleExportOnCloud },
        { text: "📱 Export Locally", onPress: handleExportLocally },
      ]
    );
  };

  return (
    <View style={styles.sectionView}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.sectionTitle}>Settings</Text>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>AI Models</Text>
        <TouchableOpacity onPress={onManageModels}>
          <Text style={styles.settingAction}>Manage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Your Profile</Text>
        <TouchableOpacity onPress={onManageProfile}>
          <Text style={styles.settingAction}>Manage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Export Data</Text>
        <TouchableOpacity onPress={handleExportData}>
          <Text style={styles.settingAction}>Export</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Model Context</Text>
        <Text style={styles.settingValue}>4096 Tokens</Text>
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Clear All History</Text>
        <TouchableOpacity onPress={onClearAll}>
          <Text style={{ color: COLORS.danger }}>Reset App</Text>
        </TouchableOpacity>
      </View>

      {onLogout && (
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() =>
            Alert.alert("Logout", "Are you sure you want to logout?", [
              { text: "Cancel", style: "cancel" },
              { text: "Logout", style: "destructive", onPress: onLogout },
            ])
          }
        >
          <Text style={styles.logoutText}>🚪  Logout</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionView: { flex: 1, padding: SPACING.lg },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textHeader,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLabel: { fontSize: 16, color: COLORS.textHeader },
  settingValue: { color: COLORS.textSub },
  settingAction: { color: COLORS.primary, fontWeight: "600" },
  backBtn: { marginBottom: 15 },
  backText: { color: COLORS.primary, fontWeight: "600", fontSize: 16 },
  logoutBtn: {
    marginTop: 30,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    alignItems: "center",
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "700",
  },
});
