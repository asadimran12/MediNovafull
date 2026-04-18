import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Image,
} from "react-native";
import { SPACING, RADIUS } from "../constants/theme";
import { ChatBubble } from "../components/ChatBubble";
import { ChatInput } from "../components/ChatInput";
import { LocalMessage } from "../services/StorageService";
import LlamaService from "../services/LlamaService";
import ModelService from "../services/ModelService";
import StorageService from "../services/StorageService";
import KnowledgeBase from "../services/KnowledgeBase";



interface ParsedReport {
    title: string;
    lines: { label: string; value: string }[];
}

interface ChatPageProps {
    onBack?: () => void;
    reportData?: ParsedReport;
    imageUri?: string | null;
    initialSessionId?: string | null;
}

export default function ChatPage({ onBack, reportData, imageUri, initialSessionId }: ChatPageProps) {
    const { colors: COLORS } = useTheme();
    const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

    const [messages, setMessages] = useState<LocalMessage[]>([]);
    const [input, setInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const [hasAttemptedAutoExplain, setHasAttemptedAutoExplain] = useState(false);
    const [sessionID] = useState(() => initialSessionId || Math.random().toString(36).substring(7));

    useEffect(() => {
        if (initialSessionId) {
            StorageService.loadChat(initialSessionId).then((session) => {
                if (session && session.messages) {
                    setMessages(session.messages);
                    setHasAnalyzed(true); // Disable "Analyze with AI" button if it's past chat
                }
            });
        } else {
            const initialText = reportData
                ? `I see your report titled '${reportData.title}'. What would you like to know about it?`
                : "Hello! How can I help you analyze your report today?";
            setMessages([{ id: "1", role: "assistant", text: initialText, timestamp: new Date() }]);
        }
    }, [initialSessionId, reportData]);

    useEffect(() => {
        const hasUserMsg = messages.some((m) => m.role === "user");
        if (hasUserMsg && !isGenerating) {
            const title = reportData ? `Report: ${reportData.title}` : "Report Analysis";
            const currentSession: any = {
                id: sessionID,
                type: "report",
                title: title,
                messages: messages,
                updatedAt: new Date().toISOString(),
            };
            StorageService.saveChat(currentSession).catch(console.error);
        }
    }, [messages.length, isGenerating, sessionID, reportData]);



    const triggerAnalysis = async () => {
        if (!reportData || hasAnalyzed || isGenerating) return;
        setHasAnalyzed(true);
        const autoPrompt = `I have scanned a medical report titled "${reportData.title}". Please explain the key findings, values, and what they mean for my health in simple terms.`;
        await handleSendWithCustomText(autoPrompt);
    };

    const handleSendWithCustomText = async (text: string) => {
        if (!text.trim() || isGenerating) return;
        const userText = text.trim();
        const newMsg: LocalMessage = { id: Date.now().toString(), role: "user", text: userText, timestamp: new Date() };
        setMessages(prev => [...prev, newMsg]);
        setIsGenerating(true);
        await performChat(userText, [...messages, newMsg]);
    };

    const handleSend = async () => {
        if (!input.trim() || isGenerating) return;
        const userText = input.trim();
        const newMsg: LocalMessage = { id: Date.now().toString(), role: "user", text: userText, timestamp: new Date() };
        setMessages(prev => [...prev, newMsg]);
        setInput("");
        setIsGenerating(true);
        await performChat(userText, [...messages, newMsg]);
    };

    const performChat = async (userText: string, currentMessages: LocalMessage[]) => {
        try {
            const activeModel = await ModelService.getActiveModel();
            if (!activeModel) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", text: "Error: No active AI model found.", timestamp: new Date() }]);
                setIsGenerating(false);
                return;
            }

            await LlamaService.loadModel(activeModel.filename);
            const profile = await StorageService.getProfile();

            // Fetch RAG context
            const ragContext = await KnowledgeBase.getRelevantContext(userText);
            console.log("🔍 RAG Context for Chat:", ragContext ? "Found" : "Not Found");

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

            console.log("🛠️ ChatPage: reportData status:", !!reportData);
            if (reportData) {
                // Filter and limit lines to avoid context overflow
                const cleanLines = reportData.lines
                    .filter(l => (l.label + l.value).trim().length > 0)
                    .slice(0, 40);

                const optimizedReportData = {
                    ...reportData,
                    lines: cleanLines
                };

                await LlamaService.reportChat(
                    optimizedReportData,
                    aiMessages,
                    profile,
                    ragContext || undefined,
                    onTokenCallback
                );
            } else {
                const basePrompt = LlamaService.generateSystemPrompt(profile);
                const enhancedPrompt = ragContext
                    ? `${basePrompt}\n\nADDITIONAL MEDICAL CONTEXT (RAG):\n${ragContext}\n\nPlease use this context to provide more accurate and grounded advice.`
                    : basePrompt;
                await LlamaService.chat(aiMessages, enhancedPrompt, onTokenCallback);
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


            <ScrollView style={styles.chatArea} contentContainerStyle={styles.scrollContent}>

                {/* Visual Report Summary */}
                {reportData && (
                    <View style={styles.reportCard}>
                        <View style={styles.reportHeader}>
                            <Text style={styles.reportIcon}>📄</Text>
                            <Text style={styles.reportTitle}>{reportData.title}</Text>
                        </View>
                        {imageUri && (
                            <Image source={{ uri: imageUri }} style={styles.reportImagePreview} resizeMode="cover" />
                        )}
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

                        {!hasAnalyzed && (
                            <TouchableOpacity
                                style={styles.analyzeButton}
                                onPress={triggerAnalysis}
                                disabled={isGenerating}
                            >
                                <Text style={styles.analyzeButtonText}>✨ Analyze with MediNova AI</Text>
                            </TouchableOpacity>
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

const createStyles = (COLORS: any) => StyleSheet.create({
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
    backText: { color: COLORS.primary, fontWeight: "800", fontSize: 16 },
    headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textHeader },

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
    rowEven: { backgroundColor: COLORS.background },
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
    analyzeButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: 12,
        alignItems: "center",
        marginTop: SPACING.md,
    },
    analyzeButtonText: {
        color: "#FFF",
        fontWeight: "700",
        fontSize: 15
    },
    reportImagePreview: {
        width: "100%",
        height: 150,
        borderRadius: 8,
        marginBottom: SPACING.md,
        backgroundColor: COLORS.background,
    },
});