import storageService, { UserProfile } from "./StorageService";
import KnowledgeBase from "./KnowledgeBase";


export interface ExerciseItem {
    name: string;
    duration: string;
    sets?: number;
    reps?: number;
    intensity: "Low" | "Medium" | "High";
    description: string;
}

export interface Exercise {
    type: "Warmup" | "Main" | "Cooldown" | "Optional"
    items: ExerciseItem[];
}

export interface DayExercisePlan {
    day: string;
    summary: {
        totalDuration: string;
        intensity: string;
    };
    exercises: Exercise[];
    notes?: string[];
}

export interface StructuredExercisePlan {
    title: string;
    days: DayExercisePlan[];
}


const DAY_NAMES = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

// Allowed exercise whitelist to prevent hallucinations
const ALLOWED_EXERCISES = [
    "Brisk Walking",
    "Cycling",
    "Light Jogging",
    "Bodyweight Squats",
    "Push-Ups",
    "Lunges",
    "Planks",
    "Stretching",
    "Dynamic Stretching",
    "Arm Circles",
    "Leg Raises"
];

// Filter invalid exercises using whitelist
function filterInvalidExercises(day: DayExercisePlan): DayExercisePlan {
    day.exercises.forEach(ex => {
        ex.items = ex.items.filter(i => ALLOWED_EXERCISES.includes(i.name));
        // If all exercises are filtered out, keep a fallback
        if (ex.items.length === 0 && ex.type !== "Optional") {
            ex.items.push({
                name: "Brisk Walking",
                duration: "10 min",
                intensity: "Low",
                description: "Gentle walking to raise heart rate"
            });
        }
    });
    return day;
}

function getDailyFocus(day: string): string {
    switch (day) {
        case "Monday": return "Cardio Focus: Use walking or cycling.";
        case "Tuesday": return "Strength Focus: Use bodyweight squats and push-ups.";
        case "Wednesday": return "Recovery & Mobility: Use stretching and arm circles.";
        case "Thursday": return "Mixed Focus: Cardio and Light Resistance (Lunges).";
        case "Friday": return "Cardio Focus: Brisk Walking or Light Jogging.";
        case "Saturday": return "Strength Focus: Full body movements (Squats/Push-ups).";
        case "Sunday": return "Active Recovery: Very light walking and stretching.";
        default: return "Balanced Mix.";
    }
}

function buildExerciseGuidelines(conditions: string): string {
    const lower = conditions.toLowerCase();
    const rules: string[] = [];
    if (lower.includes("diabet"))
        rules.push("Focus on moderate cardio and resistance training. Avoid high-intensity sprints.");
    if (lower.includes("hypertension") || lower.includes("blood pressure"))
        rules.push("Low to moderate intensity cardio. Avoid heavy lifting that spikes BP.");
    if (lower.includes("heart") || lower.includes("cardio") || lower.includes("cholesterol"))
        rules.push("Prioritize heart-friendly cardio and low-impact strength exercises.");
    if (lower.includes("kidney"))
        rules.push("Avoid high-intensity exercise. Prefer gentle mobility and light cardio.");
    if (lower.includes("obesity") || lower.includes("overweight"))
        rules.push("Calorie-burning exercises: moderate cardio, full-body resistance, walking, and flexibility training.");

    return rules.length > 0 ? rules.join(" | ") : "Balanced weekly exercise plan with mixed intensity.";
}
function buildExerciseDayPrompt(profile: UserProfile, day: string, medicalContext: string): string {
    const age = profile.age ? `${profile.age} year old` : "adult";
    const gender = profile.gender || "person";
    const conditions = profile.conditions?.trim() || "none";
    const guidelines = buildExerciseGuidelines(conditions);
    const focus = getDailyFocus(day);

    return `
You are a certified fitness trainer and diabetes-safe exercise planner.

UNIQUE DAILY FOCUS:
${focus}

USER PROFILE:
- Age: ${age}
- Gender: ${gender}
- Medical Conditions: ${conditions}

EXERCISE GUIDELINES:
${guidelines}

MEDICAL CONTEXT:
${medicalContext || "No specific medical records found."}

RULES (STRICT):
1. Warmup: 5-10 min, Low intensity ONLY.
2. Main: Moderate cardio + resistance; NO high-intensity sprints or extreme isometric exercises.
3. Cooldown: 5-10 min, low-intensity stretching/mobility.
4. BE CREATIVE: Do NOT just copy the JSON example. Choose varied exercises from this list: Brisk Walking, Cycling, Light Jogging, Bodyweight Squats, Push-Ups, Lunges, Planks, Stretching, Dynamic Stretching, Arm Circles, Leg Raises.
5. Each day MUST be different from other days.
6. Each day MUST include safety notes:
   - "Check blood sugar before and after exercise"
   - "Stay hydrated"
   - "Stop if dizzy or weak"
7. TOTAL duration per day: 45–60 min
8. JSON only, NO markdown, NO extra text.

OUTPUT FORMAT (JSON) - DO NOT COPY VALUES, ONLY STRUCTURE:
{
  "day": "${day}",
  "summary": { "totalDuration": "60 min", "intensity": "Medium" },
  "warmup": { "items": [{ "name": "<Insert Warmup name>", "duration": "5-10 min", "intensity": "Low", "description": "Brief instruction" }] },
  "main": { "items": [{ "name": "<Insert Main Exercise name>", "duration": "15-20 min", "intensity": "Medium", "description": "Specific instruction", "sets": 3, "reps": 12 }] },
  "cooldown": { "items": [{ "name": "<Insert Cooldown name>", "duration": "5-10 min", "intensity": "Low", "description": "Brief instruction" }] },
  "notes": [
    "Check blood sugar before and after exercise",
    "Stay hydrated",
    "Stop if dizzy or weak"
  ]
}
`;
}

/**
 * Performs a post-generation safety check against medical guidelines.
 */
function verifyExerciseSafety(plan: DayExercisePlan, medicalContext: string): { safe: boolean; reason?: string } {
    const planText = JSON.stringify(plan).toLowerCase();

    if (planText.includes("exercise name")) return { safe: false, reason: "Placeholder exercise detected." };
    if (planText.match(/plank/gi) && (planText.includes("30 min") || planText.includes("30min"))) return { safe: false, reason: "Plank duration too long." };
    if (planText.includes("hiit") && medicalContext.toLowerCase().includes("gentle")) return { safe: false, reason: "HIIT suggested where only gentle movements recommended." };
    if (planText.includes("high-intensity") && planText.includes("warmup")) return { safe: false, reason: "Warmup includes high-intensity exercises." };

    return { safe: true };
}

export async function generateExercisePlan(
    onProgress?: (dayName: string, index: number) => void,
    options?: { autoSave?: boolean }
): Promise<StructuredExercisePlan | void> {
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
    const query = `exercise plan for ${profile.gender} ${profile.age} years old with ${profile.conditions || "no conditions"}`;
    const medicalContext = await KnowledgeBase.getRelevantContext(query);
    console.log("🔍 RAG Context Retrieved for Exercise query:", query);

    await LlamaService.loadModel(activeModel.filename);
    const generatedDays: DayExercisePlan[] = [];
    for (let i = 0; i < DAY_NAMES.length; i++) {
        const day = DAY_NAMES[i];
        onProgress?.(`Generating ${day}`, i);
        console.log(`🔄 Generating ${day}`);
        const prompt = buildExerciseDayPrompt(profile, day, medicalContext);
        const systemPrompt = "You are a fitness trainer. Return ONLY valid JSON.";
        let attempts = 0;
        let success = false;
        while (!success && attempts < 3) {
            try {
                const messages = [
                    { role: "user" as const, content: prompt }
                ];
                const response = await LlamaService.chat(messages, systemPrompt);
                const parsedDay = parseSingleExerciseDay(response, day);
                if (parsedDay) {
                    const safety = verifyExerciseSafety(parsedDay, medicalContext);
                    if (!safety.safe) {
                        console.warn(`🚨 Safety check failed for ${day}: ${safety.reason}. Retrying...`);
                        attempts++;
                        continue;
                    }
                    generatedDays.push(parsedDay);
                    success = true;
                    console.log(`✅ ${day} generated and verified safe`);
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
    const fullPlan: StructuredExercisePlan = {
        title: "7-Day Exercise Plan",
        days: generatedDays
    };

    if (autoSave) {
        await storageService.savePlan({
            id: Date.now().toString(),
            type: "exercise",
            title: fullPlan.title,
            content: JSON.stringify(fullPlan),
            createdAt: new Date().toISOString()
        });
    }

    onProgress?.("Exercise plan ready", 7);
    console.log("✅ Exercise plan generated");
    return fullPlan;
}


function parseSingleExerciseDay(raw: string, expectedDay: string): DayExercisePlan | null {
    const cleaned = extractJson(fixJSON(raw));
    let parsed: any = null;
    try {
        parsed = JSON.parse(cleaned);
    } catch (error) {
        try {
            parsed = JSON.parse(closeJson(cleaned));
        } catch (error) {

        }
    }
    if (parsed && typeof parsed === "object") {
        return normaliseExerciseDay(parsed, expectedDay)
    }
    console.warn(`⚠️ Could not parse day: ${expectedDay}`);
    return normaliseExerciseDay({}, expectedDay);
}

function fixJSON(text: string) {
    let fixed = text.trim();
    const start = fixed.indexOf("{");
    const end = fixed.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
        fixed = fixed.slice(start, end + 1);
    }

    // Fix unquoted durations (e.g., "duration": 30 min,)
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
function normaliseExerciseItem(raw: any, defaultName: string, defaultDuration = "15 min"): ExerciseItem {
    const duration = raw?.duration || raw?.time || defaultDuration;
    const intensity: "Low" | "Medium" | "High" =
        ["Low", "Medium", "High"].includes(raw?.intensity) ? raw.intensity : "Medium";

    return {
        name: raw?.name || raw?.activity || raw?.exercise || defaultName,
        duration: String(duration),
        description: raw?.description || raw?.reason || "",
        sets: Number(raw?.sets ?? 0),
        reps: Number(raw?.reps ?? 0),
        intensity,
    };
}

const REQUIRED_EXERCISES: Exercise["type"][] = ["Warmup", "Main", "Cooldown", "Optional"];

function normaliseExercise(raw: any, type: Exercise["type"]): Exercise {
    if (!raw) raw = {};
    
    // Handle case where raw is actually the array of items
    let items: any[] = [];
    if (Array.isArray(raw)) {
        items = raw;
    } else if (Array.isArray(raw.items)) {
        items = raw.items;
    } else if (Array.isArray(raw.exercises)) {
        items = raw.exercises;
    } else if (Object.keys(raw).length > 0) {
        // Single object fallback
        items = [raw];
    }

    const normalisedItems = items.length > 0
        ? items.map((i: any) => normaliseExerciseItem(i, type + " Exercise"))
        : (type !== "Optional" ? [normaliseExerciseItem({}, type + " Exercise")] : []);

    return { type, items: normalisedItems };
}

function normaliseExerciseDay(raw: any, dayName?: string): DayExercisePlan {
    const name = dayName ?? raw.day ?? "Day";
    
    const extractCategory = (obj: any, type: string) => {
        const lower = type.toLowerCase();
        if (obj[lower] || obj[type]) return obj[lower] || obj[type];

        // Search one level deep for nested categories
        for (const key in obj) {
            if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
                if (obj[key][lower] || obj[key][type]) return obj[key][lower] || obj[key][type];
            }
        }
        return {};
    };

    const exercises: Exercise[] = REQUIRED_EXERCISES.map(t => normaliseExercise(extractCategory(raw, t), t));

    const dayPlan: DayExercisePlan = {
        day: name,
        summary: { 
            totalDuration: raw.summary?.totalDuration || "60 min", 
            intensity: raw.summary?.intensity || "Medium" 
        },
        exercises,
        notes: raw.notes || [
            "Check blood sugar before and after exercise",
            "Stay hydrated",
            "Stop if dizzy or weak"
        ],
    };

    return filterInvalidExercises(dayPlan);
}

// ─── Load Latest Exercise Plan ────────────────────────────────────────────────
export async function loadLatestExercisePlan(): Promise<StructuredExercisePlan | null> {
    const plans = await storageService.getPlans("exercise");
    if (plans.length === 0) return null;
    try {
        return JSON.parse(plans[0].content);
    } catch {
        return null;
    }
}

