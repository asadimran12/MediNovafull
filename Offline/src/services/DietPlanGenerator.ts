import storageService, { UserProfile, HealthPlan } from "./StorageService";
import KnowledgeBase from "./KnowledgeBase";

// ─── Diet Plan Types ──────────────────────────────────────────────────────────

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

const DAY_NAMES = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

// ─── Variety Helpers ──────────────────────────────────────────────────────

function getDietaryFocus(day: string): string {
    switch (day) {
        case "Monday": return "Theme: Mediterranean. Focus on olive oil, fish, whole grains, and fresh vegetables.";
        case "Tuesday": return "Theme: Asian Fusion (Halal). Focus on stir-fry, lean poultry, ginger, and garlic.";
        case "Wednesday": return "Theme: Hearty Grills. Focus on grilled chicken/turkey, roasted roots, and legumes.";
        case "Thursday": return "Theme: Plant-Power. Focus on chickpeas, lentils, tofu (if halal), and leafy greens.";
        case "Friday": return "Theme: Middle Eastern. Focus on hummus, grilled skewers, tabbouleh, and quinoa.";
        case "Saturday": return "Theme: Seafood & Citrus. Focus on steamed fish, citrus marinades, and brown rice.";
        case "Sunday": return "Theme: Light Comfort. Focus on clear broths, poached proteins, and baked vegetables.";
        default: return "Balanced nutrition.";
    }
}

function buildConditionGuidelines(conditions: string): string {
    const lower = conditions.toLowerCase();
    const rules: string[] = [];
    if (lower.includes("diabet"))
        rules.push("STRICT CARB LIMIT: Max 30-45g complex carbs per meal, zero refined sugar, high fiber.");
    if (lower.includes("hypertension") || lower.includes("blood pressure"))
        rules.push("LOW SODIUM: Under 1500mg daily, high potassium (spinach, avocados).");
    if (lower.includes("heart") || lower.includes("cardio") || lower.includes("cholesterol"))
        rules.push("HEART HEALTHY: ZERO heavy red meat (no beef/lamb). Use ONLY lean poultry, fish, and plant-based proteins. Max 15g fat per meal.");
    if (lower.includes("kidney"))
        rules.push("RENAL DIET: Low potassium, low phosphorus, moderate protein (max 20g per meal).");
    if (lower.includes("obesity") || lower.includes("overweight"))
        rules.push("WEIGHT LOSS: Calorie deficit (1500 kcal total daily), high protein, high volume vegetables.");

    return rules.length > 0 ? rules.join(" | ") : "Balanced healthy diet. Standard macros (50% Carb, 25% Protein, 25% Fat).";
}

function buildPrompt(profile: UserProfile, day: string, medicalContext: string): string {
    const age = profile.age ? `${profile.age} year old` : "adult";
    const gender = profile.gender || "person";
    const conditions = profile.conditions?.trim() || "none";
    const guidelines = buildConditionGuidelines(conditions);
    const theme = `${day}: ${getDietaryFocus(day)}`;

    return `You are a certified clinical nutritionist and halal diet expert.

PATIENT PROFILE:
- Age: ${age}
- Gender: ${gender}
- Medical Conditions: ${conditions}

MANDATORY DAILY THEME:
${theme}

MEDICAL DIET GUIDELINES:
${guidelines}

MEDICAL CONTEXT (RAG):
${medicalContext || "No specific medical records found for this profile."}

RULES (STRICT):
1. You MUST follow the "MEDICAL CONTEXT" provided above. It is your absolute priority.
2. BE DIVERSE: Every day of the week must have completely different food items.
3. REAL NAMES ONLY: Use specific real food names that match the DAILY THEME. NEVER write "e.g." or any placeholder text.
4. HALAL: All suggestions must be halal.
5. Minified keys MUST be used: "kc" for calories, "p" for protein, "c" for carbs, "f" for fat (macros as raw numbers, NO "g")
6. NO TEXT. ONLY JSON. START WITH { AND END WITH }.

RESPONSE FORMAT (JSON OBJECT) - FOLLOW THIS STRUCTURE EXACTLY:
{
  "d": "${day}",
  "sum": { "kc": 2000, "p": 100, "c": 250, "f": 70 },
  "b": [{ "n": "Scrambled Eggs with Sauteed Spinach", "kc": 350, "p": 25, "c": 5, "f": 20 }],
  "l": [{ "n": "Grilled Chicken Breast with Brown Rice", "kc": 550, "p": 45, "c": 40, "f": 15 }],
  "dn": [{ "n": "Baked Salmon with Steamed Broccoli", "kc": 450, "p": 40, "c": 10, "f": 12 }],
  "s": [{ "n": "Handful of Unsalted Almonds", "kc": 150, "p": 6, "c": 5, "f": 14 }]
}`;
}


/**
 * Performs a post-generation safety check against medical guidelines.
 */
function verifyDietSafety(plan: DayPlan, medicalContext: string): { safe: boolean; reason?: string } {
    const lowerContext = medicalContext.toLowerCase();
    const planText = JSON.stringify(plan).toLowerCase();

    // Heuristics for common medical contradictions
    if (lowerContext.includes("avoid simple sugars") || lowerContext.includes("zero sugar")) {
        const forbidden = ["sugar", "honey", "syrup", "dessert", "cake", "candy"];
        for (const term of forbidden) {
            if (planText.includes(term)) return { safe: false, reason: `Found forbidden ingredient: ${term}` };
        }
    }

    if (lowerContext.includes("low sodium") || lowerContext.includes("salt")) {
        const forbidden = ["salt", "soy sauce", "pickle", "processed meat", "canned soup"];
        for (const term of forbidden) {
            if (planText.includes(term)) return { safe: false, reason: `Found high-sodium item: ${term}` };
        }
    }

    if (lowerContext.includes("low potassium")) {
        const forbidden = ["banana", "spinach", "potato", "avocado"];
        for (const term of forbidden) {
            if (planText.includes(term)) return { safe: false, reason: `Found high-potassium item: ${term}` };
        }
    }

    return { safe: true };
}

// ─── Diet Plan Generator ───────────────────────────────────────────────────────

export async function generateDietPlan(
    onProgress?: (dayName: string, index: number) => void,
    options?: { autoSave?: boolean }
): Promise<StructuredDietPlan | void> {
    const autoSave = options?.autoSave !== false; // default true
    const profile = await storageService.getProfile();
    const LlamaService = (await import("./LlamaService")).default;

    onProgress?.("Loading Knowledge Base...", 0);

    const ModelService = (await import("./ModelService")).default;
    const activeModel = await ModelService.getActiveModel();

    if (!activeModel) {
        throw new Error("No AI model selected. Please visit Settings -> Manage AI Models.");
    }

    if (!(await ModelService.isModelDownloaded(activeModel.id))) {
        throw new Error("Active model is not downloaded. Please visit Settings -> Manage AI Models.");
    }

    // Ensure embedding model is ready (bundled as asset)
    if (!(await LlamaService.isModelDownloaded(LlamaService.EMBEDDING_MODEL_NAME))) {
        await LlamaService.downloadModel(LlamaService.EMBEDDING_MODEL_NAME, ""); // This handles assets/copy
    }

    // Initialize/Query RAG
    await KnowledgeBase.initialize();
    const query = `diet plan for ${profile.gender} ${profile.age} years old with ${profile.conditions || "no conditions"}`;
    const rawContext = await KnowledgeBase.getRelevantContext(query);
    const medicalContext = rawContext ? rawContext.substring(0, 1000) : "";
    console.log("🔍 RAG Context Retrieved for query:", query);

    // Switch back to generation model
    await LlamaService.loadModel(activeModel.filename);

    const generatedDays: DayPlan[] = [];

    for (let i = 0; i < DAY_NAMES.length; i++) {
        const dayName = DAY_NAMES[i];
        onProgress?.(`Generating ${dayName}...`, i);

        console.log(`🔄 Generating ${dayName}`);

        const prompt = buildPrompt(profile, dayName, medicalContext);
        const systemPrompt = "Return ONLY JSON. No text before or after.";

        let attempts = 0;
        let success = false;

        while (!success && attempts < 3) {
            try {
                const messages = [
                    { role: "user" as const, content: prompt }
                ];
                const response = await LlamaService.chat(messages, systemPrompt);

                const parsedDay = parseDay(response, dayName);

                if (parsedDay) {
                    const safety = verifyDietSafety(parsedDay, medicalContext);
                    if (!safety.safe) {
                        console.warn(`🚨 Safety check failed for ${dayName}: ${safety.reason}. Retrying...`);
                        attempts++;
                        continue;
                    }

                    generatedDays.push(parsedDay);
                    success = true;
                    console.log(`✅ ${dayName} generated and verified safe`);
                } else {
                    attempts++;
                    console.warn(`⚠️ Parse failed for ${dayName}, retry ${attempts}/3`);
                }

            } catch (err) {
                attempts++;
                console.error(`❌ ${dayName} attempt ${attempts} failed`, err);
            }
        }

        if (!success) {
            throw new Error(`Failed generating ${dayName}`);
        }

    }

    const fullPlan: StructuredDietPlan = {
        title: "7-Day Halal Diet Plan",
        days: generatedDays
    };

    if (autoSave) {
        await storageService.savePlan({
            id: Date.now().toString(),
            type: "diet",
            title: fullPlan.title,
            content: JSON.stringify(fullPlan),
            createdAt: new Date().toISOString(),
        });
    }

    onProgress?.("Done", 7);
    return fullPlan;
}

// ─── JSON Helpers ──────────────────────────────────────────────────────────────

function fixJSON(text: string) {
    let fixed = text.trim();
    const start = fixed.indexOf("{");
    const end = fixed.lastIndexOf("}");

    if (start !== -1 && end !== -1) {
        fixed = fixed.slice(start, end + 1);
    }

    // Fix unquoted values like: "calories": 300 kcal,
    fixed = fixed.replace(/:\s*(\d+\s*[a-zA-Z%]+)(?=\s*[,}\s])/g, ':"$1"');

    // Fix common trailing commas
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');

    return fixed;
}


function extractJson(raw: string): string {
    let cleaned = raw.replace(/```json|```/gi, "").trim();
    const start = cleaned.indexOf("[") !== -1 && cleaned.indexOf("{") !== -1
        ? Math.min(cleaned.indexOf("["), cleaned.indexOf("{"))
        : Math.max(cleaned.indexOf("["), cleaned.indexOf("{"));
    const end = cleaned.lastIndexOf("]") !== -1 && cleaned.lastIndexOf("}") !== -1
        ? Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"))
        : Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));

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

function normaliseMealItem(raw: any, defaultName: string, defaultCals: number): MealItem {
    let cals = Number(raw?.calories);
    if (isNaN(cals) || cals <= 0) cals = defaultCals;

    let name = raw?.name;
    if (
        !name ||
        typeof name !== 'string' ||
        name.trim() === "" ||
        name === "FOOD NAME HERE" ||
        name.toLowerCase().startsWith("e.g")
    ) {
        name = defaultName;
    }

    const parseMac = (val: any, fallbackRatio: number): string => {
        if (!val) return `${Math.round(cals * fallbackRatio)}g`;

        if (typeof val === 'object') {
            val = val.amount ?? val.value ?? val.qty ?? Object.values(val)[0] ?? "";
        }

        const str = String(val).trim();
        const num = parseInt(str.replace(/[^\d.]/g, ''));
        if (isNaN(num) || num <= 0) {
            return `${Math.round(cals * fallbackRatio)}g`;
        }
        return `${num}g`;
    };

    return {
        name: name.trim(),
        calories: cals,
        protein: parseMac(raw?.protein, 0.05),
        carbs: parseMac(raw?.carbs, 0.12),
        fat: parseMac(raw?.fat, 0.03),
    };
}

function normaliseMeal(raw: any, expectedType: Meal["type"]): Meal {
    if (!raw) raw = {};
    const rawType = (raw.type ?? raw.name ?? expectedType) as string;
    const mealType: Meal["type"] =
        REQUIRED_MEALS.find((t) => t.toLowerCase() === rawType.toLowerCase()) ?? expectedType;

    let defaultCals = 400;
    let defaultName = "Healthy " + mealType;
    if (mealType === "Breakfast") { defaultCals = 350; defaultName = "Oatmeal & Eggs"; }
    else if (mealType === "Lunch") { defaultCals = 500; defaultName = "Grilled Chicken Salad"; }
    else if (mealType === "Dinner") { defaultCals = 600; defaultName = "Baked Fish with Veggies"; }
    else if (mealType === "Snacks") { defaultCals = 250; defaultName = "Mixed Nuts & Fruit"; }

    const isBadName = (n: any) => !n || typeof n !== 'string' || n === "FOOD NAME HERE" || n.toLowerCase().startsWith("e.g") || n.toLowerCase() === mealType.toLowerCase() || n.trim() === "";

    if (Array.isArray(raw)) {
        const items = raw.map((i: any) => {
            let n = i.name || i.food || i.item;
            if (isBadName(n)) n = defaultName;
            return normaliseMealItem(i, n, Math.round(defaultCals / raw.length));
        });
        return { type: mealType, items };
    }

    if (Array.isArray(raw.items) && raw.items.length > 0) {
        const items = raw.items.map((i: any) => {
            let n = i.name || i.food || i.item;
            if (isBadName(n)) n = defaultName;
            return normaliseMealItem(i, n, Math.round(defaultCals / raw.items.length));
        });
        return { type: mealType, items };
    }

    let n = raw.name || raw.food || raw.item;
    if (isBadName(n)) n = defaultName;

    return {
        type: mealType,
        items: [normaliseMealItem(raw, n, defaultCals)]
    };
}

function normaliseDay(raw: any, dayName?: string): DayPlan {
    if (!raw) raw = {};
    const name = dayName ?? raw.day ?? "Day";

    const extractMeal = (obj: any, type: Meal["type"]) => {
        const lowerType = type.toLowerCase();
        if (obj[lowerType] || obj[type]) return obj[lowerType] || obj[type];

        if (Array.isArray(obj.meals)) {
            const found = obj.meals.find((m: any) => m.type === type || (m.type ?? "").toLowerCase() === lowerType);
            if (found) return found;
        }

        // Search one level deep for nested meals
        for (const key in obj) {
            if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
                if (obj[key][lowerType] || obj[key][type]) return obj[key][lowerType] || obj[key][type];
            }
        }
        return {};
    };

    const meals: Meal[] = [
        normaliseMeal(extractMeal(raw, "Breakfast"), "Breakfast"),
        normaliseMeal(extractMeal(raw, "Lunch"), "Lunch"),
        normaliseMeal(extractMeal(raw, "Dinner"), "Dinner"),
        normaliseMeal(extractMeal(raw, "Snacks"), "Snacks")
    ];

    return {
        day: name,
        summary: raw.summary ?? { calories: 1800, protein: "90g", carbs: "200g", fat: "60g" },
        meals,
    };
}

function expandMinifiedMeals(minMeals: any): any[] {
    if (!minMeals) return [];
    if (!Array.isArray(minMeals)) minMeals = [minMeals];
    return minMeals.map((m: any) => ({
        name: m.n || m.name,
        calories: m.kc || m.calories,
        protein: m.p !== undefined ? (typeof m.p === 'number' ? `${m.p}g` : m.p) : undefined,
        carbs: m.c !== undefined ? (typeof m.c === 'number' ? `${m.c}g` : m.c) : undefined,
        fat: m.f !== undefined ? (typeof m.f === 'number' ? `${m.f}g` : m.f) : undefined
    }));
}

function expandMinifiedDay(minData: any, expectedName: string): any {
    return {
        day: minData.d || minData.day || expectedName,
        summary: minData.sum ? {
            calories: minData.sum.kc || minData.sum.calories,
            // Re-add "g" for summary macros
            protein: minData.sum.p !== undefined ? `${minData.sum.p}g` : undefined,
            carbs: minData.sum.c !== undefined ? `${minData.sum.c}g` : undefined,
            fat: minData.sum.f !== undefined ? `${minData.sum.f}g` : undefined
        } : minData.summary,
        meals: [
            { type: "Breakfast", items: expandMinifiedMeals(minData.b || minData.breakfast) },
            { type: "Lunch", items: expandMinifiedMeals(minData.l || minData.lunch) },
            { type: "Dinner", items: expandMinifiedMeals(minData.dn || minData.dinner) },
            { type: "Snacks", items: expandMinifiedMeals(minData.s || minData.snacks) }
        ]
    };
}

function parseDay(raw: string, expectedDay: string): DayPlan | null {
    const cleaned = extractJson(fixJSON(raw));

    let parsed: any = null;
    try {
        parsed = JSON.parse(cleaned);
    } catch (_) {
        try {
            parsed = JSON.parse(closeJson(cleaned));
        } catch (_) { }
    }

    if (parsed) {
        // If it was wrapped in an array, take the first element
        let obj = Array.isArray(parsed) ? parsed[0] : parsed;
        if (obj.days && Array.isArray(obj.days)) {
            obj = obj.days[0];
        }
        return normaliseDay(expandMinifiedDay(obj, expectedDay));
    }

    console.warn(`⚠️ Could not parse day: ${expectedDay}, raw: ${raw.substring(0, 200)}`);
    return null;
}


export function safeParseDietPlan(raw: string): StructuredDietPlan | null {
    if (!raw || raw.trim().length < 10) return null;
    const cleaned = extractJson(raw);
    let parsed: any = null;

    try {
        parsed = JSON.parse(cleaned);
    } catch (_) {
        try {
            parsed = JSON.parse(closeJson(cleaned));
        } catch (_) {
            return null;
        }
    }

    // Handle compressed array format: [{"day":"Mn","breakfast":{"name":"Oatmeal",...},...}]
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0].breakfast) {
        return {
            title: "7-Day Halal Diet Plan",
            days: parsed.map((d: any, i: number) => {
                const dayName = d.day || DAY_NAMES[i] || "Day";

                // Helper to gracefully extract the string or object
                const buildMealItem = (mealData: any, defaultName: string, defaultCals: number) => {
                    if (typeof mealData === 'string') {
                        return normaliseMealItem({ name: mealData }, mealData, defaultCals);
                    }
                    if (typeof mealData === 'object' && mealData !== null) {
                        return normaliseMealItem(mealData, defaultName, defaultCals);
                    }
                    return normaliseMealItem({ name: defaultName }, defaultName, defaultCals);
                };

                return {
                    day: dayName,
                    summary: { calories: 1800, protein: "90g", carbs: "200g", fat: "60g" },
                    meals: [
                        { type: "Breakfast", items: [buildMealItem(d.breakfast, "Oatmeal", 350)] },
                        { type: "Lunch", items: [buildMealItem(d.lunch, "Chicken Rice", 500)] },
                        { type: "Dinner", items: [buildMealItem(d.dinner, "Fish Steak", 650)] },
                        { type: "Snacks", items: [buildMealItem(d.snacks, "Mixed Nuts", 300)] },
                    ]
                };
            })
        };
    }

    // Handle standard layout: {"days": [...]}
    if (parsed?.days?.length > 0) {
        return {
            title: parsed.title ?? "7-Day Halal Diet Plan",
            days: parsed.days.map((d: any, i: number) => normaliseDay(d, DAY_NAMES[i] ?? d.day)),
        };
    }

    // Handle single day layout wrapped
    if (parsed?.day && Array.isArray(parsed?.meals)) {
        return { title: "7-Day Halal Diet Plan", days: [normaliseDay(parsed)] };
    }

    return null;
}

// ─── Load Latest Diet Plan ────────────────────────────────────────────────────

const MEAL_DEFAULTS: Record<string, { name: string; cals: number }> = {
    Breakfast: { name: "Oatmeal with Eggs", cals: 350 },
    Lunch: { name: "Grilled Chicken Salad", cals: 500 },
    Dinner: { name: "Baked Fish with Vegetables", cals: 600 },
    Snacks: { name: "Mixed Nuts and Fruit", cals: 250 },
};

export function sanitisePlan(plan: StructuredDietPlan): StructuredDietPlan {
    return {
        ...plan,
        days: plan.days.map(day => ({
            ...day,
            meals: day.meals.map(meal => ({
                ...meal,
                items: meal.items.map(item => {
                    const isPlaceholder =
                        !item.name ||
                        item.name.trim() === "" ||
                        item.name.toLowerCase().startsWith("e.g") ||
                        item.name === "FOOD NAME HERE";
                    if (isPlaceholder) {
                        const def = MEAL_DEFAULTS[meal.type] ?? { name: "Healthy Meal", cals: 400 };
                        return { ...item, name: def.name, calories: item.calories > 0 ? item.calories : def.cals };
                    }
                    return item;
                })
            }))
        }))
    };
}

export async function loadLatestDietPlan(): Promise<StructuredDietPlan | null> {
    const plans = await storageService.getPlans("diet");
    if (plans.length === 0) return null;
    const parsed = safeParseDietPlan(plans[0].content);
    return parsed ? sanitisePlan(parsed) : null;
}
