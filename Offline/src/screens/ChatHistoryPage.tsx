import React, { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";

import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
} from "react-native";
import storageService, { ChatSession } from "../services/StorageService";
import { SPACING, RADIUS, SHADOWS } from "../constants/theme";

interface ChatHistoryProps {
    onSelectChat: (id: string) => void;
    onBack?: () => void;
    historyType?: "general" | "report";
}

export const ChatHistoryPage = ({ onSelectChat, onBack, historyType = "general" }: ChatHistoryProps) => {
    const { colors: COLORS } = useTheme();
    const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
    
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const loadHistory = async () => {
        try {
            const history = await storageService.getAllChats();
            const validHistory = history.filter(chat => chat.messages && chat.messages.length > 0);
            const filteredHistory = validHistory.filter(chat => 
                historyType === "report" ? chat.type === "report" : chat.type !== "report"
            );
            setChatHistory(filteredHistory);
        } catch (error) {
            console.log("Error loading chat history:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const formatTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
            });
        } catch {
            return "Unknown time";
        }
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await storageService.deleteChat(deleteConfirmId);
            setChatHistory(prev => prev.filter(c => c.id !== deleteConfirmId));
            setDeleteConfirmId(null);
        } catch (error) {
            console.log("Delete error:", error);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading history...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* ── Page Header ───────────────────────────── */}
            <View style={styles.pageHeader}>
                <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backBtn}>
                    <View style={styles.backBtnContainer}>
                        <Text style={styles.backBtnText}>‹ Back</Text>
                    </View>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{historyType === "report" ? "Report Analyses" : "Medical Chats"}</Text>
                <View style={{ width: 80 }} /> 
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.pageSubtitle}>
                            {historyType === "report" 
                                ? "Your past medical report discussions and AI insights." 
                                : "Review your previous health consultations and advice."}
                        </Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{chatHistory.length}</Text>
                    </View>
                </View>

            {chatHistory.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📂</Text>
                    <Text style={styles.emptyTitle}>{historyType === "report" ? "No analyses found" : "No chats yet"}</Text>
                    <Text style={styles.emptySub}>{historyType === "report" ? "Start by uploading a medical report for AI analysis." : "Start a new conversation with MediNova to see it here."}</Text>
                </View>
            ) : (
                <View style={styles.listContainer}>
                    {chatHistory.map((chat) => (
                        <TouchableOpacity 
                            key={chat.id} 
                            style={styles.card} 
                            activeOpacity={0.8}
                            onPress={() => onSelectChat(chat.id)}
                        >
                            <View style={styles.iconCircle}>
                                <Text style={styles.iconText}>{historyType === "report" ? "📄" : "💬"}</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.chatTitle} numberOfLines={1}>
                                    {chat.title || "Untitled Discussion"}
                                </Text>
                                <View style={styles.metaRow}>
                                    <Text style={styles.timeText}>{formatTime(chat.updatedAt)}</Text>
                                    <Text style={styles.msgCount}>• {chat.messages.length} msgs</Text>
                                </View>
                            </View>
                            
                            <TouchableOpacity 
                                style={styles.deleteBtn}
                                activeOpacity={0.6}
                                onPress={() => setDeleteConfirmId(chat.id)}
                            >
                                <Text style={styles.deleteIconText}>✕</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
            </ScrollView>

            {/* ── Delete Confirmation Modal ──────────────── */}
            <Modal
                transparent
                visible={deleteConfirmId !== null}
                animationType="fade"
                onRequestClose={() => setDeleteConfirmId(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalAccentBar} />
                        <View style={styles.modalIconContainer}>
                            <Text style={styles.modalIcon}>🗑️</Text>
                        </View>
                        <Text style={styles.modalTitle}>Delete Chat?</Text>
                        <Text style={styles.modalSubtitle}>
                            This conversation will be permanently removed. You cannot undo this action.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalBtnCancel}
                                onPress={() => setDeleteConfirmId(null)}
                            >
                                <Text style={styles.modalBtnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalBtnDelete}
                                onPress={confirmDelete}
                            >
                                <Text style={styles.modalBtnDeleteText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const createStyles = (COLORS: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
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
    headerTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: COLORS.textHeader,
    },
    backBtn: {
        width: 80,
    },
    backBtnContainer: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    backBtnText: {
        fontSize: 14,
        color: "#fff",
        fontWeight: "700",
    },

    content: {
        padding: SPACING.lg,
        paddingBottom: 60,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: SPACING.md,
        fontSize: 14,
        color: COLORS.textSub,
        fontWeight: "600",
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    pageSubtitle: {
        fontSize: 13,
        color: COLORS.textSub,
        lineHeight: 18,
        paddingRight: 10,
    },
    badge: {
        backgroundColor: "rgba(89, 170, 111, 0.12)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: "rgba(89, 170, 111, 0.2)",
    },
    badgeText: {
        color: COLORS.primary,
        fontWeight: "800",
        fontSize: 14,
    },
    listContainer: {
        gap: 12,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.light,
    },
    iconCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: "rgba(89, 170, 111, 0.08)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: SPACING.md,
    },
    iconText: {
        fontSize: 22,
    },
    cardContent: {
        flex: 1,
    },
    chatTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textHeader,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    timeText: {
        fontSize: 12,
        color: COLORS.textSub,
        fontWeight: "500",
    },
    msgCount: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginLeft: 6,
    },
    deleteBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 59, 48, 0.05)",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    deleteIconText: {
        fontSize: 16,
        color: COLORS.danger,
        fontWeight: "600",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: "dashed",
    },
    emptyIcon: {
        fontSize: 44,
        marginBottom: SPACING.lg,
        opacity: 0.8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: COLORS.textHeader,
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 13,
        color: COLORS.textSub,
        textAlign: "center",
        paddingHorizontal: 40,
        lineHeight: 20,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "85%",
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        overflow: "hidden",
        alignItems: "center",
        paddingBottom: 24,
        ...SHADOWS.medium,
    },
    modalAccentBar: {
        width: "100%",
        height: 4,
        backgroundColor: COLORS.danger,
    },
    modalIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(255, 59, 48, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 24,
        marginBottom: 16,
    },
    modalIcon: {
        fontSize: 28,
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: "800",
        color: COLORS.textHeader,
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
        paddingHorizontal: 30,
        lineHeight: 20,
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 20,
    },
    modalBtnCancel: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.background,
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalBtnCancelText: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textMain,
    },
    modalBtnDelete: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.danger,
        alignItems: "center",
    },
    modalBtnDeleteText: {
        fontSize: 15,
        fontWeight: "800",
        color: "#FFF",
    },
});