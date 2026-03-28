import React from 'react'
import { View, Text, Alert, TouchableOpacity } from 'react-native'
import { pick } from "@react-native-documents/picker";
import storageService from '../services/StorageService'
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";

interface ImportDataProps {
    onSkip: () => void;
    onImportSuccess?: () => void;
    onCloudDataFetched: (data: any) => void;
}

export default function ImportData({ onSkip, onImportSuccess, onCloudDataFetched }: ImportDataProps) {

    const handleImport = async () => {
        try {
            const file = await pick({ type: ["*/*"] });
            const success = await storageService.importAllDataLocally(file[0].uri);

            if (success) {
                Alert.alert(
                    "Restore Successful",
                    "All your data (chats, plans, and profile) has been restored successfully.",
                    [{ text: "OK", onPress: onImportSuccess || onSkip }]
                );
            } else {
                Alert.alert("Restore Failed", "Could not read the backup file. Make sure you selected a valid MediNova export file.");
            }
        } catch (error: any) {
            // User cancelled the picker — don't show an error
            if (error?.code !== "DOCUMENT_PICKER_CANCELED") {
                console.error("Import error:", error);
                Alert.alert("Import Error", "An unexpected error occurred. Please try again.");
            }
        }
    }


    const handleimportfromcloud = async () => {
        try {
            const response = await fetch("http://10.0.2.2:8000/users/GetAllData", {
                method: "GET",
            });
            const data = await response.json();
            if (data) {
                onCloudDataFetched(data);
                onSkip();

            }
        } catch (error) {
            console.error("Failed to import from cloud", error);
            throw error;
        }
    }

    return (
        <View style={{ flex: 1, justifyContent: 'center', padding: SPACING.xl, backgroundColor: COLORS.background }}>

            {/* Back button for in-app restore */}
            <TouchableOpacity
                onPress={onSkip}
                style={{ position: 'absolute', top: SPACING.xl, left: SPACING.xl }}
            >
                <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 16 }}>← Back</Text>
            </TouchableOpacity>

            <View style={{ backgroundColor: COLORS.surface, padding: SPACING.xl, borderRadius: RADIUS.xl, ...SHADOWS.medium }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.textHeader, textAlign: 'center', marginBottom: SPACING.xs }}>
                    🔄 Restore from Backup
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.textSub, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 20 }}>
                    Select your MediNova backup file (.json) to restore your chats, diet & exercise plans, and profile.
                </Text>

                <TouchableOpacity
                    style={{
                        backgroundColor: COLORS.primary,
                        paddingVertical: SPACING.md,
                        borderRadius: RADIUS.lg,
                        alignItems: 'center',
                        ...SHADOWS.light,
                        marginBottom: SPACING.md,
                    }}
                    onPress={handleImport}
                >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>📂 Select Backup File</Text>
                </TouchableOpacity>


                <TouchableOpacity
                    style={{
                        backgroundColor: COLORS.primary,
                        paddingVertical: SPACING.md,
                        borderRadius: RADIUS.lg,
                        alignItems: 'center',
                        ...SHADOWS.light,
                        marginBottom: SPACING.md,
                    }}
                    onPress={handleimportfromcloud}
                >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Import from Cloud</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onSkip} style={{ alignItems: 'center', padding: SPACING.sm }}>
                    <Text style={{ color: COLORS.textSub, fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}