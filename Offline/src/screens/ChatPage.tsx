import React, { useState } from "react";
import { 
    View, 
    Text, 
    TouchableOpacity, 
    StyleSheet, 
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { ChatBubble } from "../components/ChatBubble";
import { ChatInput } from "../components/ChatInput";
import { LocalMessage } from "../services/StorageService";

interface ParsedReport {
    title: string;
    lines: { label: string; value: string }[];
}

interface ChatPageProps {
    onBack?: () => void;
    reportData?: ParsedReport;
}

export default function ChatPage({ onBack, reportData }: ChatPageProps) {
    const [messages, setMessages] = useState<LocalMessage[]>(() => {
        const initialText = reportData 
            ? `I see your report titled '${reportData.title}'. What would you like to know about it?` 
            : "Hello! How can I help you analyze your report today?";
        
        return [{ id: "1", role: "assistant", text: initialText, timestamp: new Date() }];
    });

    const [input, setInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleSend = () => {
        if (!input.trim() || isGenerating) return;
        
        // Add user msg
        const newMsg: LocalMessage = { id: Date.now().toString(), role: "user", text: input.trim(), timestamp: new Date() };
        setMessages(prev => [...prev, newMsg]);
        setInput("");
        setIsGenerating(true);
        
        // Simulate bot reply
        setTimeout(() => {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", text: "I am a simulated response. Once the LLM is connected, I will provide real analysis!", timestamp: new Date() }]);
            setIsGenerating(false);
        }, 1000);
    };

    const handleStop = () => {
        setIsGenerating(false);
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.header}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>Analysis Chat</Text>
            </View>

            <ScrollView style={styles.chatArea} contentContainerStyle={styles.scrollContent}>
                
                {/* Visual Report Summary */}
                {reportData && (
                    <View style={styles.reportCard}>
                        <View style={styles.reportHeader}>
                            <Text style={styles.reportIcon}>📄</Text>
                            <Text style={styles.reportTitle}>{reportData.title}</Text>
                        </View>
                        <View style={styles.reportDivider} />
                        
                        {reportData.lines.slice(0, 5).map((line, index) => (
                            <View key={index} style={[styles.reportRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                                {line.label ? (
                                    <>
                                        <Text style={styles.rowLabel}>{line.label}</Text>
                                        <Text style={styles.rowValue}>{line.value}</Text>
                                    </>
                                ) : (
                                    <Text style={styles.rowPlain}>{line.value}</Text>
                                )}
                            </View>
                        ))}
                        {reportData.lines.length > 5 && (
                            <Text style={styles.moreText}>+ {reportData.lines.length - 5} more lines parsed</Text>
                        )}
                    </View>
                )}

                {/* Message Feed */}
                {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} />
                ))}

            </ScrollView>

            {/* Bottom Input Area */}
            <View style={styles.inputArea}>
                <ChatInput 
                    inputText={input}
                    setInputText={setInput}
                    onSend={handleSend}
                    onStop={handleStop}
                    isGenerating={isGenerating}
                    disabled={isGenerating}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
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
    
    chatArea: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },

    // Report Card UI
    reportCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.md,
        marginBottom: SPACING.xl,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    reportHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: SPACING.sm,
    },
    reportIcon: {
        fontSize: 20,
        marginRight: SPACING.sm,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textHeader,
        flex: 1,
    },
    reportDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: SPACING.sm,
    },
    reportRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
        paddingHorizontal: SPACING.sm,
        borderRadius: 4,
    },
    rowEven: { backgroundColor: "#f9f9f9" },
    rowOdd: { backgroundColor: "transparent" },
    rowLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textMain,
        flex: 1,
    },
    rowValue: {
        fontSize: 13,
        color: COLORS.textHeader,
        flex: 1,
        textAlign: "right",
    },
    rowPlain: {
        fontSize: 13,
        color: COLORS.textMain,
        flex: 1,
    },
    moreText: {
        fontSize: 12,
        color: COLORS.textMuted,
        textAlign: "center",
        marginTop: SPACING.sm,
        fontStyle: "italic",
    },

    // Bottom Input
    inputArea: {
        backgroundColor: COLORS.surface,
    },
});