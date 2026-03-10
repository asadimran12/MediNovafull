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

// ─── Condition Guidelines ──────────────────────────────────────────────────────
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

function buildDayPrompt(profile: UserProfile, day: string, medicalContext: string): string {
    const age = profile.age ? `${profile.age} year old` : "adult";
    const gender = profile.gender || "person";
    const conditions = profile.conditions?.trim() || "none";
    const guidelines = buildConditionGuidelines(conditions);

    return `You are a certified clinical nutritionist and halal diet expert.

Create a realistic and healthy halal diet plan for ${day}.

PATIENT INFORMATION
Age: ${age}
Gender: ${gender}
Medical Conditions: ${conditions}

MEDICAL DIET GUIDELINES
${guidelines}

GROUND TRUTH MEDICAL KNOWLEDGE
${medicalContext || "Standard healthy nutrition principles."}

DIET RULES
* All food must be halal
* Meals must use real food names
* Never use the words Breakfast, Lunch, Dinner, or Snacks as dish names
* Each meal must contain a specific dish name
* Meals should be common healthy foods
* Avoid repeating the same meal on multiple days
* All meals must have protein greater than 5g
* Macros must always include grams (example: 25g)

MEALS REQUIRED
Breakfast
Lunch
Dinner
Snacks

CALORIE TARGET PER DAY
Total daily calories should be around 1800.

MEAL CALORIE RANGES
Breakfast: 300-400 calories
Lunch: 450-550 calories
Dinner: 500-650 calories
Snacks: 200-300 calories

MACRO FORMAT
protein: number + g
carbs: number + g
fat: number + g

IMPORTANT RULES
* Use realistic food names like: omelette, oatmeal, grilled chicken, rice, lentils, yogurt, fruit, nuts, fish, salad
* Never leave any field empty
* Every meal must have a real dish name
* Output must be valid JSON only

OUTPUT STRUCTURE
{
"day": "${day}",
"breakfast": {
"name": "",
"calories": 0,
"protein": "",
"carbs": "",
"fat": ""
},
"lunch": {
"name": "",
"calories": 0,
"protein": "",
"carbs": "",
"fat": ""
},
"dinner": {
"name": "",
"calories": 0,
"protein": "",
"carbs": "",
"fat": ""
},
"snacks": {
"name": "",
"calories": 0,
"protein": "",
"carbs": "",
"fat": ""
}
}`;
}
// ─── Diet Plan Generator ───────────────────────────────────────────────────────

export async function generateDietPlan(
    onProgress?: (dayName: string, index: number) => void
): Promise<void> {

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
    const query = `${profile.gender} ${profile.age} years old with ${profile.conditions || "no conditions"}`;
    const medicalContext = await KnowledgeBase.getRelevantContext(query);
    console.log("🔍 RAG Context Retrieved for query:", query);

    // Switch back to generation model
    await LlamaService.loadModel(activeModel.filename);

    const generatedDays: DayPlan[] = [];

    for (let i = 0; i < DAY_NAMES.length; i++) {

        const day = DAY_NAMES[i];
        onProgress?.(`Generating ${day}...`, i);

        console.log(`🔄 Generating ${day}`);

        const prompt = buildDayPrompt(profile, day, medicalContext);
        const systemPrompt = "You are a nutritionist. Return ONLY valid JSON.";

        let attempts = 0;
        let success = false;

        while (!success && attempts < 3) {
            try {

                const messages = [
                    { role: "user" as const, content: prompt }
                ];

                const response = await LlamaService.chat(messages, systemPrompt);

                const parsedDay = parseSingleDay(response, day);

                if (parsedDay) {
                    generatedDays.push(parsedDay);
                    success = true;
                    console.log(`✅ ${day} generated`);
                } else {
                    attempts++;
                    console.warn(`⚠️ Parse failed for ${day}, retry ${attempts}/3`);
                }

            } catch (err) {
                attempts++;
                console.error(`❌ ${day} attempt ${attempts} failed`, err);
            }
        }

        if (!success) {
            throw new Error(`Failed generating ${day}`);
        }
    }

    const fullPlan: StructuredDietPlan = {
        title: "7-Day Halal Diet Plan",
        days: generatedDays
    };

    await storageService.savePlan({
        id: Date.now().toString(),
        type: "diet",
        title: fullPlan.title,
        content: JSON.stringify(fullPlan),
        createdAt: new Date().toISOString(),
    });

    onProgress?.("Done", 7);
}
// ─── JSON Helpers ──────────────────────────────────────────────────────────────

function fixJSON(text: string) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start !== -1 && end !== -1) {
        return text.slice(start, end + 1);
    }

    return text;
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
    if (!name || typeof name !== 'string' || name.trim() === "" || name === "FOOD NAME HERE") {
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

    const isBadName = (n: any) => !n || typeof n !== 'string' || n === "FOOD NAME HERE" || n.toLowerCase() === mealType.toLowerCase() || n.trim() === "";

    if (Array.isArray(raw.items) && raw.items.length > 0) {
        const items = raw.items.map((i: any) => {
            let n = i.name;
            if (isBadName(n)) n = defaultName;
            return normaliseMealItem(i, n, Math.round(defaultCals / raw.items.length));
        });
        return { type: mealType, items };
    }

    let n = raw.name;
    if (isBadName(n)) n = defaultName;

    return {
        type: mealType,
        items: [normaliseMealItem(raw, n, defaultCals)]
    };
}

function normaliseDay(raw: any, dayName?: string): DayPlan {
    if (!raw) raw = {};
    const name = dayName ?? raw.day ?? "Day";

    const extractMeal = (type: Meal["type"]) => {
        const lowerType = type.toLowerCase();
        return raw[lowerType] ?? raw.meals?.find((m: any) => m.type === type || (m.type ?? "").toLowerCase() === lowerType);
    };

    const meals: Meal[] = [
        normaliseMeal(extractMeal("Breakfast"), "Breakfast"),
        normaliseMeal(extractMeal("Lunch"), "Lunch"),
        normaliseMeal(extractMeal("Dinner"), "Dinner"),
        normaliseMeal(extractMeal("Snacks"), "Snacks")
    ];

    return {
        day: name,
        summary: raw.summary ?? { calories: 1800, protein: "90g", carbs: "200g", fat: "60g" },
        meals,
    };
}

function parseSingleDay(raw: string, expectedDay: string): DayPlan | null {
    const cleaned = extractJson(fixJSON(raw));

    let parsed: any = null;
    try {
        parsed = JSON.parse(cleaned);
    } catch (_) {
        try {
            parsed = JSON.parse(closeJson(cleaned));
        } catch (_) { }
    }

    if (parsed && typeof parsed === "object") {
        return normaliseDay(parsed, expectedDay);
    }

    console.warn(`⚠️ Could not parse day: ${expectedDay}, raw: ${raw.substring(0, 200)}`);
    return normaliseDay({}, expectedDay); // Fallback instead of failing entirely
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

export async function loadLatestDietPlan(): Promise<StructuredDietPlan | null> {
    const plans = await storageService.getPlans("diet");
    if (plans.length === 0) return null;
    return safeParseDietPlan(plans[0].content);
}
