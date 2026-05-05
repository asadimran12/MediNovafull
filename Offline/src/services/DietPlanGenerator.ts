import storageService, { UserProfile, HealthPlan } from "./StorageService";
import KnowledgeBase from "./KnowledgeBase";

// ─── Diet Plan Types ─────────────────────────────────────────────

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
    trainerTip?: string; // Personalized Dietitian advice
    meals: Meal[];
    notes?: string[];
}

export interface StructuredDietPlan {
    title: string;
    days: DayPlan[];
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Local database of Halal/Healthy food macros to save AI tokens and time
const FOOD_DATABASE: Record<string, { kc: number; p: number; c: number; f: number }> = {
    "Oatmeal with Blueberries": { kc: 250, p: 8, c: 45, f: 5 },
    "Scrambled Eggs (2)": { kc: 140, p: 12, c: 1, f: 10 },
    "Greek Yogurt with Honey": { kc: 180, p: 15, c: 20, f: 4 },
    "Grilled Chicken Breast": { kc: 280, p: 50, c: 0, f: 6 },
    "Brown Rice (1 cup)": { kc: 215, p: 5, c: 45, f: 2 },
    "Steamed Broccoli": { kc: 50, p: 4, c: 10, f: 0 },
    "Baked Salmon Fillet": { kc: 350, p: 40, c: 0, f: 20 },
    "Lentil Soup (1 bowl)": { kc: 230, p: 18, c: 35, f: 2 },
    "Mixed Halal Kebab": { kc: 450, p: 35, c: 10, f: 30 },
    "Hummus with Carrots": { kc: 150, p: 5, c: 15, f: 8 },
    "Handful of Almonds": { kc: 160, p: 6, c: 6, f: 14 },
    "Apple with Peanut Butter": { kc: 190, p: 5, c: 25, f: 8 },
    "Grilled Fish with Quinoa": { kc: 420, p: 35, c: 40, f: 12 },
    "Chickpea Salad": { kc: 280, p: 12, c: 35, f: 10 },
    "Turkish Poached Eggs": { kc: 320, p: 18, c: 10, f: 22 },
};

// ─── Compact AI prompt: AI freely generates food names ──────────
// Output format (tiny ~120 tokens for all 7 days):
// Mon:FoodA,FoodB,FoodC,FoodD
// The AI picks any Halal food from its own knowledge
const FOOD_KEYS = Object.keys(FOOD_DATABASE);

function buildCompactDietPrompt(profile: UserProfile): string {
    return `You are a professional dietitian. Create a personalised 7-day Halal meal plan.
User: ${profile.age}y ${profile.gender}, health conditions: ${profile.conditions || "none"}.
Instructions:
- Suggest appropriate real Halal foods for each meal based on the user's health conditions
- Output EXACTLY 7 lines, one per day, NO extra text
- Format: DayAbbr:Breakfast,Lunch,Dinner,Snack
- Use 3-letter day abbreviations: Mon,Tue,Wed,Thu,Fri,Sat,Sun
- Keep food names short (2-4 words max)
Example:
Mon:Oatmeal,Grilled Chicken,Baked Salmon,Mixed Nuts`;
}

function buildCompactTipsPrompt(profile: UserProfile): string {
    return `You are a dietitian. Write 7 short personalized diet tips.
User: ${profile.age}y ${profile.gender}, conditions: ${profile.conditions || "none"}.
Rules:
- Output EXACTLY 7 lines
- Each line: a tip under 15 words
- NO numbering, NO extra text, JUST 7 lines`;
}

function parseDietLine(line: string): string[] | null {
    // Accepts "Mon:FoodA,FoodB,FoodC,FoodD" or "Monday:..."
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return null;
    const parts = line.substring(colonIdx + 1).split(",").map(s => s.trim()).filter(Boolean);
    if (parts.length < 4) return null;
    return parts;
}

// Default macros for AI-generated foods not in our local DB
const DEFAULT_FOOD_MACROS: Record<string, { kc: number; p: number; c: number; f: number }> = {
    breakfast: { kc: 280, p: 12, c: 40, f:  8 },
    lunch:     { kc: 420, p: 30, c: 35, f: 12 },
    dinner:    { kc: 380, p: 28, c: 38, f: 10 },
    snack:     { kc: 150, p:  5, c: 18, f:  6 },
};

function getMacros(name: string, mealType?: string): { kc: number; p: number; c: number; f: number } {
    // Exact match in local DB
    if (FOOD_DATABASE[name]) return FOOD_DATABASE[name];
    // Fuzzy match: check if any DB key is contained in the AI name or vice versa
    const lower = name.toLowerCase();
    const fuzzy = FOOD_KEYS.find(k => {
        const kl = k.toLowerCase();
        return kl.includes(lower) || lower.includes(kl) ||
            kl.split(" ").some(word => word.length > 3 && lower.includes(word));
    });
    if (fuzzy) return FOOD_DATABASE[fuzzy];
    // Unknown AI-generated food → use meal-type defaults
    return DEFAULT_FOOD_MACROS[mealType ?? "lunch"];
}

function buildMealItem(name: string, mealType: string): MealItem {
    const db = getMacros(name, mealType);
    return {
        name,           // keep AI-generated name as-is
        calories: db.kc,
        protein: `${db.p}g`,
        carbs:   `${db.c}g`,
        fat:     `${db.f}g`,
    };
}

// Fallback rotation used if AI response can't be parsed
const FALLBACK_ROTATION: [number, number, number, number][] = [
    [0, 3, 6, 9], [1, 4, 7, 10], [2, 5, 8, 11],
    [0, 6, 3, 12], [1, 7, 4, 13], [2, 8, 5, 14], [0, 3, 6, 9],
];

export async function generateDietPlan(
    onProgress?: (dayName: string, index: number) => void,
    options?: { autoSave?: boolean }
): Promise<StructuredDietPlan | void> {
    const autoSave = options?.autoSave !== false;
    const profile  = await storageService.getProfile();

    // Signal start
    onProgress?.("Preparing", 0);

    // ── Load AI model ────────────────────────────────────────────
    let LlamaService: any = null;
    try {
        const ls = (await import("./LlamaService")).default;
        const ms = (await import("./ModelService")).default;
        const activeModel = await ms.getActiveModel();
        if (activeModel) {
            await ls.loadModel(activeModel.filename);
            LlamaService = ls;
        }
    } catch { /* proceed without AI */ }

    // ── Step 1: ONE compact AI call → AI picks food names ────────
    let aiLines: string[] = [];
    let aiTips:  string[] = [];

    if (LlamaService) {
        try {
            onProgress?.("Generating plan…", 0);
            const planResponse = await LlamaService.chat(
                [{ role: "user", content: buildCompactDietPrompt(profile) }],
                "You are a professional dietitian. Follow the format exactly."
            );
            aiLines = planResponse.split("\n").map((l: string) => l.trim()).filter(Boolean);
        } catch { /* fall back to rotation */ }

        try {
            onProgress?.("Adding tips…", 6);
            const tipsResponse = await LlamaService.chat(
                [{ role: "user", content: buildCompactTipsPrompt(profile) }],
                "You are a professional dietitian. Follow the format exactly."
            );
            aiTips = tipsResponse.split("\n").map((l: string) => l.trim()).filter(Boolean);
        } catch { /* fall back to defaults */ }
    }

    const defaultTips = [
        "Drink at least 8 glasses of water today.",
        "Eat slowly and chew your food well.",
        "Avoid processed food — stick to whole ingredients.",
        "Have dinner at least 2 hours before bed.",
        "Include greens in your lunch.",
        "Prep meals in advance to stay on track.",
        "Listen to your body — stop eating when full.",
    ];

    // ── Step 2: Build 7-day plan expanding AI names → macros ─────
    const generatedDays: DayPlan[] = DAY_NAMES.map((day, i) => {
        onProgress?.(day, i);

        let bKey: string, lKey: string, dKey: string, sKey: string;

        const parsed = aiLines.length > i ? parseDietLine(aiLines[i]) : null;
        if (parsed) {
            [bKey, lKey, dKey, sKey] = [
                parsed[0],
                parsed[1],
                parsed[2],
                parsed[3] ?? parsed[0],
            ];
        } else {
            // Fallback: use rotation
            const [bi, li, di, si] = FALLBACK_ROTATION[i];
            bKey = FOOD_KEYS[bi % FOOD_KEYS.length];
            lKey = FOOD_KEYS[li % FOOD_KEYS.length];
            dKey = FOOD_KEYS[di % FOOD_KEYS.length];
            sKey = FOOD_KEYS[si % FOOD_KEYS.length];
        }

        const meals: Meal[] = [
            { type: "Breakfast", items: [buildMealItem(bKey, "breakfast")] },
            { type: "Lunch",     items: [buildMealItem(lKey, "lunch")]     },
            { type: "Dinner",    items: [buildMealItem(dKey, "dinner")]    },
            { type: "Snacks",    items: [buildMealItem(sKey, "snack")]     },
        ];

        let totalKc = 0, totalP = 0, totalC = 0, totalF = 0;
        meals.forEach(m => m.items.forEach(item => {
            totalKc += item.calories;
            totalP  += parseInt(item.protein);
            totalC  += parseInt(item.carbs);
            totalF  += parseInt(item.fat);
        }));

        const tip = aiTips[i]?.length > 5 ? aiTips[i] : defaultTips[i % defaultTips.length];

        return {
            day,
            summary: { calories: totalKc, protein: `${totalP}g`, carbs: `${totalC}g`, fat: `${totalF}g` },
            trainerTip: tip,
            meals,
            notes: ["Stay hydrated throughout the day.", "Avoid processed sugar."],
        };
    });

    const fullPlan: StructuredDietPlan = { title: "7-Day Personalised Diet Plan", days: generatedDays };

    if (autoSave) {
        await storageService.savePlan({
            id: Date.now().toString(),
            type: "diet",
            title: fullPlan.title,
            content: JSON.stringify(fullPlan),
            createdAt: new Date().toISOString(),
        });
    }
    return fullPlan;
}

function parseMiniDietDay(raw: string, day: string): DayPlan | null {
    const cleaned = extractJson(fixJSON(raw));
    let json: any = null;
    try {
        json = JSON.parse(cleaned);
    } catch (e) {
        json = attemptRegexRecovery(raw);
    }

    if (!json) return null;

    try {
        const tip = json.TrainerTip || json.tip || json.tpt || "Drink plenty of water today.";
        const b = json.Breakfast || json.breakfast || json.b || [];
        const l = json.Lunch || json.lunch || json.l || [];
        const dn = json.Dinner || json.dinner || json.d || json.dn || [];
        const s = json.Snacks || json.snacks || json.s || [];

        const dayMeals: Meal[] = [
            expandMeal(b, "Breakfast"),
            expandMeal(l, "Lunch"),
            expandMeal(dn, "Dinner"),
            expandMeal(s, "Snacks")
        ];

        // Calc summary
        let totalKc = 0, totalP = 0, totalC = 0, totalF = 0;
        dayMeals.forEach(m => m.items.forEach(i => {
            totalKc += i.calories;
            totalP += parseInt(i.protein);
            totalC += parseInt(i.carbs);
            totalF += parseInt(i.fat);
        }));

        return {
            day,
            summary: { calories: totalKc, protein: `${totalP}g`, carbs: `${totalC}g`, fat: `${totalF}g` },
            trainerTip: String(tip),
            meals: dayMeals,
            notes: json.Notes || json.notes || ["Eat slowly", "Avoid processed sugar"]
        };
    } catch (e) {
        return null;
    }
}

function attemptRegexRecovery(raw: string): any {
    const items: any[] = [];
    const itemRegex = /{\s*["']n["']\s*:\s*["']([^"']+)["']\s*}/gi;
    let match;
    while ((match = itemRegex.exec(raw)) !== null) {
        items.push({ n: match[1] });
    }
    if (items.length > 0) {
        return {
            b: items.slice(0, 1),
            l: items.slice(1, 2),
            dn: items.slice(2, 3),
            s: items.slice(3, 4),
            tip: "Maintain a balanced diet and stay hydrated."
        };
    }
    return null;
}

function expandMeal(raw: any, type: Meal["type"]): Meal {
    let items: any[] = [];
    if (Array.isArray(raw)) items = raw;
    else if (raw && typeof raw === "object") items = raw.items || [raw];

    const normalisedItems: MealItem[] = items.map((i: any) => {
        const name = i.n || i.name || "Healthy Meal";
        const db = FOOD_DATABASE[name] || FOOD_DATABASE["Oatmeal with Blueberries"];
        return {
            name,
            calories: db.kc,
            protein: `${db.p}g`,
            carbs: `${db.c}g`,
            fat: `${db.f}g`
        };
    });

    if (normalisedItems.length === 0) {
        const db = FOOD_DATABASE["Oatmeal with Blueberries"];
        normalisedItems.push({ name: "Oatmeal with Blueberries", calories: db.kc, protein: `${db.p}g`, carbs: `${db.c}g`, fat: `${db.f}g` });
    }

    return { type, items: normalisedItems };
}

function fixJSON(text: string) {
    let fixed = text.trim();
    fixed = fixed.replace(/```json|```/gi, "").trim();
    fixed = fixed.replace(/"\s*\n\s*(\d+\.)/g, ' $1'); 
    fixed = fixed.replace(/"\s*\n\s*"/g, '",\n"');
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    return fixed;
}

function extractJson(s: string): string {
    const start = s.indexOf("{") !== -1 && s.indexOf("[") !== -1 
        ? Math.min(s.indexOf("{"), s.indexOf("["))
        : Math.max(s.indexOf("{"), s.indexOf("["));
    const end = s.lastIndexOf("}") !== -1 && s.lastIndexOf("]") !== -1
        ? Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"))
        : Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
    if (start === -1 || end === -1) return s;
    return s.substring(start, end + 1);
}

export function safeParseDietPlan(raw: string): StructuredDietPlan | null {
    try {
        const cleaned = extractJson(raw);
        const parsed = JSON.parse(cleaned);
        if (parsed.days) return parsed;
        return null;
    } catch { return null; }
}

export function sanitisePlan(plan: StructuredDietPlan): StructuredDietPlan {
    return plan; // Already sanitised by expansion logic
}

export async function loadLatestDietPlan(): Promise<StructuredDietPlan | null> {
    try {
        const plans = await storageService.getPlans("diet");
        if (plans.length === 0) return null;
        return JSON.parse(plans[0].content);
    } catch { return null; }
}
