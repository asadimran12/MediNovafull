import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Modal,
    Switch,
    TextInput,
    Animated,
} from "react-native";
import { ChevronDown } from "lucide-react-native";

import NotificationService, { ReminderTimes } from "../services/NotificationService";
import storageService, { HealthPlan } from "../services/StorageService";
import {
    StructuredExercisePlan,
    ExerciseItem,
    Exercise,
    generateExercisePlan,
    loadLatestExercisePlan,
} from "../services/ExercisePlanGenerator";

/* ─── Pop Message ──────────────────────────────────────────── */
type PopType = "success" | "error";

interface PopMessageProps {
    message: string;
    type: PopType;
    onHide: () => void;
}

const PopMessage: React.FC<PopMessageProps> = ({ message, type, onHide }) => {
    const translateY = useRef(new Animated.Value(-80)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(translateY, { toValue: -80, duration: 300, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start(() => onHide());
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const isSuccess = type === "success";

    return (
        <Animated.View
            style={[
                popStyles.container,
                isSuccess ? popStyles.success : popStyles.error,
                { transform: [{ translateY }], opacity },
            ]}
        >
            <View style={[popStyles.iconCircle, isSuccess ? popStyles.iconSuccess : popStyles.iconError]}>
                <Text style={popStyles.icon}>{isSuccess ? "✓" : "✕"}</Text>
            </View>
            <Text style={[popStyles.message, isSuccess ? popStyles.messageSuccess : popStyles.messageError]}>
                {message}
            </Text>
            <TouchableOpacity onPress={onHide} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[popStyles.close, isSuccess ? popStyles.messageSuccess : popStyles.messageError]}>✕</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

const popStyles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 12,
        left: 16,
        right: 16,
        zIndex: 9999,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 14,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    success: {
        backgroundColor: "#EDFBF3",
        borderWidth: 1.5,
        borderColor: "#6EE0A0",
    },
    error: {
        backgroundColor: "#FEF0F0",
        borderWidth: 1.5,
        borderColor: "#F5A0A0",
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    iconSuccess: { backgroundColor: "#22C55E" },
    iconError: { backgroundColor: "#EF4444" },
    icon: { color: "#fff", fontSize: 13, fontWeight: "800" },
    message: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
    messageSuccess: { color: "#14532D" },
    messageError: { color: "#7F1D1D" },
    close: { fontSize: 14, fontWeight: "700", opacity: 0.5 },
});

/* ─── Exercise Icons ───────────────────────────────────────── */
const EXERCISE_ICONS: Record<string, string> = {
    Warmup: "🔥",
    Main: "💪",
    Cooldown: "🛀",
    Optional: "✨",
};
function getExerciseIcon(type: string): string {
    return EXERCISE_ICONS[type] ?? "🏋️‍♂️";
}

/* ─── Exercise Item Card ───────────────────────────────────── */
const ExerciseItemCard = ({ item }: { item: ExerciseItem }) => {
    const { colors: COLORS } = useTheme();
    const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
    return (
        <View style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{item.name}</Text>
            <Text style={styles.exerciseDetails}>
                Duration: {item.duration}
                {item.sets ? ` | Sets: ${item.sets}` : ""}
                {item.reps ? ` | Reps: ${item.reps}` : ""}
                {" | "}Intensity: {item.intensity}
            </Text>
        </View>
    );
};

/* ─── Helpers ──────────────────────────────────────────────── */
function getTodayIndex(): number {
    return (new Date().getDay() + 6) % 7;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

interface ExercisePlansScreenProps {
    onBack?: () => void;
}

/* ─── Main Screen ──────────────────────────────────────────── */
export const ExercisePlansScreen: React.FC<ExercisePlansScreenProps> = ({ onBack }) => {
    const { colors: COLORS } = useTheme();
    const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

    /* ─── Pop message state ─ */
    const [popMsg, setPopMsg] = useState<{ message: string; type: PopType } | null>(null);
    const showSuccess = (message: string) => setPopMsg({ message, type: "success" });
    const showError = (message: string) => setPopMsg({ message, type: "error" });

    /* ─── Confirm modal (replaces Alert confirm) ─ */
    const [confirmModal, setConfirmModal] = useState<{
        title: string; body: string; onConfirm: () => void;
    } | null>(null);
    const showConfirm = (title: string, body: string, onConfirm: () => void) =>
        setConfirmModal({ title, body, onConfirm });

    const [selectedDayIndex, setSelectedDayIndex] = useState(getTodayIndex());
    const [activePlan, setActivePlan] = useState<StructuredExercisePlan | null>(null);
    const [activePlanId, setActivePlanId] = useState<string | null>(null);
    const [pendingPlan, setPendingPlan] = useState<StructuredExercisePlan | null>(null);
    const [loading, setLoading] = useState(false);
    const [progressDay, setProgressDay] = useState("");
    const [completedItems, setCompletedItems] = useState<string[]>([]);
    const [savedPlans, setSavedPlans] = useState<HealthPlan[]>([]);
    const [showManageModal, setShowManageModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const headerProgress = useRef(new Animated.Value(1)).current;

    const toggleHeader = () => {
        const toValue = isHeaderVisible ? 0 : 1;
        setIsHeaderVisible(v => !v);
        Animated.timing(headerProgress, {
            toValue,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const headerMaxHeight = headerProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 500],
    });
    const headerOpacity = headerProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });
    const chevronRotation = headerProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', '0deg'],
    });

    type UIConfig = { exercise: { enabled: boolean; hour: string; minute: string } };
    const [reminders, setReminders] = useState<UIConfig | null>(null);

    useEffect(() => {
        NotificationService.getReminders().then(res => {
            setReminders({
                exercise: {
                    enabled: res.exercise.enabled,
                    hour: res.exercise.hour.toString().padStart(2, "0"),
                    minute: res.exercise.minute.toString().padStart(2, "0"),
                },
            });
        });
    }, []);

    const handleSaveReminders = async () => {
        if (!reminders) return;
        try {
            const currentObj = await NotificationService.getReminders();
            const finalConfig: ReminderTimes = {
                ...currentObj,
                exercise: {
                    enabled: reminders.exercise.enabled,
                    hour: Math.max(0, Math.min(23, parseInt(reminders.exercise.hour) || 0)),
                    minute: Math.max(0, Math.min(59, parseInt(reminders.exercise.minute) || 0)),
                },
            };
            await NotificationService.applyReminderConfig(finalConfig);
            setReminders({
                exercise: {
                    enabled: finalConfig.exercise.enabled,
                    hour: finalConfig.exercise.hour.toString().padStart(2, "0"),
                    minute: finalConfig.exercise.minute.toString().padStart(2, "0"),
                },
            });
            setShowReminderModal(false);
            showSuccess("Exercise reminder updated successfully!");
        } catch {
            showError("Failed to save reminder. Please try again.");
        }
    };

    const updateExerciseReminder = (field: "enabled" | "hour" | "minute", value: any) => {
        if (field === "hour" || field === "minute") value = value.replace(/[^0-9]/g, "");
        setReminders(prev => prev ? { ...prev, exercise: { ...prev.exercise, [field]: value } } : null);
    };

    /* ─── Load plans ─ */
    const loadPlans = useCallback(async () => {
        const all = await storageService.getPlans("exercise");
        setSavedPlans(all);
        if (all.length > 0 && !activePlan) {
            const latest = await loadLatestExercisePlan();
            if (latest?.days?.length) {
                setActivePlan(latest);
                setActivePlanId(all[0].id);
            }
        }
    }, [activePlan]);

    useEffect(() => { loadPlans(); }, []);
    useEffect(() => { setCompletedItems([]); }, [selectedDayIndex]);

    /* ─── Generate plan ─ */
    const handleGeneratePlan = async () => {
        setLoading(true);
        setPendingPlan(null);
        setProgressDay("Starting...");
        try {
            const result = await generateExercisePlan(
                (dayName, index) => setProgressDay(`Generating ${dayName} (${index + 1}/7)...`),
                { autoSave: false }
            );
            if (result) {
                setPendingPlan(result as StructuredExercisePlan);
                setSelectedDayIndex(getTodayIndex());
            }
        } catch (err: any) {
            showError(err?.message ?? "Generation failed. Please try again.");
        } finally {
            setLoading(false);
            setProgressDay("");
        }
    };

    /* ─── Save pending plan ─ */
    const handleSavePlan = async () => {
        if (!pendingPlan) return;
        try {
            const id = Date.now().toString();
            await storageService.savePlan({
                id,
                type: "exercise",
                title: pendingPlan.title,
                content: JSON.stringify(pendingPlan),
                createdAt: new Date().toISOString(),
            });
            setActivePlan(pendingPlan);
            setActivePlanId(id);
            setPendingPlan(null);
            await loadPlans();
            showSuccess("Exercise plan saved successfully!");
        } catch {
            showError("Failed to save the plan. Please try again.");
        }
    };

    /* ─── Delete plan ─ */
    const handleDeletePlan = (id: string) => {
        showConfirm("Delete Plan", "Remove this saved plan?", async () => {
            try {
                await storageService.deletePlan(id);
                await loadPlans();
                showSuccess("Plan deleted.");
            } catch {
                showError("Could not delete the plan.");
            }
        });
    };

    /* ─── Use saved plan ─ */
    const handleUsePlan = (plan: HealthPlan) => {
        try {
            const parsed = JSON.parse(plan.content) as StructuredExercisePlan;
            setActivePlan(parsed);
            setActivePlanId(plan.id);
            setPendingPlan(null);
            setSelectedDayIndex(getTodayIndex());
            setShowManageModal(false);
            showSuccess(`Now using "${plan.title}"`);
        } catch {
            showError("Could not load that plan. It may be corrupted.");
        }
    };

    /* ─── Derived ─ */
    const displayPlan = pendingPlan ?? activePlan;
    const days = displayPlan?.days ?? [];
    const currentDay = days[selectedDayIndex];

    const totalItems =
        currentDay?.exercises?.reduce((acc, section) => acc + (section.items?.length ?? 0), 0) ?? 0;
    const progress =
        totalItems === 0 ? 0 : Math.round((completedItems.length / totalItems) * 100);

    const toggleItem = (si: number, ii: number) => {
        const key = `${si}-${ii}`;
        setCompletedItems(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>

            {/* ── Pop Message ── */}
            {popMsg && (
                <PopMessage
                    message={popMsg.message}
                    type={popMsg.type}
                    onHide={() => setPopMsg(null)}
                />
            )}

            {/* ── Confirm Modal ── */}
            <Modal visible={!!confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
                <View style={styles.confirmOverlay}>
                    <View style={[styles.confirmBox, { backgroundColor: COLORS.surface }]}>
                        <Text style={styles.confirmTitle}>{confirmModal?.title}</Text>
                        <Text style={styles.confirmBody}>{confirmModal?.body}</Text>
                        <View style={styles.confirmActions}>
                            <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmModal(null)}>
                                <Text style={[styles.confirmCancelText, { color: COLORS.textSub }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmDelete}
                                onPress={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}
                            >
                                <Text style={styles.confirmDeleteText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Header ── */}
            <View style={styles.headerContainer}>
                <View style={styles.headerTopRow}>
                    {onBack ? (
                        <TouchableOpacity onPress={onBack}>
                            <View style={{ backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                                <Text style={{ fontSize: 16, color: COLORS.primary, fontWeight: "700" }}>‹ Back</Text>
                            </View>
                        </TouchableOpacity>
                    ) : <View style={{ width: 70 }} />}

                    <View style={{ alignItems: "center" }}>
                        <Text style={styles.screenTitle}>Exercise Plan</Text>
                        <Text style={{ color: "#fff", opacity: 0.8, textAlign: "center", marginTop: 4 }}>
                            Your personalized workout
                        </Text>
                    </View>
                    <View style={{ width: 70 }} />
                </View>

                <View style={styles.headerActionRow}>
                    <TouchableOpacity onPress={() => setShowReminderModal(true)} style={styles.headerActionBtn}>
                        <Text style={styles.headerActionBtnText}>🔔 Reminders</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowManageModal(true)} style={styles.headerActionBtn}>
                        <Text style={styles.headerActionBtnText}>📋 Manage Plans</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Stats/Actions ── */}
            <Animated.View
                style={{
                    opacity: headerOpacity,
                    maxHeight: headerMaxHeight,
                    overflow: 'hidden',
                }}
            >
                {pendingPlan ? (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleSavePlan}>
                            <Text style={styles.actionBtnText}>💾 Save Plan</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.regenBtn]} onPress={handleGeneratePlan} disabled={loading}>
                            <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>🔄 Generate Another</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.generateButton, loading && { backgroundColor: "#aaa" }]}
                        onPress={handleGeneratePlan}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={styles.generateButtonText}>{progressDay}</Text>
                            </View>
                        ) : (
                            <Text style={styles.generateButtonText}>✨ Generate Exercise Plan</Text>
                        )}
                    </TouchableOpacity>
                )}

                {pendingPlan && (
                    <View style={styles.unsavedBadge}>
                        <Text style={styles.unsavedBadgeText}>⚠️ Preview — not saved yet</Text>
                    </View>
                )}
            </Animated.View>

            {/* ── Toggle Button ── */}
            <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 5 }}>
                <TouchableOpacity
                    onPress={toggleHeader}
                    style={{ padding: 6, backgroundColor: COLORS.surface, borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } }}
                >
                    <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                        <ChevronDown size={24} color={COLORS.textSub} />
                    </Animated.View>
                </TouchableOpacity>
            </View>

            {/* ── Day Tabs + Content ── */}
            {days.length > 0 ? (
                <>
                    <View style={styles.topBar}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}
                        >
                            {days.map((day, index) => {
                                const isSelected = selectedDayIndex === index;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => setSelectedDayIndex(index)}
                                        style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}
                                    >
                                        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                                            {day.day?.substring(0, 3) ?? `D${index + 1}`}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
                        {/* Progress */}
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressTitle}>Today's Workout Progress</Text>
                            <View style={styles.progressBarBackground}>
                                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                            </View>
                            <Text style={styles.progressPercent}>
                                {completedItems.length}/{totalItems} items · {progress}% done
                            </Text>
                        </View>

                        {/* Trainer Tip */}
                        {currentDay?.trainerTip && (
                            <View style={styles.tipCard}>
                                <View style={styles.tipHeader}>
                                    <Text style={styles.tipIcon}>💡</Text>
                                    <Text style={styles.tipTitle}>AI Coach Tip</Text>
                                </View>
                                <Text style={styles.tipText}>{currentDay.trainerTip}</Text>
                            </View>
                        )}

                        {/* Exercise Sections */}
                        {currentDay?.exercises.map((section: Exercise, si: number) => {
                            const sectionDone =
                                section.items.length > 0 &&
                                section.items.every((_, ii) => completedItems.includes(`${si}-${ii}`));
                            return (
                                <View key={si} style={[styles.mealSection, sectionDone && styles.sectionCompleted]}>
                                    <View style={styles.mealHeader}>
                                        <Text style={styles.mealIcon}>{getExerciseIcon(section.type)}</Text>
                                        <Text style={styles.mealTitle}>{section.type}</Text>
                                        {sectionDone && <Text style={styles.check}>✔</Text>}
                                    </View>
                                    {section.items.map((item, ii) => {
                                        const done = completedItems.includes(`${si}-${ii}`);
                                        return (
                                            <View key={ii} style={styles.exerciseItemWrapper}>
                                                <ExerciseItemCard item={item} />
                                                <TouchableOpacity
                                                    style={[styles.circle, done && styles.circleCompleted]}
                                                    onPress={() => toggleItem(si, ii)}
                                                >
                                                    {done && <Text style={styles.tick}>✓</Text>}
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        })}
                    </ScrollView>
                </>
            ) : (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>🏋️‍♂️</Text>
                    <Text style={styles.emptyTitle}>No Exercise Plan Yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Tap "Generate Exercise Plan" above to create a personalised 7-day plan.
                    </Text>
                </View>
            )}

            {/* ── Manage Plans Modal ── */}
            <Modal visible={showManageModal} transparent animationType="slide" onRequestClose={() => setShowManageModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowManageModal(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>📋 Saved Exercise Plans</Text>
                        {savedPlans.length === 0 ? (
                            <Text style={styles.modalEmpty}>No saved plans yet.</Text>
                        ) : (
                            <ScrollView style={{ maxHeight: 400 }}>
                                {savedPlans.map(plan => {
                                    const isActive = plan.id === activePlanId;
                                    return (
                                        <View key={plan.id} style={[styles.planRow, isActive && styles.planRowActive]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.planRowTitle}>{plan.title}</Text>
                                                <Text style={styles.planRowDate}>{formatDate(plan.createdAt)}</Text>
                                                {isActive && (
                                                    <View style={styles.inUseBadge}>
                                                        <Text style={styles.inUseBadgeText}>● In Use</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.useBtn, isActive && styles.useBtnDisabled]}
                                                onPress={() => !isActive && handleUsePlan(plan)}
                                                disabled={isActive}
                                            >
                                                <Text style={styles.useBtnText}>{isActive ? "Active" : "Use"}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeletePlan(plan.id)}>
                                                <Text style={styles.deleteBtnText}>🗑</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowManageModal(false)}>
                            <Text style={styles.modalCloseBtnText}>Close</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* ── Reminder Modal ── */}
            <Modal visible={showReminderModal} transparent animationType="fade" onRequestClose={() => setShowReminderModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { backgroundColor: COLORS.surface }]}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>🔔 Exercise Reminder</Text>

                        {reminders && (
                            <View style={styles.reminderRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.planRowTitle}>Daily Workout</Text>
                                </View>
                                <View style={styles.timeInputContainer}>
                                    <TextInput
                                        style={styles.timeInput}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        selectTextOnFocus
                                        value={reminders.exercise.hour}
                                        onChangeText={t => updateExerciseReminder("hour", t)}
                                    />
                                    <Text style={{ fontWeight: "bold", color: COLORS.textHeader }}>:</Text>
                                    <TextInput
                                        style={styles.timeInput}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        selectTextOnFocus
                                        value={reminders.exercise.minute}
                                        onChangeText={t => updateExerciseReminder("minute", t)}
                                    />
                                </View>
                                <Switch
                                    value={reminders.exercise.enabled}
                                    onValueChange={v => updateExerciseReminder("enabled", v)}
                                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                                />
                            </View>
                        )}

                        <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleSaveReminders}>
                            <Text style={styles.modalPrimaryBtnText}>Set Workout Reminder</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalCloseBtn, { marginTop: 10 }]} onPress={() => setShowReminderModal(false)}>
                            <Text style={styles.modalCloseBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

/* ─── Styles ───────────────────────────────────────────────── */
const createStyles = (COLORS: any) => StyleSheet.create({
    headerContainer: {
        backgroundColor: COLORS.primary,
        paddingTop: 20,
        paddingBottom: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        elevation: 10,
    },
    headerTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    screenTitle: { fontSize: 22, fontWeight: "800", color: "#fff", textAlign: "center" },
    headerActionRow: { flexDirection: "row", justifyContent: "center", gap: 12 },
    headerActionBtn: {
        backgroundColor: COLORS.surface,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerActionBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },

    generateButton: {
        backgroundColor: COLORS.primary,
        padding: 14,
        margin: 16,
        borderRadius: 12,
        alignItems: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    generateButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    unsavedBadge: {
        alignSelf: "center",
        backgroundColor: COLORS.fullNoticeBg || "#fff3cd",
        borderWidth: 1,
        borderColor: COLORS.fullNoticeBorder || "#ffc107",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 6,
    },
    unsavedBadgeText: { color: COLORS.fullNoticeText || "#856404", fontSize: 12, fontWeight: "600" },

    actionRow: { flexDirection: "row", marginHorizontal: 16, marginVertical: 10, gap: 10 },
    actionBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
    saveBtn: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    regenBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: COLORS.primary },
    actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    topBar: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    dayCircle: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f1f5f9", marginRight: 8 },
    dayCircleSelected: { backgroundColor: COLORS.primary },
    dayText: { fontSize: 13, fontWeight: "600", color: "#555" },
    dayTextSelected: { color: "#fff" },

    progressContainer: { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 20, elevation: 3 },
    progressTitle: { fontWeight: "700", marginBottom: 10, fontSize: 14, color: COLORS.textHeader },
    progressBarBackground: { height: 10, backgroundColor: "#eee", borderRadius: 10 },
    progressBarFill: { height: "100%", backgroundColor: "#22c55e", borderRadius: 10 },
    progressPercent: { marginTop: 6, fontWeight: "600", textAlign: "right", color: "#22c55e" },

    tipCard: {
        backgroundColor: "rgba(52,152,219,0.08)",
        borderLeftWidth: 4,
        borderLeftColor: "#3498db",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    tipHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
    tipIcon: { fontSize: 18 },
    tipTitle: { fontSize: 14, fontWeight: "800", color: "#2980b9", textTransform: "uppercase", letterSpacing: 0.5 },
    tipText: { fontSize: 15, color: "#34495e", lineHeight: 22, fontWeight: "500" },

    mealSection: { marginBottom: 22 },
    mealHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
    mealIcon: { fontSize: 20 },
    mealTitle: { fontWeight: "800", fontSize: 17, color: COLORS.textHeader },
    sectionCompleted: { opacity: 0.5 },
    check: { marginLeft: "auto", fontSize: 16, color: "#27ae60", fontWeight: "bold" },

    exerciseItemWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
    },
    exerciseCard: { flex: 1 },
    exerciseName: { fontWeight: "700", fontSize: 15, marginBottom: 6, color: COLORS.textHeader },
    exerciseDetails: { fontSize: 13, color: COLORS.textSub },
    circle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: COLORS.border, justifyContent: "center", alignItems: "center", marginLeft: 12 },
    circleCompleted: { backgroundColor: COLORS.success, borderColor: COLORS.success },
    tick: { color: "#fff", fontSize: 16, fontWeight: "bold" },

    empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
    emptyIcon: { fontSize: 64, marginBottom: 14 },
    emptyTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textHeader, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: COLORS.textSub, textAlign: "center" },

    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34 },
    modalHandle: { width: 40, height: 4, backgroundColor: "#ddd", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textHeader, marginBottom: 16 },
    modalEmpty: { color: COLORS.textSub, textAlign: "center", marginVertical: 30, fontSize: 15 },
    planRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.background, borderRadius: 12, padding: 14, marginBottom: 10, gap: 10 },
    planRowTitle: { fontWeight: "700", fontSize: 14, color: COLORS.textHeader },
    planRowDate: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
    planRowActive: { borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.surface },
    inUseBadge: { marginTop: 4, alignSelf: "flex-start", backgroundColor: "rgba(39,174,96,0.12)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    inUseBadgeText: { color: "#27ae60", fontSize: 11, fontWeight: "700" },
    useBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
    useBtnDisabled: { backgroundColor: "#27ae60" },
    useBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
    deleteBtn: { backgroundColor: "rgba(255,69,58,0.15)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
    deleteBtnText: { fontSize: 16, color: COLORS.danger },
    modalCloseBtn: { marginTop: 16, backgroundColor: COLORS.background, padding: 14, borderRadius: 12, alignItems: "center" },
    modalCloseBtnText: { color: COLORS.textSub, fontWeight: "700", fontSize: 15 },
    modalPrimaryBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
        marginTop: 10,
    },
    modalPrimaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },

    reminderRow: { flexDirection: "row", alignItems: "center", marginBottom: 15, backgroundColor: COLORS.background, padding: 12, borderRadius: 10 },
    timeInputContainer: { flexDirection: "row", alignItems: "center", marginRight: 15 },
    timeInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, fontSize: 16, fontWeight: "600", textAlign: "center", minWidth: 40, marginHorizontal: 4, color: COLORS.textHeader },

    /* ── Confirm modal ── */
    confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 32 },
    confirmBox: { width: "100%", borderRadius: 18, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12 },
    confirmTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textHeader, marginBottom: 8 },
    confirmBody: { fontSize: 14, color: COLORS.textSub, lineHeight: 20, marginBottom: 24 },
    confirmActions: { flexDirection: "row", gap: 12 },
    confirmCancel: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center" },
    confirmCancelText: { fontWeight: "700", fontSize: 15 },
    confirmDelete: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: "#EF4444", alignItems: "center" },
    confirmDeleteText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});