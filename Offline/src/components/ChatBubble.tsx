import React from "react";
import { useTheme } from "../context/ThemeContext";

import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { SPACING, RADIUS, SHADOWS } from "../constants/theme";
import { LocalMessage } from "../services/StorageService";

interface ChatBubbleProps {
  message: LocalMessage;
  onSavePlan?: (msg: LocalMessage) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onSavePlan }) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
          {message.text.trim()}
        </Text>
        {isAssistant && message.id !== "initial-greeting" && onSavePlan && (
          <TouchableOpacity onPress={() => onSavePlan(message)} style={styles.savePlanBtn}>
            <Text style={styles.savePlanBtnText}>★ Save to Plans</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const createStyles = (COLORS: any) => StyleSheet.create({
  messageRow: { marginBottom: SPACING.lg, flexDirection: "row" },
  userRow: { justifyContent: "flex-end" },
  assistantRow: { justifyContent: "flex-start" },
  bubble: { maxWidth: "85%", padding: 16, borderRadius: RADIUS.lg },
  userBubble: { 
    backgroundColor: COLORS.primary, 
    borderBottomRightRadius: 4,
    ...SHADOWS.light,
  },
  assistantBubble: { 
    backgroundColor: COLORS.surface, 
    borderBottomLeftRadius: 4, 
    borderWidth: 1, 
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  messageText: { fontSize: 16, lineHeight: 24, color: COLORS.textMain },
  userText: { color: COLORS.textWhite },
  assistantText: { color: COLORS.textMain },
  savePlanBtn: { 
    marginTop: 10, 
    alignSelf: "flex-end", 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    backgroundColor: COLORS.background, 
    borderRadius: RADIUS.md 
  },
  savePlanBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: "700" },
});
