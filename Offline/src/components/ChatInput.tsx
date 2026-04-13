import React from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  onSend,
  onStop,
  isGenerating,
  disabled,
}) => {
  const isSendDisabled = disabled || !inputText.trim();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.wrapper}>
        <View style={styles.inputRow}>
          {/* Text Input */}
          <TextInput
            style={styles.input}
            placeholder="Ask MediNova anything…"
            placeholderTextColor="#A0AEC0"
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!disabled}
          />

          {/* Stop Button */}
          {isGenerating ? (
            <TouchableOpacity style={styles.stopBtn} onPress={onStop} activeOpacity={0.8}>
              <View style={styles.stopIcon} />
            </TouchableOpacity>
          ) : (
            /* Send Button */
            <TouchableOpacity
              style={[styles.sendBtn, isSendDisabled && styles.sendBtnDisabled]}
              onPress={onSend}
              disabled={isSendDisabled}
              activeOpacity={0.8}
            >
              <Text style={styles.sendArrow}>↑</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Hint text */}
        <Text style={styles.hint}>MediNova AI • Offline & Private</Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === "ios" ? SPACING.lg : SPACING.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#F1F5F9",
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 52,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 38,
    fontSize: 15,
    color: COLORS.textMain,
    paddingTop: Platform.OS === "ios" ? 6 : 4,
    paddingBottom: 4,
    lineHeight: 22,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.button,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    shadowColor: COLORS.button,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: "#CBD5E0",
    shadowOpacity: 0,
    elevation: 0,
  },
  sendArrow: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: -1,
  },
  stopBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  stopIcon: {
    width: 13,
    height: 13,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  hint: {
    textAlign: "center",
    fontSize: 10,
    color: "#A0AEC0",
    marginTop: 6,
    letterSpacing: 0.3,
  },
});