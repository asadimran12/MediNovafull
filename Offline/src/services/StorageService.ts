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

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_FOOD_HINTS: Record<string, { breakfast: string; lunch: string; dinner: string; snack: string }> = {
  Monday: { breakfast: "oats, berries, honey", lunch: "chicken, leafy greens, olive oil", dinner: "salmon, brown rice, lemon", snack: "yogurt, nuts" },
  Tuesday: { breakfast: "eggs, spinach, cheese", lunch: "lentils, whole grain bread, tomato", dinner: "chicken, bell peppers, soy sauce", snack: "apple, almond butter" },
  Wednesday: { breakfast: "whole grain bread, avocado, egg", lunch: "tuna, lettuce, whole wheat wrap", dinner: "beef, sweet potato, herbs", snack: "mixed nuts, dried fruit" },
  Thursday: { breakfast: "yogurt, granola, banana", lunch: "chickpeas, cauliflower, curry spices", dinner: "turkey, quinoa, roasted garlic", snack: "banana, peanut butter" },
  Friday: { breakfast: "oats, banana, milk, chia seeds", lunch: "white fish, cucumber, lemon salad", dinner: "lean beef, pasta, tomato sauce", snack: "cottage cheese, berries" },
  Saturday: { breakfast: "eggs, zucchini, bell pepper", lunch: "black beans, brown rice, salsa", dinner: "chicken breast, broccoli, olive oil", snack: "hummus, carrot, celery" },
  Sunday: { breakfast: "whole grain flour, eggs, maple", lunch: "chickpeas, quinoa, cucumber, feta", dinner: "shrimp, couscous, garlic, parsley", snack: "orange, walnuts, dark chocolate" },
};


function buildConditionGuidelines(conditions: string): string {
  const lower = conditions.toLowerCase();
  const rules: string[] = [];
  if (lower.includes("diabet"))
    rules.push("low GI foods, no refined sugar, spread carbs evenly");
  if (lower.includes("hypertension") || lower.includes("blood pressure"))
    rules.push("low sodium under 1500mg, add potassium foods");
  if (lower.includes("heart") || lower.includes("cholesterol"))
    rules.push("low saturated fat, add omega-3 foods");
  if (lower.includes("kidney"))
    rules.push("limit potassium phosphorus and sodium");
  if (lower.includes("obesity") || lower.includes("overweight"))
    rules.push("300-500 kcal deficit, high protein high fibre");
  return rules.length > 0 ? rules.join(", ") : "balanced healthy diet";
}

function buildSingleDayPrompt(profile: UserProfile, dayName: string): string {
  const age = profile.age ? `${profile.age}yo` : "adult";
  const gender = profile.gender || "unspecified";
  const conditions = profile.conditions?.trim() || "none";
  const guidelines = buildConditionGuidelines(conditions);
  const hints = DAY_FOOD_HINTS[dayName];

  return `You are generating day ${DAY_NAMES.indexOf(dayName) + 1} of 7 in a meal plan.
Do NOT repeat foods from previous days in this conversation.

Patient: ${age} ${gender}. Conditions: ${conditions}. Rules: ${guidelines}.

For ${dayName}, create meals using ONLY these ingredients as inspiration:
- Breakfast ingredients: ${hints.breakfast}
- Lunch ingredients: ${hints.lunch}
- Dinner ingredients: ${hints.dinner}
- Snack ingredients: ${hints.snack}

IMPORTANT rules for macros:
- Protein must be realistic: chicken=25-35g, eggs=6g each, fish=20-30g, legumes=10-15g
- Calories must match macros: (protein*4) + (carbs*4) + (fat*9) = total calories
- Fat should be 10-25g per meal, NOT 50g
- Carbs should be 30-60g per meal
- Do NOT copy ingredient names directly — create a proper meal name like "Pan-seared salmon with steamed brown rice"

Return ONLY a JSON object. No markdown. Start with { end with }.

{
  "day": "${dayName}",
  "summary": {"calories": <sum of all meals>, "protein": "<Xg>", "carbs": "<Xg>", "fat": "<Xg>"},
  "meals": [
    {"type": "Breakfast", "items": [{"name": "<creative meal name>", "calories": <number>, "protein": "<Xg>", "carbs": "<Xg>", "fat": "<Xg>"}]},
    {"type": "Lunch",     "items": [{"name": "<creative meal name>", "calories": <number>, "protein": "<Xg>", "carbs": "<Xg>", "fat": "<Xg>"}]},
    {"type": "Dinner",    "items": [{"name": "<creative meal name>", "calories": <number>, "protein": "<Xg>", "carbs": "<Xg>", "fat": "<Xg>"}]},
    {"type": "Snacks",    "items": [{"name": "<creative meal name>", "calories": <number>, "protein": "<Xg>", "carbs": "<Xg>", "fat": "<Xg>"}]}
  ]
}`;
}

export async function generateDietPlan(
  onProgress?: (dayName: string, index: number) => void
): Promise<void> {
  const profile = await storageService.getProfile();
  const LlamaService = (await import("./LlamaService")).default;
  await LlamaService.loadModel();

  const collectedDays: DayPlan[] = [];
  const systemPrompt =
    "You are a clinical nutritionist creating a 7-day meal plan. Each day MUST use different foods. Return ONLY valid JSON. No explanation. No markdown.";

  const conversationHistory: { role: "user" | "assistant"; content: string }[] = [];

  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayName = DAY_NAMES[i];
    onProgress?.(dayName, i);
    console.log(`🔄 Generating ${dayName} (${i + 1}/7)...`);

    const prompt = buildSingleDayPrompt(profile, dayName);

    conversationHistory.push({ role: "user", content: prompt });

    try {
      const response = await LlamaService.chat(
        [...conversationHistory],
        systemPrompt
      );

      console.log(`📝 Raw LLM for ${dayName} (first 300):`, response.substring(0, 300));

      conversationHistory.push({ role: "assistant", content: response });

      const dayPlan = parseSingleDay(response, dayName);
      if (dayPlan) {
        dayPlan.day = dayName;
        collectedDays.push(dayPlan);
        console.log(
          `✅ ${dayName} — foods: ${dayPlan.meals.map((m) => m.items[0]?.name).join(" | ")}`
        );
      } else {
        console.warn(`⚠️ ${dayName} parse failed — using fallback`);
        const fallback = {
          day: dayName,
          summary: { calories: 1470, protein: "93g", carbs: "155g", fat: "41g" },
          meals: getFallbackMeals(dayName),
        };
        collectedDays.push(fallback);
        conversationHistory.push({
          role: "assistant",
          content: JSON.stringify(fallback),
        });
      }
    } catch (err) {
      console.error(`❌ ${dayName} error:`, err);
      collectedDays.push({
        day: dayName,
        summary: { calories: 1470, protein: "93g", carbs: "155g", fat: "41g" },
        meals: getFallbackMeals(dayName),
      });
    }
  }

  const fullPlan: StructuredDietPlan = {
    title: "7-Day Personalised Diet Plan",
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

const REQUIRED_MEALS: Meal["type"][] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

function getFallbackMeals(dayName: string): Meal[] {
  const hints = DAY_FOOD_HINTS[dayName] ?? DAY_FOOD_HINTS["Monday"];
  return [
    { type: "Breakfast", items: [{ name: hints.breakfast, calories: 320, protein: "12g", carbs: "50g", fat: "8g" }] },
    { type: "Lunch", items: [{ name: hints.lunch, calories: 450, protein: "35g", carbs: "30g", fat: "14g" }] },
    { type: "Dinner", items: [{ name: hints.dinner, calories: 520, protein: "40g", carbs: "55g", fat: "12g" }] },
    { type: "Snacks", items: [{ name: hints.snack, calories: 180, protein: "6g", carbs: "20g", fat: "7g" }] },
  ];
}

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
  const mealType: Meal["type"] = REQUIRED_MEALS.find(
    (t) => t.toLowerCase() === rawType.toLowerCase()
  ) ?? "Breakfast";

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
        title: parsed.title ?? "7-Day Diet Plan",
        days: parsed.days.map((d: any, i: number) => normaliseDay(d, DAY_NAMES[i] ?? d.day)),
      };
    }
    if (parsed?.day && Array.isArray(parsed?.meals)) {
      return { title: "7-Day Diet Plan", days: [normaliseDay(parsed)] };
    }
  } catch (_) { }

  try {
    const parsed = JSON.parse(closeJson(cleaned));
    if (parsed?.days?.length > 0) {
      return {
        title: parsed.title ?? "7-Day Diet Plan",
        days: parsed.days.map((d: any, i: number) => normaliseDay(d, DAY_NAMES[i] ?? d.day)),
      };
    }
  } catch (_) { }

  return null;
}

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
    if (!(await ReactNativeFS.exists(this.USERS_BASE_DIR))) await ReactNativeFS.mkdir(this.USERS_BASE_DIR);
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