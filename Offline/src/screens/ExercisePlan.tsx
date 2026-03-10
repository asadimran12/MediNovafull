import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from "react-native";

import { COLORS } from "../constants/theme";

import {
    StructuredExercisePlan,
    ExerciseItem,
    Exercise,
    generateExercisePlan,
    loadLatestExercisePlan,
} from "../services/ExercisePlanGenerator";

/* ─── Exercise Icons ───────────────────────────── */
const EXERCISE_ICONS: Record<string, string> = {
    Warmup: "🔥",
    Main: "💪",
    Cooldown: "🛀",
    Optional: "✨",
};

function getExerciseIcon(type: string): string {
    return EXERCISE_ICONS[type] ?? "🏋️‍♂️";
}

/* ─── Exercise Item Card ───────────────────────── */
const ExerciseItemCard = ({ item }: { item: ExerciseItem }) => (
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

interface ExercisePlansScreenProps {
    onBack?: () => void;
}

export const ExercisePlansScreen: React.FC<ExercisePlansScreenProps> = ({ onBack }) => {
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [plan, setPlan] = useState<StructuredExercisePlan | null>(null);
    const [loading, setLoading] = useState(false);
    const [progressDay, setProgressDay] = useState("");
    const [completedItems, setCompletedItems] = useState<string[]>([]);

    /* Load latest plan */
    useEffect(() => {
        (async () => {
            const latest = await loadLatestExercisePlan();
            if (latest?.days?.length) setPlan(latest);
        })();
    }, []);

    /* Reset completion when day changes */
    useEffect(() => {
        setCompletedItems([]);
    }, [selectedDayIndex]);

    const days = plan?.days ?? [];
    const currentDay = days[selectedDayIndex];

    /* Progress calculation */
    const totalItems =
        currentDay?.exercises?.reduce(
            (acc, section) => acc + (section.items?.length ?? 0),
            0
        ) ?? 0;

    const progress =
        totalItems === 0
            ? 0
            : Math.round((completedItems.length / totalItems) * 100);

    const toggleItem = (si: number, ii: number) => {
        const key = `${si}-${ii}`;
        setCompletedItems((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    /* Generate exercise plan */
    const handleGeneratePlan = async () => {
        setLoading(true);
        setProgressDay("Starting...");
        try {
            await generateExercisePlan((dayName, index) => {
                setProgressDay(`Generating ${dayName} (${index + 1}/7)...`);
            });

            const latest = await loadLatestExercisePlan();
            if (latest?.days?.length) setPlan(latest);

            setSelectedDayIndex(0);
        } catch (err) {
            console.error("Failed to generate exercise plan", err);
        } finally {
            setLoading(false);
            setProgressDay("");
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
            {/* Header with Back Button */}
            {onBack && (
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Generate Button */}
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
                    <Text style={styles.generateButtonText}>
                        ✨ Generate Exercise Plan
                    </Text>
                )}
            </TouchableOpacity>

            {days.length > 0 ? (
                <>
                    {/* Day Tabs */}
                    <View style={styles.topBar}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                            }}
                        >
                            {days.map((day, index) => {
                                const isSelected = selectedDayIndex === index;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => setSelectedDayIndex(index)}
                                        style={[
                                            styles.dayCircle,
                                            isSelected && styles.dayCircleSelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.dayText,
                                                isSelected && styles.dayTextSelected,
                                            ]}
                                        >
                                            {day.day?.substring(0, 3) ?? `D${index + 1}`}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Day Content */}
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
                    >
                        {/* Progress */}
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressTitle}>Today's Workout Progress</Text>

                            <View style={styles.progressBarBackground}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${progress}%` },
                                    ]}
                                />
                            </View>

                            <Text style={styles.progressPercent}>{progress}% Completed</Text>
                        </View>

                        {/* Exercise Sections */}
                        {currentDay?.exercises.map((section: Exercise, si: number) => {
                            const completed =
                                section.items.length > 0 &&
                                section.items.every((_, ii) =>
                                    completedItems.includes(`${si}-${ii}`)
                                );

                            return (
                                <View
                                    key={si}
                                    style={[
                                        styles.mealSection,
                                        completed && styles.sectionCompleted,
                                    ]}
                                >
                                    <View style={styles.mealHeader}>
                                        <Text style={styles.mealIcon}>
                                            {getExerciseIcon(section.type)}
                                        </Text>

                                        <Text style={styles.mealTitle}>{section.type}</Text>

                                        {completed && <Text style={styles.check}>✔</Text>}
                                    </View>

                                    {section.items.map((item, ii) => {
                                        const completed = completedItems.includes(`${si}-${ii}`);

                                        return (
                                            <View key={ii} style={styles.exerciseItemWrapper}>
                                                <ExerciseItemCard item={item} />

                                                <TouchableOpacity
                                                    style={[
                                                        styles.circle,
                                                        completed && styles.circleCompleted
                                                    ]}
                                                    onPress={() => toggleItem(si, ii)}
                                                >
                                                    {completed && <Text style={styles.tick}>✓</Text>}
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
                        Tap "Generate Exercise Plan" above to create a personalised 7-day
                        plan.
                    </Text>
                </View>
            )}
        </View>
    );
};

/* ─── Styles ────────────────────────────────────────────── */
const styles = StyleSheet.create({
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

    generateButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },

    topBar: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },

    dayCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
        backgroundColor: "#fff",
    },

    dayCircleSelected: {
        backgroundColor: COLORS.primary,
    },

    dayText: {
        color: COLORS.primary,
        fontWeight: "bold",
        fontSize: 12,
    },

    dayTextSelected: {
        color: "#fff",
    },

    progressContainer: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },

    progressTitle: {
        fontWeight: "700",
        marginBottom: 10,
    },

    progressBarBackground: {
        height: 12,
        backgroundColor: "#eee",
        borderRadius: 6,
        overflow: "hidden",
    },

    progressBarFill: {
        height: "100%",
        backgroundColor: "#27ae60",
    },

    progressPercent: {
        marginTop: 6,
        fontWeight: "600",
        textAlign: "right",
    },

    mealSection: {
        marginBottom: 22,
    },

    mealHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        gap: 8,
    },

    mealIcon: {
        fontSize: 20,
    },

    mealTitle: {
        fontWeight: "800",
        fontSize: 17,
        color: "#222",
    },

    exerciseItemWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
    },

    exerciseCard: {
        flex: 1,
    },

    exerciseName: {
        fontWeight: "700",
        fontSize: 15,
        marginBottom: 6,
    },

    exerciseDetails: {
        fontSize: 13,
        color: "#555",
    },

    circle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "#ddd",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 12,
    },

    circleCompleted: {
        backgroundColor: "#27ae60",
        borderColor: "#27ae60",
    },

    tick: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },

    sectionCompleted: {
        opacity: 0.5,
    },

    check: {
        marginLeft: "auto",
        fontSize: 16,
        color: "#27ae60",
        fontWeight: "bold",
    },

    empty: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },

    emptyIcon: {
        fontSize: 64,
        marginBottom: 14,
    },

    emptyTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#333",
        marginBottom: 8,
    },

    emptySubtitle: {
        fontSize: 14,
        color: "#888",
        textAlign: "center",
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    backButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    backButtonText: {
        color: COLORS.primary,
        fontWeight: "700",
        fontSize: 14,
    },
});
