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
import LlamaService from "../services/LlamaService";
import ModelService from "../services/ModelService";
import StorageService from "../services/StorageService";



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

    const handleSend = async () => {
        if (!input.trim() || isGenerating) return;

        const userText = input.trim();
        // 1. User msg add kiya
        const newMsg: LocalMessage = { id: Date.now().toString(), role: "user", text: userText, timestamp: new Date() };
        setMessages(prev => [...prev, newMsg]);
        setInput("");
        setIsGenerating(true);


        try {
            const activeModel = await ModelService.getActiveModel();
            if (!activeModel) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", text: "Error: No active AI model found.", timestamp: new Date() }]);
                setIsGenerating(false);
                return;
            }

            await LlamaService.loadModel(activeModel.filename);
            const profile = await StorageService.getProfile();

            // 3. User messages ko string array mein convert kiya
            const aiMessages = messages.map(m => ({
                role: m.role as "user" | "assistant" | "system",
                content: m.text
            }));
            aiMessages.push({ role: "user", content: userText });

            let fullBotReply = "";
            let newBotMsgId = (Date.now() + 1).toString(); // Ek alag ID reserve kar lein anay waly message ki
            let isFirstToken = true;

            const onTokenCallback = (tokenData: any) => {
                fullBotReply += tokenData.token;

                // Jab pehla lafz aaye tab asal bubble chalana hai
                if (isFirstToken) {
                    setMessages(prev => [...prev, { id: newBotMsgId, role: "assistant", text: fullBotReply, timestamp: new Date() }]);
                    isFirstToken = false;
                } else {
                    setMessages(prev => prev.map(m => m.id === newBotMsgId ? { ...m, text: fullBotReply } : m));
                }
            };

            if (reportData) {
                await LlamaService.reportChat(reportData, aiMessages, profile, onTokenCallback);
            } else {
                const systemPrompt = LlamaService.generateSystemPrompt(profile);
                await LlamaService.chat(aiMessages, systemPrompt, onTokenCallback);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", text: "Ghalti! Jawab generate nahi ho saka.", timestamp: new Date() }]);
        } finally {
            setIsGenerating(false);
        }
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

                {isGenerating && (
                    <View style={styles.generatingIndicator}>
                        <Text style={styles.generatingText}>MediNova is generating...</Text>
                    </View>
                )}

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

    // Generating Indicator UI
    generatingIndicator: {
        alignItems: "flex-start",
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.sm,
    },
    generatingText: {
        fontSize: 13,
        color: COLORS.primary,
        fontStyle: "italic",
        fontWeight: "500",
    },

    // Bottom Input
    inputArea: {
        backgroundColor: COLORS.surface,
    },
});