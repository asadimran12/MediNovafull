import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert } from "react-native";
import { COLORS, SPACING } from "../constants/theme";

interface SettingsScreenProps {
  onClearAll: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClearAll }) => {
  return (
    <View style={styles.sectionView}>
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Export Data</Text>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Coming Soon",
              "Backup and export will be available in future updates."
            )
          }
        >
          <Text style={styles.settingAction}>Manage</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Model Context</Text>
        <Text style={styles.settingValue}>2048 Tokens</Text>
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Clear All History</Text>
        <TouchableOpacity onPress={onClearAll}>
          <Text style={{ color: COLORS.danger }}>Reset App</Text>
        </TouchableOpacity>
      </View>
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
});
