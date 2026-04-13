import React, { useState } from 'react'
import { useTheme } from "../context/ThemeContext";

import {
    View,
    Text,
    Alert,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    StyleSheet,
    TextInput,
} from 'react-native'
import { pick } from "@react-native-documents/picker";
import storageService from '../services/StorageService'
import { SPACING, RADIUS, SHADOWS } from "../constants/theme";

interface ImportDataProps {
    onSkip: () => void;
    onImportSuccess?: () => void;
    onCloudDataFetched: (data: any) => void;
    onCloudRestoreReady: () => void;
}

export default function ImportData({ onSkip, onImportSuccess, onCloudDataFetched, onCloudRestoreReady }: ImportDataProps) {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);


    const [isImporting, setIsImporting] = useState(false);
    const [importingLabel, setImportingLabel] = useState("Importing...");
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [cloudUsername, setCloudUsername] = useState('');

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
        if (!cloudUsername.trim()) {
            Alert.alert('Username Required', 'Please enter your MediNova username to find your cloud backup.');
            return;
        }

        try {
            setImportingLabel("Fetching from Cloud...");
            setIsImporting(true);
            
            const baseUrl = 'https://medinovafull-2.onrender.com';
            const url = `${baseUrl}/users/GetAllData?username=${encodeURIComponent(cloudUsername.trim())}`;
            
            console.log("=== CLOUD IMPORT LOGS ===");
            console.log("Attempting to fetch cloud backup for username:", cloudUsername.trim());
            console.log("Endpoint URL:", url);

            const response = await fetch(url, { method: "GET" });
            
            console.log("Cloud Import Response Status:", response.status);

            if (response.status === 404) {
                setIsImporting(false);
                console.log("No backup found for username:", cloudUsername.trim());
                Alert.alert('Not Found', `No cloud backup found for username "${cloudUsername.trim()}". Please check the username and try again.`);
                return;
            }
            if (!response.ok) {
                setIsImporting(false);
                console.log("Server error returned:", response.status);
                Alert.alert('Server Error', `The server returned an error (${response.status}). Please try again later.`);
                return;
            }
            const data = await response.json();
            setIsImporting(false);

            console.log("Cloud Import Data Received:", {
               hasProfile: !!data.profile,
               chatsCount: data.chats?.length || 0,
               plansCount: data.plans?.length || 0,
               usersCount: data.auth?.users?.length || 0,
               hasSession: !!data.auth?.session
            });
            console.log("===========================");

            if (data) {
                onCloudDataFetched(data);
                onCloudRestoreReady();
            } else {
                Alert.alert('No Data', 'No backup data found on the cloud server.');
            }
        } catch (error) {
            setIsImporting(false);
            console.error('Failed to import from cloud', error);
            Alert.alert('Connection Failed', 'Could not reach the cloud server. Please check your internet connection and try again.');
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
                    <Text style={styles.dividerText}>or restore from cloud</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* ── Username input for cloud ── */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textMain, marginBottom: SPACING.xs }}>
                    Your MediNova Username
                </Text>
                <TextInput
                    style={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: RADIUS.md,
                        paddingHorizontal: SPACING.md,
                        paddingVertical: SPACING.sm,
                        color: COLORS.textMain,
                        fontSize: 15,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        marginBottom: SPACING.md,
                    }}
                    placeholder="e.g. john_doe"
                    placeholderTextColor={COLORS.textSub}
                    value={cloudUsername}
                    onChangeText={setCloudUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                />

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

const createStyles = (COLORS: any) => StyleSheet.create({
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

    // Cloud Button
    cloudBtn: {
        backgroundColor: "rgba(0,122,255,0.1)",
        paddingVertical: 14,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: "rgba(0,122,255,0.2)",
    },
    cloudBtnText: {
        color: "#007AFF",
        fontSize: 16,
        fontWeight: '700',
    },

    // Cancel Button
    cancelBtn: {
        alignItems: 'center',
        paddingVertical: SPACING.xs,
    },
    cancelBtnText: {
        color: COLORS.textSub,
        fontSize: 15,
        fontWeight: '600',
    },

    // Overlay
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },

    // Loading Box
    loadingBox: {
        backgroundColor: COLORS.surface,
        padding: SPACING.xl,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        width: '80%',
        ...SHADOWS.large,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textHeader,
        marginTop: SPACING.md,
    },
    loadingSubText: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },

    // Success Box
    successBox: {
        backgroundColor: COLORS.surface,
        padding: SPACING.xl,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        width: '90%',
        ...SHADOWS.large,
    },
    successIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    successIcon: {
        fontSize: 32,
        color: COLORS.success,
        fontWeight: 'bold',
    },
    successTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textHeader,
        marginBottom: SPACING.sm,
    },
    successMessage: {
        fontSize: 15,
        color: COLORS.textSub,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.xl,
    },
    successBtn: {
        backgroundColor: COLORS.success,
        paddingVertical: 12,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.pill,
        ...SHADOWS.light,
    },
    successBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});