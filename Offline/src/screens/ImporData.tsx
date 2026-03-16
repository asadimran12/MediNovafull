import React from 'react'
import { View, Text, Button, Alert, TouchableOpacity } from 'react-native'
import { pick } from "@react-native-documents/picker";
import storageService from '../services/StorageService'
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";

interface ImportDataProps {
    onSkip: () => void;
    onImportSuccess?: () => void;
}

export default function ImportData({ onSkip, onImportSuccess }: ImportDataProps) {

    const handleImport = async () => {

        try {

            const file = await pick({
                type: ["*/*"],
            });

            const success = await storageService.importAllDataLocally(file[0].uri);

            if (success) {
                Alert.alert("Success", "Data imported successfully", [
                    { text: "OK", onPress: onImportSuccess || onSkip }
                ]);
            } else {
                Alert.alert("Error", "Import failed");
            }

        } catch (error) {
            console.log(error);
        }

    }

    return (
        <View style={{ flex: 1, justifyContent: 'center', padding: SPACING.xl, backgroundColor: COLORS.background }}>
            <View style={{ backgroundColor: COLORS.surface, padding: SPACING.xl, borderRadius: RADIUS.xl, ...SHADOWS.medium }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', marginBottom: SPACING.md }}>MediNova</Text>
                <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textHeader, textAlign: 'center', marginBottom: SPACING.xs }}>Restore from Backup</Text>
                <Text style={{ fontSize: 14, color: COLORS.textSub, textAlign: 'center', marginBottom: SPACING.xl }}>Import your previous health data file or skip to continue with new account.</Text>

                <TouchableOpacity 
                    style={{ backgroundColor: COLORS.primary, paddingVertical: SPACING.md, borderRadius: RADIUS.lg, alignItems: 'center', ...SHADOWS.light, marginBottom: SPACING.md }}
                    onPress={handleImport}
                >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Select Backup File</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onSkip} style={{ alignItems: 'center', padding: SPACING.sm }}>
                    <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '600' }}>Skip</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}