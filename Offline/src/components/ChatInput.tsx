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
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask MediNova..."
          placeholderTextColor={COLORS.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          editable={!disabled}
        />

        {isGenerating ? (
          <TouchableOpacity
            style={[styles.sendButton, styles.stopButton]}
            onPress={onStop}
          >
            <Text style={styles.sendButtonText}>■</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, isSendDisabled && styles.sendButtonDisabled]}
            onPress={onSend}
            disabled={isSendDisabled}
          >
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    fontSize: 15,
    color: COLORS.textMain,
  },
  sendButton: {
    marginLeft: 10,
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.button,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  stopButton: {
    backgroundColor: COLORS.danger,
  },
  sendButtonText: {
    color: COLORS.surface,
    fontWeight: "600",
    fontSize: 28,
  },
});