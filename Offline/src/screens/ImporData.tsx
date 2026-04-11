import React, { useState } from 'react'
import {
    View,
    Text,
    Alert,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    StyleSheet,
} from 'react-native'
import { pick } from "@react-native-documents/picker";
import storageService from '../services/StorageService'
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";
import { BACKEND_URL } from "@env";

interface ImportDataProps {
    onSkip: () => void;
    onImportSuccess?: () => void;
    onCloudDataFetched: (data: any) => void;
}

export default function ImportData({ onSkip, onImportSuccess, onCloudDataFetched }: ImportDataProps) {

    const [isImporting, setIsImporting] = useState(false);
    const [importingLabel, setImportingLabel] = useState("Importing...");
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const triggerSuccess = (message: string) => {
        setSuccessMessage(message);
        setShowSuccess(true);
    };

    const handleImport = async () => {
        try {
            const file = await pick({ type: ["*/*"] });
            setImportingLabel("Importing...");
            setIsImporting(true);

            const success = await storageService.importAllDataLocally(file[0].uri);
            setIsImporting(false);

            if (success) {
                triggerSuccess("All your chats, plans, and profile have been restored successfully.");
            } else {
                Alert.alert("Restore Failed", "Could not read the backup file. Make sure you selected a valid MediNova export file.");
            }
        } catch (error: any) {
            setIsImporting(false);
            if (error?.code !== "DOCUMENT_PICKER_CANCELED") {
                console.error("Import error:", error);
                Alert.alert("Import Error", "An unexpected error occurred. Please try again.");
            }
        }
    };

    const handleImportFromCloud = async () => {
        try {
            setImportingLabel("Fetching from Cloud...");
            setIsImporting(true);

            const response = await fetch(`${BACKEND_URL}/users/GetAllData`, {
                method: "GET",
            });
            const data = await response.json();
            setIsImporting(false);

            if (data) {
                onCloudDataFetched(data);
                triggerSuccess("Your cloud backup has been restored successfully.");
            }
        } catch (error) {
            setIsImporting(false);
            console.error("Failed to import from cloud", error);
            Alert.alert("Cloud Import Failed", "Could not fetch data from the cloud. Please try again.");
        }
    };

    return (
        <View style={styles.container}>

            {/* ── Importing Loading Overlay ─────────────────────── */}
            <Modal transparent visible={isImporting} animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>{importingLabel}</Text>
                        <Text style={styles.loadingSubText}>Please wait, do not close the app</Text>
                    </View>
                </View>
            </Modal>

            {/* ── Import Success Modal ──────────────────────────── */}
            <Modal transparent visible={showSuccess} animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.successBox}>
                        <View style={styles.successIconCircle}>
                            <Text style={styles.successIcon}>✓</Text>
                        </View>
                        <Text style={styles.successTitle}>Restore Successful!</Text>
                        <Text style={styles.successMessage}>{successMessage}</Text>
                        <TouchableOpacity
                            style={styles.successBtn}
                            activeOpacity={0.85}
                            onPress={() => {
                                setShowSuccess(false);
                                (onImportSuccess || onSkip)();
                            }}
                        >
                            <Text style={styles.successBtnText}>Continue to Login →</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Back Button ───────────────────────────────────── */}
            <TouchableOpacity onPress={onSkip} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>

            {/* ── Main Card ────────────────────────────────────── */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>🔄 Restore from Backup</Text>
                <Text style={styles.cardSubtitle}>
                    Select your MediNova backup file (.json) to restore your chats, diet &amp; exercise plans, and profile.
                </Text>

                {/* Local File */}
                <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handleImport}>
                    <Text style={styles.primaryBtnText}>📂  Select Backup File</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Cloud Import */}
                <TouchableOpacity style={styles.cloudBtn} activeOpacity={0.85} onPress={handleImportFromCloud}>
                    <Text style={styles.cloudBtnText}>☁️  Import from Cloud</Text>
                </TouchableOpacity>

                {/* Cancel */}
                <TouchableOpacity onPress={onSkip} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.background,
    },

    // Back button
    backBtn: {
        position: 'absolute',
        top: SPACING.xl,
        left: SPACING.xl,
    },
    backBtnText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: 16,
    },

    // Main card
    card: {
        backgroundColor: COLORS.surface,
        padding: SPACING.xl,
        borderRadius: RADIUS.xl,
        ...SHADOWS.medium,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.textHeader,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    cardSubtitle: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 22,
    },

    // Primary (local) button
    primaryBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.light,
    },
    primaryBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },

    // OR divider
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: 10,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '600',
    },

    // Cloud button
    cloudBtn: {
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    cloudBtnText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '700',
    },

    // Cancel
    cancelBtn: {
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    cancelBtnText: {
        color: COLORS.textMuted,
        fontSize: 15,
        fontWeight: '500',
    },

    // Loading Overlay
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingBox: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: 32,
        alignItems: 'center',
        gap: 12,
        width: '75%',
        ...SHADOWS.light,
    },
    loadingText: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.textHeader,
        marginTop: 4,
    },
    loadingSubText: {
        fontSize: 12,
        color: COLORS.textSub,
        textAlign: 'center',
    },

    // Success Modal
    successBox: {
        width: '82%',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: 32,
        alignItems: 'center',
        gap: 10,
        ...SHADOWS.light,
    },
    successIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(52,199,89,0.12)',
        borderWidth: 2,
        borderColor: 'rgba(52,199,89,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    successIcon: {
        fontSize: 34,
        color: '#34C759',
        fontWeight: '900',
    },
    successTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textHeader,
        textAlign: 'center',
    },
    successMessage: {
        fontSize: 13,
        color: COLORS.textSub,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 8,
    },
    successBtn: {
        backgroundColor: '#34C759',
        paddingVertical: 13,
        paddingHorizontal: 32,
        borderRadius: RADIUS.pill,
        marginTop: 4,
    },
    successBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
    },
});