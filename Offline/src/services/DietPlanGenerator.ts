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

function buildDietPrompt(profile: UserProfile, day: string): string {
    return `Return JSON for ${day} Halal diet.
User: ${profile.age}y ${profile.gender}, conditions: ${profile.conditions || "none"}.
Structure: Breakfast, Lunch, Dinner, Snacks (1 item each).
Item: {"n": "name"}.
TrainerTip: One personalized nutritional tip.
Notes: 2 safety tips.
Foods to use: ${Object.keys(FOOD_DATABASE).join(", ")}.
JSON ONLY. NO TEXT.`;
}

export async function generateDietPlan(
    onProgress?: (dayName: string, index: number) => void,
    options?: { autoSave?: boolean }
): Promise<StructuredDietPlan | void> {
    const autoSave = options?.autoSave !== false;
    const profile = await storageService.getProfile();
    const LlamaService = (await import("./LlamaService")).default;
    const ModelService = (await import("./ModelService")).default;

    const activeModel = await ModelService.getActiveModel();
    if (!activeModel) throw new Error("No AI model selected.");

    await KnowledgeBase.initialize();
    const medicalContext = await KnowledgeBase.getRelevantContext(`diet for ${profile.conditions}`);
    await LlamaService.loadModel(activeModel.filename);

    const generatedDays: DayPlan[] = [];
    for (let i = 0; i < DAY_NAMES.length; i++) {
        const day = DAY_NAMES[i];
        onProgress?.(day, i);
        
        let success = false;
        let attempts = 0;
        while (!success && attempts < 2) {
            try {
                const response = await LlamaService.chat([{ role: "user", content: buildDietPrompt(profile, day) }], "Return JSON.");
                const parsed = parseMiniDietDay(response, day);
                if (parsed) {
                    generatedDays.push(parsed);
                    success = true;
                } else attempts++;
            } catch (err) {
                attempts++;
            }
        }
        if (!success) throw new Error(`Failed on ${day}`);
    }

    const fullPlan: StructuredDietPlan = { title: "7-Day Personalised Diet Plan", days: generatedDays };
    if (autoSave) {
        await storageService.savePlan({
            id: Date.now().toString(),
            type: "diet",
            title: fullPlan.title,
            content: JSON.stringify(fullPlan),
            createdAt: new Date().toISOString()
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
