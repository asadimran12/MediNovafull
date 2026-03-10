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
import { HealthPlan } from "../services/StorageService";
import {
  StructuredDietPlan,
  DayPlan,
  MealItem,
  generateDietPlan,
  loadLatestDietPlan,
} from "../services/DietPlanGenerator";

interface PlansScreenProps {
  type: "diet" | "exercise";
  plans: HealthPlan[];
  onDelete: (id: string) => void;
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
}) => (
  <View style={[styles.pill, { backgroundColor: bg }]}>
    <Text style={[styles.pillValue, { color }]}>{value}</Text>
    <Text style={[styles.pillLabel, { color }]}>{label}</Text>
  </View>
);

/* ─── SummaryCard ──────────────────────────────────────────── */
const SummaryCard = ({ summary }: { summary: DayPlan["summary"] }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryHeading}>Today's Total</Text>
    <View style={styles.summaryRow}>
      {[
        { label: "Calories", value: summary.calories },
        { label: "Protein", value: summary.protein },
        { label: "Carbs", value: summary.carbs },
        { label: "Fat", value: summary.fat },
      ].map((item) => (
        <View key={item.label} style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{item.value}</Text>
          <Text style={styles.summaryLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  </View>
);

/* ─── FoodItemCard ─────────────────────────────────────────── */
const FoodItemCard = ({ item }: { item: MealItem }) => (
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

/* ─── Helpers ─────────────────────────────────────────────── */
function normalizeMeals(meals: any[]): MealItem[][] {
  return meals.map((meal) => {
    try {
      // Helper to forcefully extract primitives
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

      // 1. If it's already an array format -> map each safe item
      if (Array.isArray(meal.items)) {
        const mapped = meal.items.map(extractSafeItem).filter(Boolean) as MealItem[];
        if (mapped.length > 0) return mapped;
      }

      // 2. Check if there's a nested items array directly on the object body
      if (Array.isArray(meal)) {
        const mapped = meal.map(extractSafeItem).filter(Boolean) as MealItem[];
        if (mapped.length > 0) return mapped;
      }

      // 3. If it's a single object that holds the item metrics -> wrap and map
      const safeSingle = extractSafeItem(meal);
      if (safeSingle) return [safeSingle];

    } catch (e) {
      console.warn("normalizeMeals failed on item:", meal, e);
    }

    // 4. Fallback empty array to prevent React from crashing on raw objects
    return [];
  });
}

/* ─── Main Screen ──────────────────────────────────────────── */
export const PlansScreen: React.FC<PlansScreenProps> = ({ type, plans }) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [parsedPlan, setParsedPlan] = useState<StructuredDietPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressDay, setProgressDay] = useState<string>("");
  const [planNumbers, setPlanNumbers] = useState({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
  });

  /* ─── Load plan on mount ──────────────────────────────────── */
  useEffect(() => {
    if (type !== "diet") return;

    (async () => {
      try {
        const latest = await loadLatestDietPlan();
        console.log("=== LOADED LATEST PLAN ===\n", JSON.stringify(latest, null, 2));

        if (latest?.days?.length) {
          setParsedPlan(latest);
          return;
        }

        const dietPlans = plans.filter((p) => p.type === "diet");
        if (dietPlans.length > 0) {
          const parsed = JSON.parse(dietPlans[0].content) as StructuredDietPlan;
          if (parsed?.days?.length) setParsedPlan(parsed);
        }
      } catch (e) {
        console.warn("⚠️ Could not load plan:", e);
      }
    })();
  }, []);

  /* ─── Generate new plan ───────────────────────────────────── */
  const handleGeneratePlan = async () => {
    try {
      setLoading(true);
      setProgressDay("Starting...");

      await generateDietPlan((dayName: string, index: number) => {
        setProgressDay(`Generating ${dayName} (${index + 1}/7)...`);
      });

      const latest = await loadLatestDietPlan();
      if (latest?.days?.length) {
        setParsedPlan(latest);
        setSelectedDayIndex(0);
      }
    } catch (err) {
      console.error("Plan generation failed:", err);
    } finally {
      setLoading(false);
      setProgressDay("");
    }
  };

  const days = parsedPlan?.days ?? [];
  const currentDay = days[selectedDayIndex];

  useEffect(() => {
    if (currentDay) {
      const summary = currentDay.summary;
      const parseNum = (val: any) => Number(String(val).replace(/[^\d.-]/g, '')) || 0;
      setPlanNumbers({
        totalCalories: parseNum(summary.calories),
        totalProtein: parseNum(summary.protein),
        totalCarbs: parseNum(summary.carbs),
        totalFat: parseNum(summary.fat),
      });
    }
  }, [currentDay]);

  const normalizedMeals = currentDay ? normalizeMeals(currentDay.meals ?? []) : [];

  /* ─── Exercise fallback ───────────────────────────────────── */
  if (type === "exercise") {
    return (
      <View style={styles.empty}>
        <Text style={{ fontSize: 16, color: "#888" }}>No exercise plan available.</Text>
      </View>
    );
  }

  /* ─── Diet UI ─────────────────────────────────────────────── */
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      {/* Generate Button */}

      <View>
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

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{planNumbers.totalCalories}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{planNumbers.totalProtein}</Text>
            <Text style={styles.statLabel}>Protein</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{planNumbers.totalCarbs}</Text>
            <Text style={styles.statLabel}>Carbs</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{planNumbers.totalFat}</Text>
            <Text style={styles.statLabel}>Fat</Text>
          </View>
        </View>
      </View>

      {days.length > 0 ? (
        <>
          {/* Day Tabs */}
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

          {/* Day Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
          >
            {normalizedMeals.map((items, mi) => {
              const title = currentDay?.meals?.[mi]?.type ?? "Meal";

              return (
                <View key={mi} style={styles.mealSection}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealIcon}>{getMealIcon(title)}</Text>
                    <Text style={styles.mealTitle}>{title}</Text>
                  </View>

                  {items.map((item, ii) => (
                    <FoodItemCard key={ii} item={item} />
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🥗</Text>
          <Text style={styles.emptyTitle}>No Diet Plan Yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap "Generate Diet Plan" above to create a personalised 7-day meal plan.
          </Text>
        </View>
      )}
    </View>
  );
};

/* ─── Styles ───────────────────────────────────────────────── */
const styles = StyleSheet.create({

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 10,
  },

  statCard: {
    backgroundColor: "#fff",
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    fontWeight: "600",
  },


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
  topBar: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  dayText: { color: COLORS.primary, fontWeight: "bold", fontSize: 12 },
  dayTextSelected: { color: "#fff" },
  summaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  summaryHeading: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 10, fontWeight: "600" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryValue: { color: "#fff", fontWeight: "800", fontSize: 20 },
  summaryLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 },
  mealSection: { marginBottom: 22 },
  mealHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  mealIcon: { fontSize: 20 },
  mealTitle: { fontWeight: "800", fontSize: 17, color: "#222" },
  foodCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  foodName: { fontWeight: "700", fontSize: 15, color: "#222", marginBottom: 10 },
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, alignItems: "center", minWidth: 52 },
  pillValue: { fontWeight: "700", fontSize: 13 },
  pillLabel: { fontSize: 10, opacity: 0.8 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#333", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 21 },
});