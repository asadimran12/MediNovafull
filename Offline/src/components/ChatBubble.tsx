import React, { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from "react-native";
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

/* ── Typing / Loading Bubble ───────────────────────────────── */
interface TypingBubbleProps {
  label?: string;
}

export const TypingBubble: React.FC<TypingBubbleProps> = ({
  label = "Thinking...",
}) => {
  const { colors: COLORS } = useTheme();

  // Three dots with staggered fade
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 350, useNativeDriver: true }),
          Animated.delay(700 - delay),
        ])
      );

    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 200);
    const a3 = pulse(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  return (
    <View style={typingStyles.row}>
      <View
        style={[
          typingStyles.bubble,
          {
            backgroundColor: COLORS.surface,
            borderColor: COLORS.border,
          },
        ]}
      >
        {/* Three animated dots */}
        <View style={typingStyles.dotsRow}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                typingStyles.dot,
                { backgroundColor: COLORS.primary, opacity: dot },
              ]}
            />
          ))}
        </View>
        {/* Status label */}
        <Text style={[typingStyles.label, { color: COLORS.textSub }]}>
          {label}
        </Text>
      </View>
    </View>
  );
};

/* ── Styles ────────────────────────────────────────────────── */
const createStyles = (COLORS: any) =>
  StyleSheet.create({
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
      borderRadius: RADIUS.md,
    },
    savePlanBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: "700" },
  });

const typingStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 16,
    marginTop: 4,
  },
  bubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "flex-start",
    gap: 6,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    fontStyle: "italic",
  },
});
