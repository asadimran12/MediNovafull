import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import StorageService, { UserProfile } from "../services/StorageService";
import AuthService from "../services/AuthService";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";

interface ForgetPasswordProps {
    onBack: () => void;
}

type Step = "identify" | "verify" | "reset";

export const ForgetPassword = ({ onBack }: ForgetPasswordProps) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [step, setStep] = useState<Step>("identify");

    // Step 1 — identity
    const [username, setUsername] = useState("");
    const [userError, setUserError] = useState("");

    // Step 2 — answer verification
    const [userAnswer, setUserAnswer] = useState("");
    const [answerError, setAnswerError] = useState("");

    // Step 3 — new password
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleIdentify = async () => {
        const name = username.trim().toLowerCase();
        if (!name) {
            setUserError("Please enter your username.");
            return;
        }

        setIsLoading(true);
        const users = await AuthService.getAllUsers();
        const user = users.find(u => u.username.toLowerCase() === name);
        if (!user) {
            setUserError("Username not found. Please try again.");
            setIsLoading(false);
            return;
        }

        // Temporarily set the StorageService userId so it reads from that user's folder
        await StorageService.setUser(user.id);
        const p = await StorageService.getProfile();
        setProfile(p);
        setUserError("");
        setStep("verify");
        setIsLoading(false);
    };

    const handleVerifyAnswer = () => {
        const saved = profile?.forgetPasswordAnswer?.trim().toLowerCase();
        const entered = userAnswer.trim().toLowerCase();
        if (!entered) {
            setAnswerError("Please enter your answer.");
            return;
        }
        if (entered === saved) {
            setAnswerError("");
            setStep("reset");
        } else {
            setAnswerError("Incorrect answer. Please try again.");
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword.trim() || newPassword.length < 4) {
            Alert.alert("Error", "Password must be at least 4 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match.");
            return;
        }

        setIsLoading(true);
        const success = await AuthService.updatePassword(username.trim(), newPassword);
        setIsLoading(false);

        if (success) {
            // Clear target userId from storage just in case
            await StorageService.setUser(null);
            Alert.alert("Success", "Your password has been reset. Please login with your new password.", [
                { text: "OK", onPress: onBack },
            ]);
        } else {
            Alert.alert("Error", "Failed to update password. Please try again.");
        }
    };

    const handleCancelBack = async () => {
        // Clear the StorageService user workspace back to null
        await StorageService.setUser(null);
        onBack();
    };

    const hasQuestion = profile?.forgetPasswordQuestion?.trim();

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <TouchableOpacity onPress={handleCancelBack} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>

                <View style={styles.card}>
                    <Text style={styles.brand}>MediNova</Text>
                    <Text style={styles.title}>
                        {step === "identify" ? "Find Account" : step === "verify" ? "Verify Identity" : "Reset Password"}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === "identify"
                            ? "Enter your username to begin."
                            : step === "verify"
                                ? "Answer your security question to continue."
                                : "Choose a new password for your account."}
                    </Text>

                    {/* ── STEP 1: Identify ── */}
                    {step === "identify" && (
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Username</Text>
                                <TextInput
                                    style={[styles.input, userError ? styles.inputError : null]}
                                    placeholder="Enter your username"
                                    placeholderTextColor={COLORS.textSub}
                                    value={username}
                                    onChangeText={(t) => {
                                        setUsername(t);
                                        setUserError("");
                                    }}
                                    autoCapitalize="none"
                                />
                                {userError ? (
                                    <Text style={styles.errorText}>{userError}</Text>
                                ) : null}
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryBtn, isLoading && styles.disabledBtn]}
                                onPress={handleIdentify}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.primaryBtnText}>Find Account</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── STEP 2: Verify Answer ── */}
                    {step === "verify" && (
                        <View style={styles.form}>
                            {hasQuestion ? (
                                <>
                                    <View style={styles.questionBox}>
                                        <Text style={styles.questionLabel}>Your Security Question</Text>
                                        <Text style={styles.questionText}>{profile?.forgetPasswordQuestion}</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Your Answer</Text>
                                        <TextInput
                                            style={[styles.input, answerError ? styles.inputError : null]}
                                            placeholder="Enter your answer"
                                            placeholderTextColor={COLORS.textSub}
                                            value={userAnswer}
                                            onChangeText={(t) => {
                                                setUserAnswer(t);
                                                setAnswerError("");
                                            }}
                                        />
                                        {answerError ? (
                                            <Text style={styles.errorText}>{answerError}</Text>
                                        ) : null}
                                    </View>

                                    <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyAnswer}>
                                        <Text style={styles.primaryBtnText}>Verify Answer</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={styles.noQuestionBox}>
                                    <Text style={styles.noQuestionText}>
                                        ⚠️ No security question is set on this account. Please contact your administrator or create a new account.
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* ── STEP 3: Reset Password ── */}
                    {step === "reset" && (
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>New Password</Text>
                                <View style={styles.passwordRow}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="••••••••"
                                        placeholderTextColor={COLORS.textSub}
                                        secureTextEntry={!showNew}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowNew(!showNew)}
                                        style={styles.eyeBtn}
                                    >
                                        <Text style={styles.eyeIcon}>{showNew ? "👁️" : "👁️‍🗨️"}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Confirm Password</Text>
                                <View style={styles.passwordRow}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="••••••••"
                                        placeholderTextColor={COLORS.textSub}
                                        secureTextEntry={!showConfirm}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowConfirm(!showConfirm)}
                                        style={styles.eyeBtn}
                                    >
                                        <Text style={styles.eyeIcon}>{showConfirm ? "👁️" : "👁️‍🗨️"}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryBtn, isLoading && styles.disabledBtn]}
                                onPress={handleResetPassword}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.primaryBtnText}>Reset Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: SPACING.lg,
    },
    backBtn: {
        marginBottom: SPACING.md,
        alignSelf: "flex-start",
        padding: SPACING.sm,
    },
    backIcon: {
        fontSize: 24,
        color: COLORS.primary,
        fontWeight: "bold",
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        ...SHADOWS.medium,
    },
    brand: {
        fontSize: 26,
        fontWeight: "900",
        color: COLORS.primary,
        textAlign: "center",
        marginBottom: SPACING.sm,
        letterSpacing: -1,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.textHeader,
        textAlign: "center",
        marginBottom: SPACING.xs,
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.textSub,
        textAlign: "center",
        marginBottom: SPACING.xl,
    },
    form: {
        gap: SPACING.lg,
    },
    questionBox: {
        backgroundColor: "#F0F4FF",
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    questionLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.primary,
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    questionText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textHeader,
    },
    inputGroup: {
        gap: SPACING.xs,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textMain,
        marginLeft: 4,
    },
    input: {
        backgroundColor: "#F8FAFC",
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        color: COLORS.textMain,
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    inputError: {
        borderColor: COLORS.danger ?? "#EF4444",
    },
    errorText: {
        fontSize: 12,
        color: COLORS.danger ?? "#EF4444",
        marginLeft: 4,
    },
    passwordRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        color: COLORS.textMain,
        fontSize: 16,
    },
    eyeBtn: {
        paddingHorizontal: SPACING.md,
        justifyContent: "center",
    },
    eyeIcon: {
        fontSize: 18,
    },
    primaryBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        alignItems: "center",
        marginTop: SPACING.sm,
        ...SHADOWS.light,
    },
    disabledBtn: {
        backgroundColor: COLORS.textMuted,
    },
    primaryBtnText: {
        color: "#FFF",
        fontSize: 17,
        fontWeight: "bold",
    },
    noQuestionBox: {
        backgroundColor: "#FFF8E1",
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        borderLeftWidth: 3,
        borderLeftColor: "#F59E0B",
    },
    noQuestionText: {
        fontSize: 14,
        color: "#92400E",
        lineHeight: 22,
    },
});