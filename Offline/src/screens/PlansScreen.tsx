import React, { useEffect, useState, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
  TextInput,
} from "react-native";

import NotificationService, { ReminderTimes } from "../services/NotificationService";


import storageService, { HealthPlan } from "../services/StorageService";
import {
  StructuredDietPlan,
  MealItem,
  generateDietPlan,
  loadLatestDietPlan,
  sanitisePlan,
  safeParseDietPlan,
} from "../services/DietPlanGenerator";

interface PlansScreenProps {
  type: "diet" | "exercise";
  plans: HealthPlan[];
  onDelete: (id: string) => void;
  onBack?: () => void;
}

/* ─── Meal icons ───────────────────────────────────────────── */
const MEAL_ICONS: Record<string, string> = {
  breakfast: "🍳",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
  snacks: "🍎",
};

function getMealIcon(type: string): string {
  return MEAL_ICONS[type?.toLowerCase()] ?? "🍴";
}

/* ─── MacroPill ────────────────────────────────────────────── */
const MacroPill = ({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
      <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </View>
  );
};

/* ─── FoodItemCard ─────────────────────────────────────────── */
const FoodItemCard = ({ item }: { item: MealItem }) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.foodCard}>
      <Text style={styles.foodName}>{item.name}</Text>
      <View style={styles.pillRow}>
        <MacroPill label="cal" value={item.calories} color="#e17055" bg="#ffeaa744" />
        <MacroPill label="protein" value={item.protein} color={COLORS.primary} bg={COLORS.primary + "22"} />
        <MacroPill label="carbs" value={item.carbs} color="#6c5ce7" bg="#6c5ce722" />
        <MacroPill label="fat" value={item.fat} color="#e0a800" bg="#fdcb6e33" />
      </View>
    </View>
  );
};

/* ─── Helpers ─────────────────────────────────────────────── */
function getTodayIndex(): number {
  const day = new Date().getDay(); // 0 is Sunday, 1 is Monday...
  return (day + 6) % 7; // Map so index 0 = Monday, ..., index 6 = Sunday
}

function normalizeMeals(meals: any[]): MealItem[][] {
  return meals.map((meal) => {
    try {
      const extractSafeItem = (raw: any): MealItem | null => {
        if (!raw || typeof raw !== "object") return null;
        if (!raw.name && !raw.calories && !raw.protein) return null;
        const safeString = (val: any) => {
          if (val === undefined || val === null) return "-";
          if (typeof val === "object") {
            return String(val.amount ?? val.value ?? val.qty ?? Object.values(val)[0] ?? "-");
          }
          return String(val);
        };
        return {
          name: typeof raw.name === "string" ? raw.name : "Meal",
          calories: Number(raw.calories) || 0,
          protein: safeString(raw.protein),
          carbs: safeString(raw.carbs),
          fat: safeString(raw.fat),
        };
      };
      if (Array.isArray(meal.items)) {
        const mapped = meal.items.map(extractSafeItem).filter(Boolean) as MealItem[];
        if (mapped.length > 0) return mapped;
      }
      if (Array.isArray(meal)) {
        const mapped = meal.map(extractSafeItem).filter(Boolean) as MealItem[];
        if (mapped.length > 0) return mapped;
      }
      const safeSingle = extractSafeItem(meal);
      if (safeSingle) return [safeSingle];
    } catch (e) {
      console.warn("normalizeMeals failed on item:", meal, e);
    }
    return [];
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/* ─── Main Screen ──────────────────────────────────────────── */
export const PlansScreen: React.FC<PlansScreenProps> = ({ type, plans, onBack }) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  const [selectedDayIndex, setSelectedDayIndex] = useState(getTodayIndex());
  const [activePlan, setActivePlan] = useState<StructuredDietPlan | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<StructuredDietPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressDay, setProgressDay] = useState<string>("");
  const [planNumbers, setPlanNumbers] = useState({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
  const [savedPlans, setSavedPlans] = useState<HealthPlan[]>([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [completedMeals, setCompletedMeals] = useState<number[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);

  type UIConfig = Record<'breakfast' | 'lunch' | 'snack' | 'dinner', { enabled: boolean; hour: string; minute: string }>;
  const [reminders, setReminders] = useState<UIConfig | null>(null);

  useEffect(() => {
    NotificationService.getReminders().then(res => {
      setReminders({
        breakfast: { enabled: res.breakfast.enabled, hour: res.breakfast.hour.toString().padStart(2, '0'), minute: res.breakfast.minute.toString().padStart(2, '0') },
        lunch: { enabled: res.lunch.enabled, hour: res.lunch.hour.toString().padStart(2, '0'), minute: res.lunch.minute.toString().padStart(2, '0') },
        snack: { enabled: res.snack.enabled, hour: res.snack.hour.toString().padStart(2, '0'), minute: res.snack.minute.toString().padStart(2, '0') },
        dinner: { enabled: res.dinner.enabled, hour: res.dinner.hour.toString().padStart(2, '0'), minute: res.dinner.minute.toString().padStart(2, '0') },
      });
    });
  }, []);

  const handleSaveReminders = async () => {
    if (reminders) {
      const finalConfig: ReminderTimes = {
        breakfast: { enabled: reminders.breakfast.enabled, hour: parseInt(reminders.breakfast.hour) || 0, minute: parseInt(reminders.breakfast.minute) || 0 },
        lunch: { enabled: reminders.lunch.enabled, hour: parseInt(reminders.lunch.hour) || 0, minute: parseInt(reminders.lunch.minute) || 0 },
        snack: { enabled: reminders.snack.enabled, hour: parseInt(reminders.snack.hour) || 0, minute: parseInt(reminders.snack.minute) || 0 },
        dinner: { enabled: reminders.dinner.enabled, hour: parseInt(reminders.dinner.hour) || 0, minute: parseInt(reminders.dinner.minute) || 0 },
        exercise: (await NotificationService.getReminders()).exercise // preserve exercise
      };

      const sanitizeTime = (val: number, max: number) => Math.max(0, Math.min(max, val));
      for (const m of ['breakfast', 'lunch', 'snack', 'dinner'] as const) {
        finalConfig[m].hour = sanitizeTime(finalConfig[m].hour, 23);
        finalConfig[m].minute = sanitizeTime(finalConfig[m].minute, 59);
      }

      await NotificationService.applyReminderConfig(finalConfig);

      // Update UI state with sanitized values
      setReminders({
        breakfast: { enabled: finalConfig.breakfast.enabled, hour: finalConfig.breakfast.hour.toString().padStart(2, '0'), minute: finalConfig.breakfast.minute.toString().padStart(2, '0') },
        lunch: { enabled: finalConfig.lunch.enabled, hour: finalConfig.lunch.hour.toString().padStart(2, '0'), minute: finalConfig.lunch.minute.toString().padStart(2, '0') },
        snack: { enabled: finalConfig.snack.enabled, hour: finalConfig.snack.hour.toString().padStart(2, '0'), minute: finalConfig.snack.minute.toString().padStart(2, '0') },
        dinner: { enabled: finalConfig.dinner.enabled, hour: finalConfig.dinner.hour.toString().padStart(2, '0'), minute: finalConfig.dinner.minute.toString().padStart(2, '0') },
      });

      setShowReminderModal(false);
      Alert.alert("Saved", "Meal reminders updated successfully");
    }
  };

  const updateMealReminder = (meal: keyof UIConfig, field: 'enabled' | 'hour' | 'minute', value: any) => {
    if (field === 'hour' || field === 'minute') {
      value = value.replace(/[^0-9]/g, ''); // only allow digits
    }
    setReminders(prev => prev ? {
      ...prev,
      [meal]: { ...prev[meal], [field]: value }
    } : null);
  };

  /* ─── Load latest plan and all saved plans on mount ─ */
  const loadPlans = useCallback(async () => {
    const all = await storageService.getPlans("diet");
    setSavedPlans(all);
    // Load the most recent plan as active
    if (all.length > 0 && !activePlan) {
      const latest = await loadLatestDietPlan();
      if (latest?.days?.length) {
        setActivePlan(latest);
        setActivePlanId(all[0].id);
      }
    }
  }, [activePlan]);

  useEffect(() => {
    if (type !== "diet") return;
    loadPlans();
  }, []);

  /* ─── Generate new plan (no auto-save) ─────────────── */
  const handleGeneratePlan = async () => {
    try {
      setLoading(true);
      setPendingPlan(null);
      setProgressDay("Starting...");
      const result = await generateDietPlan(
        (dayName, index) => setProgressDay(`Generating ${dayName} (${index + 1}/7)...`),
        { autoSave: false }
      );
      if (result) {
        const sanitised = sanitisePlan(result);
        setPendingPlan(sanitised);
        setSelectedDayIndex(getTodayIndex());
      }
    } catch (err: any) {
      Alert.alert("Generation Failed", err?.message ?? "Please try again.");
    } finally {
      setLoading(false);
      setProgressDay("");
    }
  };

  /* ─── Save pending plan ─────────────────────────────── */
  const handleSavePlan = async () => {
    if (!pendingPlan) return;
    const id = Date.now().toString();
    await storageService.savePlan({
      id,
      type: "diet",
      title: pendingPlan.title,
      content: JSON.stringify(pendingPlan),
      createdAt: new Date().toISOString(),
    });
    setActivePlan(pendingPlan);
    setActivePlanId(id);
    setPendingPlan(null);
    await loadPlans();
    Alert.alert("Saved!", "Your diet plan has been saved.");
  };

  /* ─── Delete a plan ─────────────────────────────────── */
  const handleDeletePlan = (id: string) => {
    Alert.alert("Delete Plan", "Remove this saved plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await storageService.deletePlan(id);
          await loadPlans();
        },
      },
    ]);
  };

  /* ─── Use a saved plan ──────────────────────────────── */
  const handleUsePlan = (plan: HealthPlan) => {
    const parsed = safeParseDietPlan(plan.content);
    if (parsed) {
      const sanitised = sanitisePlan(parsed);
      setActivePlan(sanitised);
      setActivePlanId(plan.id);
      setPendingPlan(null);
      setSelectedDayIndex(getTodayIndex());
    }
    setShowManageModal(false);
  };

  /* ─── Derived state ─────────────────────────────────── */
  const displayPlan = pendingPlan ?? activePlan;
  const days = displayPlan?.days ?? [];
  const currentDay = days[selectedDayIndex];

  useEffect(() => {
    if (currentDay) {
      const summary = currentDay.summary;
      const parseNum = (val: any) => Number(String(val).replace(/[^\d.-]/g, "")) || 0;
      setPlanNumbers({
        totalCalories: parseNum(summary.calories),
        totalProtein: parseNum(summary.protein),
        totalCarbs: parseNum(summary.carbs),
        totalFat: parseNum(summary.fat),
      });
    }
  }, [currentDay]);

  const normalizedMeals = currentDay ? normalizeMeals(currentDay.meals ?? []) : [];

  /* Reset meal ticks when day changes */
  useEffect(() => { setCompletedMeals([]); }, [selectedDayIndex]);

  /* Meal progress */
  const totalMeals = normalizedMeals.length;
  const mealProgress = totalMeals === 0 ? 0 : Math.round((completedMeals.length / totalMeals) * 100);

  const toggleMeal = (mi: number) => {
    setCompletedMeals(prev =>
      prev.includes(mi) ? prev.filter(i => i !== mi) : [...prev, mi]
    );
  };

  /* ─── Exercise fallback ───────────────────────────────── */
  if (type === "exercise") {
    return (
      <View style={styles.empty}>
        <Text style={{ fontSize: 16, color: "#888" }}>No exercise plan available.</Text>
      </View>
    );
  }

  /* ─── Diet UI ─────────────────────────────────────────── */
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>

      {/* ── Professional Green Header ── */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          {onBack ? (
            <TouchableOpacity onPress={onBack}>
              <View style={{ backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 16, color: COLORS.primary, fontWeight: "700" }}>‹ Back</Text>
              </View></TouchableOpacity>
          ) : <View style={{ width: 70 }} />}

          <View style={{ alignItems: "center" }}>
            <Text style={styles.screenTitle}>Diet Plan</Text>
            <Text style={{ color: "#fff", opacity: 0.8, textAlign: "center", marginTop: 4 }}>
              Your personalized nutrition
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

      {/* ── Stats Row ── */}
      <View style={styles.statsContainer}>
        {[
          { label: "Calories", value: planNumbers.totalCalories },
          { label: "Protein", value: planNumbers.totalProtein },
          { label: "Carbs", value: planNumbers.totalCarbs },
          { label: "Fat", value: planNumbers.totalFat },
        ].map((item) => (
          <View key={item.label} style={styles.statCard}>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Action Buttons ── */}
      {pendingPlan ? (
        /* After generation: Save or Generate Another */
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleSavePlan}>
            <Text style={styles.actionBtnText}>💾 Save Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.regenBtn]} onPress={handleGeneratePlan} disabled={loading}>
            <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>🔄 Generate Another</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Default: Generate button */
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
            <Text style={styles.generateButtonText}>✨ Generate Diet Plan</Text>
          )}
        </TouchableOpacity>
      )}

      {/* ── Plan indicator badge ── */}
      {pendingPlan && (
        <View style={styles.unsavedBadge}>
          <Text style={styles.unsavedBadgeText}>⚠️ Preview — not saved yet</Text>
        </View>
      )}

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

            {/* ── Meal Progress ── */}
            {totalMeals > 0 && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressTitle}>Today's Meal Progress</Text>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${mealProgress}%` }]} />
                </View>
                <Text style={styles.progressPercent}>{completedMeals.length}/{totalMeals} meals · {mealProgress}% done</Text>
              </View>
            )}

            {/* Trainer Tip */}
            {(currentDay as any).trainerTip && (
              <View style={styles.tipCard}>
                <View style={styles.tipHeader}>
                  <Text style={styles.tipIcon}>🥗</Text>
                  <Text style={styles.tipTitle}>AI Dietitian Tip</Text>
                </View>
                <Text style={styles.tipText}>{(currentDay as any).trainerTip}</Text>
              </View>
            )}

            {normalizedMeals.map((items, mi) => {
              const title = currentDay?.meals?.[mi]?.type ?? "Meal";
              const done = completedMeals.includes(mi);
              return (
                <View key={mi} style={[styles.mealSection, done && styles.mealSectionDone]}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealIcon}>{getMealIcon(title)}</Text>
                    <Text style={styles.mealTitle}>{title}</Text>
                    {done && <Text style={styles.mealDoneCheck}>✔</Text>}
                    {/* Tick button */}
                    <TouchableOpacity
                      style={[styles.mealCircle, done && styles.mealCircleDone]}
                      onPress={() => toggleMeal(mi)}
                    >
                      {done && <Text style={styles.mealTick}>✓</Text>}
                    </TouchableOpacity>
                  </View>
                  {items.map((item, ii) => <FoodItemCard key={ii} item={item} />)}
                </View>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🥗</Text>
          <Text style={styles.emptyTitle}>No Diet Plan Yet</Text>
          <Text style={styles.emptySubtitle}>Tap "Generate Diet Plan" above to create a personalised 7-day meal plan.</Text>
        </View>
      )}

      {/* ── Manage Plans Modal ── */}
      <Modal visible={showManageModal} transparent animationType="slide" onRequestClose={() => setShowManageModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowManageModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>📋 Saved Diet Plans</Text>
            {savedPlans.length === 0 ? (
              <Text style={styles.modalEmpty}>No saved plans yet.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {savedPlans.map((plan) => {
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
            <Text style={styles.modalTitle}>🔔 Meal Reminders</Text>

            {reminders && (['breakfast', 'lunch', 'snack', 'dinner'] as const).map(meal => (
              <View key={meal} style={styles.reminderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planRowTitle}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
                </View>
                <View style={styles.timeInputContainer}>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    value={reminders[meal].hour}
                    onChangeText={t => updateMealReminder(meal, 'hour', t)}
                  />
                  <Text style={{ fontWeight: 'bold' }}>:</Text>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    value={reminders[meal].minute}
                    onChangeText={t => updateMealReminder(meal, 'minute', t)}
                  />
                </View>
                <Switch
                  value={reminders[meal].enabled}
                  onValueChange={v => updateMealReminder(meal, 'enabled', v)}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleSaveReminders}>
              <Text style={styles.modalPrimaryBtnText}>Set Meal Reminders</Text>
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 22,
    marginTop: -4
  },
  screenTitle: { fontSize: 22, fontWeight: "800", color: "#fff", textAlign: "center" },
  headerActionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
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

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginVertical: 10,
  },
  statCard: {
    backgroundColor: "#fff",
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    elevation: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    elevation: 6,
  },
  generateButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 6,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  regenBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  unsavedBadge: {
    alignSelf: "center",
    backgroundColor: COLORS.fullNoticeBg,
    borderWidth: 1,
    borderColor: COLORS.fullNoticeBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 6,
  },
  unsavedBadgeText: { color: COLORS.fullNoticeText, fontSize: 12, fontWeight: "600" },

  topBar: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dayCircle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
  },
  dayCircleSelected: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  dayTextSelected: {
    color: "#fff",
  },

  // Progress bar
  progressContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
  },
  progressTitle: {
    fontWeight: "700",
    marginBottom: 10,
    fontSize: 14,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: "#eee",
    borderRadius: 10,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 10,
  },
  progressPercent: {
    marginTop: 6,
    fontWeight: "600",
    textAlign: "right",
    color: "#22c55e",
  },

  tipCard: {
    backgroundColor: "rgba(39,174,96,0.08)",
    borderLeftWidth: 4,
    borderLeftColor: "#27ae60",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  tipIcon: { fontSize: 18 },
  tipTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#27ae60",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tipText: {
    fontSize: 15,
    color: "#34495e",
    lineHeight: 22,
    fontWeight: "500",
  },


  mealSection: { marginBottom: 22 },
  mealSectionDone: { opacity: 0.5 },
  mealHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  mealIcon: { fontSize: 20 },
  mealTitle: { fontWeight: "800", fontSize: 17, color: COLORS.textHeader },
  foodCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  foodName: { fontWeight: "700", fontSize: 15, color: COLORS.textHeader, marginBottom: 10 },
  mealDoneCheck: { marginLeft: "auto", fontSize: 15, color: COLORS.success, fontWeight: "bold" },
  mealCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: COLORS.border,
    justifyContent: "center", alignItems: "center", marginLeft: "auto",
  },
  mealCircleDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  mealTick: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, alignItems: "center", minWidth: 52 },
  pillValue: { fontWeight: "700", fontSize: 13 },
  pillLabel: { fontSize: 10, opacity: 0.8 },

  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textHeader, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSub, textAlign: "center", lineHeight: 21 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textHeader, marginBottom: 16 },
  modalEmpty: { color: COLORS.textSub, textAlign: "center", marginVertical: 30, fontSize: 15 },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  planRowTitle: { fontWeight: "700", fontSize: 14, color: COLORS.textHeader },
  planRowDate: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  useBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  useBtnDisabled: {
    backgroundColor: "#27ae60",
  },
  useBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  inUseBadge: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "#e8f8ef",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  inUseBadgeText: { color: "#27ae60", fontSize: 11, fontWeight: "700" },
  planRowActive: {
    borderWidth: 1.5,
    borderColor: "#27ae60",
    backgroundColor: "#f0fdf4",
  },
  deleteBtn: {
    backgroundColor: "#FFE5E5",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  deleteBtnText: { fontSize: 16 },
  modalCloseBtn: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
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
  modalPrimaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Reminders
  reminderRow: { flexDirection: "row", alignItems: "center", marginBottom: 15, backgroundColor: COLORS.background, padding: 12, borderRadius: 10 },
  timeInputContainer: { flexDirection: "row", alignItems: "center", marginRight: 15 },
  timeInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, fontSize: 16, fontWeight: "600", textAlign: "center", minWidth: 40, marginHorizontal: 4, color: COLORS.textHeader },
});
