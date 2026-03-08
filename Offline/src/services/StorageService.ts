import ReactNativeFS from "react-native-fs";

export interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: LocalMessage[];
  updatedAt: string;
  isFull?: boolean;
}

export interface HealthPlan {
  id: string;
  type: "diet" | "exercise";
  title: string;
  content: string;
  createdAt: string;
}

export interface UserProfile {
  age?: string;
  gender?: "Male" | "Female" | "Other" | "";
  conditions?: string;
  severity?: "Low" | "Medium" | "High" | "";
  isSet: boolean;
}

export interface MealItem {
  name: string;
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
}

export interface Meal {
  type: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  items: MealItem[];
}

export interface DayPlan {
  day: string;
  summary: { calories: number; protein: string; carbs: string; fat: string };
  meals: Meal[];
}

export interface StructuredDietPlan {
  title: string;
  days: DayPlan[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

// ─── Halal Fallback Meals ──────────────────────────────────────────────────────

const HALAL_FALLBACK_MEALS: Record<string, Meal[]> = {
  Monday: [
    { type: "Breakfast", items: [{ name: "Scrambled Eggs with Whole Wheat Toast", calories: 320, protein: "18g", carbs: "34g", fat: "10g" }] },
    { type: "Lunch", items: [{ name: "Grilled Halal Chicken Salad with Olive Oil Dressing", calories: 420, protein: "35g", carbs: "20g", fat: "14g" }] },
    { type: "Dinner", items: [{ name: "Baked Salmon with Steamed Brown Rice and Broccoli", calories: 520, protein: "38g", carbs: "48g", fat: "12g" }] },
    { type: "Snacks", items: [{ name: "Greek Yogurt with Mixed Berries", calories: 180, protein: "10g", carbs: "22g", fat: "4g" }] },
  ],
  Tuesday: [
    { type: "Breakfast", items: [{ name: "Oatmeal with Banana and Honey", calories: 310, protein: "8g", carbs: "58g", fat: "5g" }] },
    { type: "Lunch", items: [{ name: "Lentil Soup with Whole Grain Bread", calories: 430, protein: "22g", carbs: "60g", fat: "8g" }] },
    { type: "Dinner", items: [{ name: "Halal Beef Stir-Fry with Jasmine Rice and Vegetables", calories: 540, protein: "36g", carbs: "52g", fat: "14g" }] },
    { type: "Snacks", items: [{ name: "Apple with Almond Butter", calories: 190, protein: "4g", carbs: "26g", fat: "8g" }] },
  ],
  Wednesday: [
    { type: "Breakfast", items: [{ name: "Avocado Toast with Poached Egg", calories: 340, protein: "14g", carbs: "30g", fat: "16g" }] },
    { type: "Lunch", items: [{ name: "Tuna Wrap with Lettuce and Tomato", calories: 410, protein: "30g", carbs: "38g", fat: "10g" }] },
    { type: "Dinner", items: [{ name: "Halal Lamb Stew with Sweet Potato and Herbs", calories: 560, protein: "38g", carbs: "44g", fat: "16g" }] },
    { type: "Snacks", items: [{ name: "Mixed Nuts and Dried Apricots", calories: 200, protein: "5g", carbs: "22g", fat: "12g" }] },
  ],
  Thursday: [
    { type: "Breakfast", items: [{ name: "Yogurt Parfait with Granola and Strawberries", calories: 330, protein: "12g", carbs: "50g", fat: "8g" }] },
    { type: "Lunch", items: [{ name: "Chickpea and Cauliflower Curry with Basmati Rice", calories: 450, protein: "18g", carbs: "62g", fat: "10g" }] },
    { type: "Dinner", items: [{ name: "Grilled Halal Turkey Patties with Quinoa and Roasted Garlic", calories: 510, protein: "40g", carbs: "40g", fat: "14g" }] },
    { type: "Snacks", items: [{ name: "Banana with Peanut Butter", calories: 210, protein: "6g", carbs: "30g", fat: "8g" }] },
  ],
  Friday: [
    { type: "Breakfast", items: [{ name: "Chia Seed Pudding with Mango and Coconut Milk", calories: 300, protein: "8g", carbs: "42g", fat: "10g" }] },
    { type: "Lunch", items: [{ name: "Grilled White Fish with Cucumber and Lemon Salad", calories: 380, protein: "32g", carbs: "18g", fat: "12g" }] },
    { type: "Dinner", items: [{ name: "Halal Beef Pasta with Homemade Tomato Sauce", calories: 560, protein: "36g", carbs: "58g", fat: "14g" }] },
    { type: "Snacks", items: [{ name: "Cottage Cheese with Pineapple", calories: 170, protein: "14g", carbs: "18g", fat: "4g" }] },
  ],
  Saturday: [
    { type: "Breakfast", items: [{ name: "Vegetable Omelette with Zucchini and Bell Pepper", calories: 290, protein: "18g", carbs: "12g", fat: "16g" }] },
    { type: "Lunch", items: [{ name: "Black Bean and Brown Rice Bowl with Salsa", calories: 440, protein: "18g", carbs: "64g", fat: "8g" }] },
    { type: "Dinner", items: [{ name: "Oven-Baked Halal Chicken Breast with Roasted Broccoli", calories: 490, protein: "42g", carbs: "22g", fat: "18g" }] },
    { type: "Snacks", items: [{ name: "Hummus with Carrot and Celery Sticks", calories: 160, protein: "6g", carbs: "18g", fat: "7g" }] },
  ],
  Sunday: [
    { type: "Breakfast", items: [{ name: "Whole Grain Pancakes with Maple Syrup and Berries", calories: 360, protein: "12g", carbs: "60g", fat: "8g" }] },
    { type: "Lunch", items: [{ name: "Chickpea and Quinoa Salad with Cucumber and Feta", calories: 420, protein: "20g", carbs: "48g", fat: "14g" }] },
    { type: "Dinner", items: [{ name: "Garlic Butter Shrimp with Couscous and Parsley", calories: 500, protein: "34g", carbs: "50g", fat: "14g" }] },
    { type: "Snacks", items: [{ name: "Orange Slices with Walnuts and Dark Chocolate", calories: 190, protein: "4g", carbs: "24g", fat: "10g" }] },
  ],
};

// ─── Condition Guidelines ──────────────────────────────────────────────────────

function buildConditionGuidelines(conditions: string): string {
  const lower = conditions.toLowerCase();
  const rules: string[] = [];
  if (lower.includes("diabet"))
    rules.push("low GI foods, no refined sugar, spread carbs evenly");
  if (lower.includes("hypertension") || lower.includes("blood pressure"))
    rules.push("low sodium under 1500mg, add potassium-rich foods");
  if (lower.includes("heart") || lower.includes("cholesterol"))
    rules.push("low saturated fat, add omega-3 rich foods");
  if (lower.includes("kidney"))
    rules.push("limit potassium, phosphorus, and sodium");
  if (lower.includes("obesity") || lower.includes("overweight"))
    rules.push("300-500 kcal deficit, high protein, high fibre");
  return rules.length > 0 ? rules.join(", ") : "balanced healthy diet";
}

// ─── Compact already-used meals summary (tiny, won't fill context) ────────────

function buildUsedMealsSummary(collectedDays: DayPlan[]): string {
  if (collectedDays.length === 0) return "None yet — this is the very first day.";
  return collectedDays
    .map((d) => {
      const names = d.meals
        .map((m) => m.items[0]?.name ?? "")
        .filter(Boolean)
        .join(", ");
      return `${d.day}: ${names}`;
    })
    .join(" | ");
}

// ─── Prompt Builder — FRESH each day, NO shared history ───────────────────────

function buildSingleDayPrompt(
  profile: UserProfile,
  dayName: string,
  usedMealsSummary: string
): string {
  const age = profile.age ? `${profile.age}yo` : "adult";
  const gender = profile.gender || "unspecified";
  const conditions = profile.conditions?.trim() || "none";
  const guidelines = buildConditionGuidelines(conditions);
  const dayIndex = DAY_NAMES.indexOf(dayName) + 1;

  return `You are a certified halal nutritionist. Generate ONLY Day ${dayIndex} (${dayName}) of a 7-day halal meal plan.

HALAL RULES:
- Halal meat only: chicken, beef, lamb, turkey, fish, seafood
- NO pork, bacon, ham, lard, gelatin, alcohol, or cooking wine

PATIENT: ${age} ${gender} | Conditions: ${conditions} | Rules: ${guidelines}

ALREADY USED MEALS — DO NOT REPEAT ANY OF THESE:
${usedMealsSummary}

FOR ${dayName.toUpperCase()} YOU MUST:
- Pick meals NOT listed above
- Use a different main protein than the previous day
- Use a different cooking method (choose: grill/bake/stew/stir-fry/steam/roast)
- Use a different cuisine (choose: Middle Eastern/South Asian/Mediterranean/Asian/African)
- Write full descriptive meal names e.g. "Spiced Halal Lamb Kofta with Bulgur Wheat"

MACRO ACCURACY:
- chicken=25-35g protein, eggs=6g each, fish=20-30g, legumes=10-15g
- Calories = (protein×4)+(carbs×4)+(fat×9)
- Fat 10-25g per meal, Carbs 30-60g per meal

Return ONLY this JSON (no markdown, no extra text):
{"day":"${dayName}","summary":{"calories":<sum>,"protein":"<Xg>","carbs":"<Xg>","fat":"<Xg>"},"meals":[{"type":"Breakfast","items":[{"name":"<meal>","calories":<n>,"protein":"<Xg>","carbs":"<Xg>","fat":"<Xg>"}]},{"type":"Lunch","items":[{"name":"<meal>","calories":<n>,"protein":"<Xg>","carbs":"<Xg>","fat":"<Xg>"}]},{"type":"Dinner","items":[{"name":"<meal>","calories":<n>,"protein":"<Xg>","carbs":"<Xg>","fat":"<Xg>"}]},{"type":"Snacks","items":[{"name":"<meal>","calories":<n>,"protein":"<Xg>","carbs":"<Xg>","fat":"<Xg>"}]}]}`;
}

// ─── Diet Plan Generator ───────────────────────────────────────────────────────

export async function generateDietPlan(
  onProgress?: (dayName: string, index: number) => void
): Promise<void> {
  const profile = await storageService.getProfile();
  const LlamaService = (await import("./LlamaService")).default;
  await LlamaService.loadModel();

  const collectedDays: DayPlan[] = [];
  const systemPrompt = "You are a halal nutritionist. Return ONLY valid JSON. No markdown. No extra text.";

  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayName = DAY_NAMES[i];
    onProgress?.(dayName, i);
    console.log(`🔄 Generating ${dayName} (${i + 1}/7)...`);

    // ✅ Compact summary of already-done meals (just names, not full JSON)
    const usedMealsSummary = buildUsedMealsSummary(collectedDays);
    const prompt = buildSingleDayPrompt(profile, dayName, usedMealsSummary);

    try {
      // ✅ FRESH context every single day — FIXES "Context is full" error
      // We never accumulate previous responses into history
      const freshMessages: { role: "user" | "assistant"; content: string }[] = [
        { role: "user", content: prompt },
      ];

      const response = await LlamaService.chat(freshMessages, systemPrompt);
      console.log(`📝 Raw LLM for ${dayName} (first 300):`, response.substring(0, 300));

      const dayPlan = parseSingleDay(response, dayName);
      if (dayPlan) {
        dayPlan.day = dayName;
        collectedDays.push(dayPlan);
        console.log(`✅ ${dayName} — ${dayPlan.meals.map((m) => m.items[0]?.name).join(" | ")}`);
      } else {
        console.warn(`⚠️ ${dayName} parse failed — using halal fallback`);
        collectedDays.push(buildFallbackDay(dayName));
      }
    } catch (err) {
      console.error(`❌ ${dayName} error:`, err);
      collectedDays.push(buildFallbackDay(dayName));
    }
  }

  const fullPlan: StructuredDietPlan = {
    title: "7-Day Personalised Halal Diet Plan",
    days: collectedDays,
  };

  await storageService.savePlan({
    id: Date.now().toString(),
    type: "diet",
    title: fullPlan.title,
    content: JSON.stringify(fullPlan),
    createdAt: new Date().toISOString(),
  });
}

// ─── Fallback Helpers ──────────────────────────────────────────────────────────

function buildFallbackDay(dayName: string): DayPlan {
  const meals = getFallbackMeals(dayName);
  const totalCalories = meals.reduce((sum, m) => sum + (m.items[0]?.calories ?? 0), 0);
  return {
    day: dayName,
    summary: { calories: totalCalories, protein: "93g", carbs: "155g", fat: "41g" },
    meals,
  };
}

function getFallbackMeals(dayName: string): Meal[] {
  return HALAL_FALLBACK_MEALS[dayName] ?? HALAL_FALLBACK_MEALS["Monday"];
}

// ─── JSON Helpers ──────────────────────────────────────────────────────────────

function extractJson(raw: string): string {
  let cleaned = raw.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return cleaned;
}

function closeJson(s: string): string {
  let result = s.replace(/,\s*$/, "");
  const opens = (result.match(/\[/g) || []).length;
  const closes = (result.match(/\]/g) || []).length;
  const bopens = (result.match(/\{/g) || []).length;
  const bcloses = (result.match(/\}/g) || []).length;
  for (let i = 0; i < opens - closes; i++) result += "]";
  for (let i = 0; i < bopens - bcloses; i++) result += "}";
  return result;
}

// ─── Normalisation ─────────────────────────────────────────────────────────────

const REQUIRED_MEALS: Meal["type"][] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

function normaliseMealItem(raw: any): MealItem {
  const toGramString = (val: any): string => {
    if (val === undefined || val === null) return "0g";
    const str = String(val);
    return str.endsWith("g") ? str : `${Math.round(Number(str) || 0)}g`;
  };
  return {
    name: raw.name ?? "Food item",
    calories: Number(raw.calories) || 0,
    protein: toGramString(raw.protein),
    carbs: toGramString(raw.carbs),
    fat: toGramString(raw.fat),
  };
}

function normaliseMeal(raw: any, dayName: string): Meal {
  const rawType = (raw.type ?? raw.name ?? "Breakfast") as string;
  const mealType: Meal["type"] =
    REQUIRED_MEALS.find((t) => t.toLowerCase() === rawType.toLowerCase()) ?? "Breakfast";

  if (Array.isArray(raw.items) && raw.items.length > 0) {
    const validItems = raw.items.filter(
      (i: any) => i.name && i.name !== "FOOD NAME HERE"
    );
    if (validItems.length > 0) {
      return { type: mealType, items: validItems.map(normaliseMealItem) };
    }
  }

  if (raw.calories !== undefined && raw.name && raw.name !== "FOOD NAME HERE") {
    return {
      type: mealType,
      items: [normaliseMealItem({ name: raw.name, calories: raw.calories, protein: raw.protein, carbs: raw.carbs, fat: raw.fat })],
    };
  }

  const fallback = getFallbackMeals(dayName).find((m) => m.type === mealType);
  return fallback ?? { type: mealType, items: [] };
}

function normaliseDay(raw: any, dayName?: string): DayPlan {
  const name = dayName ?? raw.day ?? "Day";
  const existingMeals: Meal[] = (raw.meals ?? []).map((m: any) => normaliseMeal(m, name));
  const mealMap = new Map(existingMeals.map((m) => [m.type, m]));
  const fallbacks = getFallbackMeals(name);
  const meals: Meal[] = REQUIRED_MEALS.map(
    (t) => mealMap.get(t) ?? fallbacks.find((f) => f.type === t) ?? { type: t, items: [] }
  );
  return {
    day: name,
    summary: raw.summary ?? { calories: 0, protein: "0g", carbs: "0g", fat: "0g" },
    meals,
  };
}

function parseSingleDay(raw: string, expectedDay: string): DayPlan | null {
  const cleaned = extractJson(raw);
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed?.day && Array.isArray(parsed?.meals)) return normaliseDay(parsed, expectedDay);
    if (parsed?.days?.[0]) return normaliseDay(parsed.days[0], expectedDay);
  } catch (_) { }
  try {
    const parsed = JSON.parse(closeJson(cleaned));
    if (parsed?.day && Array.isArray(parsed?.meals)) return normaliseDay(parsed, expectedDay);
  } catch (_) { }
  console.warn(`⚠️ Could not parse day: ${expectedDay}, raw: ${raw.substring(0, 200)}`);
  return null;
}

export function safeParseDietPlan(raw: string): StructuredDietPlan | null {
  if (!raw || raw.trim().length < 10) return null;
  const cleaned = extractJson(raw);
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed?.days?.length > 0) {
      return {
        title: parsed.title ?? "7-Day Halal Diet Plan",
        days: parsed.days.map((d: any, i: number) => normaliseDay(d, DAY_NAMES[i] ?? d.day)),
      };
    }
    if (parsed?.day && Array.isArray(parsed?.meals)) {
      return { title: "7-Day Halal Diet Plan", days: [normaliseDay(parsed)] };
    }
  } catch (_) { }
  try {
    const parsed = JSON.parse(closeJson(cleaned));
    if (parsed?.days?.length > 0) {
      return {
        title: parsed.title ?? "7-Day Halal Diet Plan",
        days: parsed.days.map((d: any, i: number) => normaliseDay(d, DAY_NAMES[i] ?? d.day)),
      };
    }
  } catch (_) { }
  return null;
}

// ─── Storage Service ───────────────────────────────────────────────────────────

class StorageService {
  private userId: string | null = null;
  private readonly USERS_BASE_DIR = `${ReactNativeFS.DocumentDirectoryPath}/users`;

  private getUserDir() {
    if (!this.userId) return `${ReactNativeFS.DocumentDirectoryPath}/guest`;
    return `${this.USERS_BASE_DIR}/${this.userId}`;
  }

  private get chatsDir() { return `${this.getUserDir()}/chats`; }
  private get plansDir() { return `${this.getUserDir()}/plans`; }
  private get profilePath() { return `${this.getUserDir()}/user_profile.json`; }

  async setUser(userId: string | null) { this.userId = userId; await this.init(); }

  async init() {
    if (!(await ReactNativeFS.exists(this.USERS_BASE_DIR)))
      await ReactNativeFS.mkdir(this.USERS_BASE_DIR);
    const userDir = this.getUserDir();
    if (!(await ReactNativeFS.exists(userDir))) await ReactNativeFS.mkdir(userDir);
    if (!(await ReactNativeFS.exists(this.chatsDir))) await ReactNativeFS.mkdir(this.chatsDir);
    if (!(await ReactNativeFS.exists(this.plansDir))) await ReactNativeFS.mkdir(this.plansDir);
  }

  async saveChat(chat: ChatSession) {
    await ReactNativeFS.writeFile(`${this.chatsDir}/${chat.id}.json`, JSON.stringify(chat), "utf8");
  }

  async loadChat(id: string): Promise<ChatSession | null> {
    const path = `${this.chatsDir}/${id}.json`;
    if (!(await ReactNativeFS.exists(path))) return null;
    const content = await ReactNativeFS.readFile(path, "utf8");
    const chat = JSON.parse(content);
    chat.messages = chat.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    return chat;
  }

  async getAllChats(): Promise<ChatSession[]> {
    await this.init();
    const files = await ReactNativeFS.readDir(this.chatsDir);
    const chats: ChatSession[] = [];
    for (const file of files) {
      if (!file.name.endsWith(".json")) continue;
      try { chats.push(JSON.parse(await ReactNativeFS.readFile(file.path, "utf8"))); }
      catch (e) { console.error("Chat parse error:", file.path); }
    }
    return chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async deleteChat(id: string) {
    const path = `${this.chatsDir}/${id}.json`;
    if (await ReactNativeFS.exists(path)) await ReactNativeFS.unlink(path);
  }

  async savePlan(plan: HealthPlan) {
    await this.init();
    await ReactNativeFS.writeFile(`${this.plansDir}/${plan.id}.json`, JSON.stringify(plan), "utf8");
  }

  async getPlans(type?: "diet" | "exercise"): Promise<HealthPlan[]> {
    await this.init();
    const files = await ReactNativeFS.readDir(this.plansDir);
    const plans: HealthPlan[] = [];
    for (const file of files) {
      if (!file.name.endsWith(".json")) continue;
      try {
        const plan: HealthPlan = JSON.parse(await ReactNativeFS.readFile(file.path, "utf8"));
        if (!type || plan.type === type) plans.push(plan);
      } catch (e) { console.error("Plan parse error:", file.path); }
    }
    return plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async deletePlan(id: string) {
    const path = `${this.plansDir}/${id}.json`;
    if (await ReactNativeFS.exists(path)) await ReactNativeFS.unlink(path);
  }

  async getProfile(): Promise<UserProfile> {
    if (!(await ReactNativeFS.exists(this.profilePath))) return { isSet: false };
    try { return JSON.parse(await ReactNativeFS.readFile(this.profilePath, "utf8")); }
    catch { return { isSet: false }; }
  }

  async saveProfile(profile: UserProfile) {
    await ReactNativeFS.writeFile(this.profilePath, JSON.stringify(profile), "utf8");
  }

  async deleteProfile() {
    if (await ReactNativeFS.exists(this.profilePath)) await ReactNativeFS.unlink(this.profilePath);
  }

  generateTitle(messages: LocalMessage[]): string {
    const first = messages.find((m) => m.role === "user");
    if (!first) return "New Health Chat";
    return first.text.length > 30 ? first.text.substring(0, 27) + "..." : first.text;
  }
}

const storageService = new StorageService();

export async function loadLatestDietPlan(): Promise<StructuredDietPlan | null> {
  const plans = await storageService.getPlans("diet");
  if (plans.length === 0) return null;
  return safeParseDietPlan(plans[0].content);
}

export default storageService;