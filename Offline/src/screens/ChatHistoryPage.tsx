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
}

export const ChatHistoryPage = ({ onSelectChat }: ChatHistoryProps) => {
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
                setChatHistory(validHistory);
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
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.pageTitle}>Chat History</Text>
                    <Text style={styles.pageSubtitle}>Review your past medical consultations</Text>
                </View>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{chatHistory.length}</Text>
                </View>
            </View>

            {chatHistory.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📂</Text>
                    <Text style={styles.emptyTitle}>No past conversations</Text>
                    <Text style={styles.emptySub}>Your health chat history will live here once you start exploring MediNova.</Text>
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
    );
};

const createStyles = (COLORS: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
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
    pageTitle: {
        fontSize: 26,
        fontWeight: "900",
        color: COLORS.textHeader,
        letterSpacing: -0.5,
    },
    pageSubtitle: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 4,
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