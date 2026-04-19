import React, { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";

import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
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

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const history = await storageService.getAllChats();
                // Filter out empty sessions
                const validHistory = history.filter(chat => chat.messages && chat.messages.length > 0);
                
                // Filter by type:
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
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                        <Text style={styles.backArrow}>←</Text>
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>{historyType === "report" ? "Report Discussions" : "Chat History"}</Text>
                <View style={styles.backBtn} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.pageSubtitle}>{historyType === "report" ? "Review past analyses of your medical reports" : "Review your past medical consultations"}</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{chatHistory.length}</Text>
                    </View>
                </View>

            {chatHistory.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📂</Text>
                    <Text style={styles.emptyTitle}>{historyType === "report" ? "No past report analyses" : "No past conversations"}</Text>
                    <Text style={styles.emptySub}>{historyType === "report" ? "Your scanned reports and AI feedback will appear here." : "Your health chat history will live here once you start exploring MediNova."}</Text>
                </View>
            ) : (
                <View style={styles.listContainer}>
                    {chatHistory.map((chat) => (
                        <TouchableOpacity key={chat.id} style={styles.card} onPress={() => onSelectChat(chat.id)}>
                            <View style={styles.iconCircle}>
                                <Text style={styles.iconText}>💬</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.chatTitle} numberOfLines={1}>
                                    {chat.title}
                                </Text>
                                <View style={styles.metaRow}>
                                    <Text style={styles.timeText}>{formatTime(chat.updatedAt)}</Text>
                                    <Text style={styles.msgCount}>• {chat.messages.length} messages</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
            </ScrollView>
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
    headerTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: COLORS.textHeader,
    },

    content: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
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
        fontWeight: "500",
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.xl,
    },
    pageSubtitle: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: -4,
    },
    badge: {
        backgroundColor: "rgba(89, 170, 111, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
    },
    badgeText: {
        color: COLORS.primary,
        fontWeight: "bold",
        fontSize: 14,
    },
    listContainer: {
        gap: SPACING.md,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.light,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#EBF4FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: SPACING.md,
    },
    iconText: {
        fontSize: 20,
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
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: SPACING.xxl * 2,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: "dashed",
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: SPACING.md,
        opacity: 0.8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textHeader,
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 13,
        color: COLORS.textSub,
        textAlign: "center",
        paddingHorizontal: SPACING.xl,
        lineHeight: 18,
    },
});