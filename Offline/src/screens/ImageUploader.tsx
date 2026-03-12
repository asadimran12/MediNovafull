import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    NativeModules,
} from "react-native";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import { pick } from "@react-native-documents/picker";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { COLORS, SPACING } from "../constants/theme";

const { PdfToImageModule } = NativeModules;

interface ParsedReport {
    title: string;
    lines: { label: string; value: string }[];
}

interface ImageUploaderProps {
    onNavigate: (report: ParsedReport | null) => void;
    onBack?: () => void;
}

function parseReportText(raw: string): ParsedReport {
    const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    const title = lines[0] || "Medical Report";
    const rest = lines.slice(1);

    const parsed = rest.map((line) => {
        const separatorMatch = line.match(/^([^:\-]+)[:\-]\s*(.+)$/);
        if (separatorMatch) {
            return {
                label: separatorMatch[1].trim(),
                value: separatorMatch[2].trim(),
            };
        }
        return { label: "", value: line };
    });

    return { title, lines: parsed };
}

export default function ImageUploader({ onNavigate, onBack }: ImageUploaderProps) {
    // ✅ All hooks at top — unconditional, same order every render
    const [image, setImage] = useState<string | null>(null);
    const [report, setReport] = useState<ParsedReport | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    console.log("report", report);
    const captureImage = async () => {
        try {
            const result = await launchCamera({ mediaType: "photo" });

            if (!result.assets || !result.assets[0]?.uri) return;

            const uri = result.assets[0].uri;
            setImage(uri);
            setLoading(true);
            setError(null);
            setReport(null);

            const recognizedText = await TextRecognition.recognize(uri);
            const parsed = parseReportText(recognizedText.text);
            setReport(parsed);
        } catch (err) {
            setError("Could not read text from camera image. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            const result = await launchImageLibrary({ mediaType: "photo" });

            if (!result.assets || !result.assets[0]?.uri) return;

            const uri = result.assets[0].uri;
            setImage(uri);
            setLoading(true);
            setError(null);
            setReport(null);

            const recognizedText = await TextRecognition.recognize(uri);
            const parsed = parseReportText(recognizedText.text);
            setReport(parsed);
        } catch (err) {
            setError("Could not read text from image. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const pickPdf = async () => {
        try {
            setLoading(true);
            setError(null);
            setReport(null);
            setImage(null);

            // Pick a PDF file
            const [pickedFile] = await pick({
                type: ["application/pdf"],
            });

            if (!pickedFile?.uri) {
                setLoading(false);
                return;
            }

            // Convert PDF pages to images using native module
            const imageUris: string[] = await PdfToImageModule.convertPdfToImages(
                pickedFile.uri,
            );

            if (imageUris.length === 0) {
                setError("No pages found in PDF.");
                setLoading(false);
                return;
            }

            // Show first page as preview
            setImage(imageUris[0]);

            // Run OCR on each page and concatenate results
            let fullText = "";
            for (let i = 0; i < imageUris.length; i++) {
                const recognizedText = await TextRecognition.recognize(imageUris[i]);
                if (recognizedText.text) {
                    fullText += `--- Page ${i + 1} ---\n${recognizedText.text}\n\n`;
                }
            }

            if (fullText) {
                const parsed = parseReportText(fullText);
                setReport(parsed);
            } else {
                setError("No text recognized from PDF.");
            }
        } catch (err: any) {
            if (err?.code === "OPERATION_CANCELED") {
                // User cancelled the picker
            } else {
                setError("Could not read file. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>Upload Report</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.subtitle}>
                    Select or capture a medical report to analyze it.
                </Text>

                {/* Upload Options Grid */}
                <View style={styles.grid}>
                    <TouchableOpacity style={styles.gridCard} onPress={captureImage}>
                        <Text style={styles.cardIcon}>📷</Text>
                        <Text style={styles.cardText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.gridCard} onPress={pickImage}>
                        <Text style={styles.cardIcon}>🖼</Text>
                        <Text style={styles.cardText}>Gallery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.gridCard} onPress={pickPdf}>
                        <Text style={styles.cardIcon}>📄</Text>
                        <Text style={styles.cardText}>Upload PDF</Text>
                    </TouchableOpacity>
                </View>

                {/* Loading State */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Analyzing document...</Text>
                    </View>
                )}

                {/* Error Box */}
                {error && !loading && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorIcon}>⚠️</Text>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Image Preview & Success */}
                {!loading && report && image && (
                    <View style={styles.previewContainer}>
                        <Text style={styles.successText}>✅ Report scanned successfully!</Text>
                        <Image source={{ uri: image }} style={styles.image} />
                    </View>
                )}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.primaryButton, (!report || loading) && styles.buttonDisabled]}
                    onPress={() => onNavigate(report)}
                    disabled={!report || loading}
                >
                    <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: { padding: SPACING.sm, marginRight: SPACING.sm },
    backText: { color: COLORS.primary, fontWeight: "600", fontSize: 16 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textHeader },
    
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: 100, // Space for bottom bar
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textMuted,
        marginBottom: SPACING.lg,
        textAlign: "center",
    },
    
    grid: {
        flexDirection: "row",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    gridCard: {
        width: "30%",
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: SPACING.md,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardIcon: {
        fontSize: 32,
        marginBottom: SPACING.sm,
    },
    cardText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textHeader,
        textAlign: "center",
    },

    loadingContainer: {
        alignItems: "center",
        padding: SPACING.xl,
    },
    loadingText: {
        marginTop: SPACING.md,
        color: COLORS.textMuted,
        fontWeight: "500",
    },

    errorBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.danger + "20", // 20% opacity
        padding: SPACING.md,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.danger,
        marginBottom: SPACING.lg,
    },
    errorIcon: {
        fontSize: 20,
        marginRight: SPACING.sm,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 14,
        flex: 1,
        fontWeight: "500",
    },

    previewContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.md,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        alignItems: "center",
    },
    successText: {
        color: COLORS.success,
        fontWeight: "700",
        fontSize: 16,
        marginBottom: SPACING.md,
    },
    image: {
        width: "100%",
        height: 300,
        borderRadius: 12,
        resizeMode: "cover",
    },

    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: 12,
        flex: 2,
        alignItems: "center",
        marginRight: SPACING.md,
    },
    buttonDisabled: {
        backgroundColor: COLORS.border,
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    secondaryButton: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.primary,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: 12,
        flex: 1,
        alignItems: "center",
    },
    secondaryButtonText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: "600",
    },
});