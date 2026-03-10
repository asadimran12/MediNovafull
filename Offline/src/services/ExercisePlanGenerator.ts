import storageService, { UserProfile } from "./StorageService";


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
}

export interface StructuredExercisePlan {
    title: string;
    days: DayExercisePlan[];
}


const DAY_NAMES = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

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
function buildExerciseDayPrompt(profile: UserProfile, day: string): string {
    const age = profile.age ? `${profile.age} year old` : "adult";
    const gender = profile.gender || "person";
    const conditions = profile.conditions?.trim() || "none";
    const guidelines = buildExerciseGuidelines(conditions)
    return `You are a certified fitness trainer.

Create a realistic and safe exercise plan for ${day}.

USER INFORMATION
Age: ${age}
Gender: ${gender}
Medical Conditions: ${conditions}

EXERCISE GUIDELINES
${guidelines}

EXERCISE RULES
* Use real exercise names (e.g., push-ups, squats, jogging, cycling, yoga)
* Each exercise must have duration in minutes
* Include sets/reps if applicable
* Include intensity (Low, Medium, High)
* Do not repeat the same exercise on multiple days
* Output only valid JSON

EXERCISES REQUIRED
Warmup
Main
Cooldown
Optional

OUTPUT STRUCTURE
{
  "day": "${day}",
  "warmup": { "name": "", "duration": "", "intensity": "" },
  "main": { "name": "", "duration": "", "sets": 0, "reps": 0, "intensity": "" },
  "cooldown": { "name": "", "duration": "", "intensity": "" },
  "optional": { "name": "", "duration": "", "intensity": "" }
}`;

}

export async function generateExercisePlan(onProgress?: (dayName: string, index: number) => void): Promise<void> {
    const profile = await storageService.getProfile();
    const LlamaService = (await import("./LlamaService")).default;

    await LlamaService.loadModel();
    const generatedDays: DayExercisePlan[] = [];
    for (let i = 0; i < DAY_NAMES.length; i++) {
        const day = DAY_NAMES[i];
        onProgress?.(`Generating ${day}`, i);
        console.log(`🔄 Generating ${day}`);
        const prompt = buildExerciseDayPrompt(profile, day);
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
    const fullPlan: StructuredExercisePlan = {
        title: "7-Day Exercise Plan",
        days: generatedDays
    };
    await storageService.savePlan({
        id: Date.now().toString(),
        type: "exercise",
        title: fullPlan.title,
        content: JSON.stringify(fullPlan),
        createdAt: new Date().toISOString()
    });
    onProgress?.("Exercise plan generated successfully", 7);
    console.log("✅ Exercise plan saved successfully");
}


function parseSingleExerciseDay(raw: string, expectedDay: string): DayExercisePlan | null {
    const cleaned = raw.replace(/```json|```/gi, "").trim();
    let parsed: any = null;
    try {
        parsed = JSON.parse(cleaned);
    } catch (error) {
        try {
            parsed = JSON.parse(cleaned + "}");
        } catch (error) {

        }
    }
    if (parsed && typeof parsed === "object") {
        return normaliseExerciseDay(parsed, expectedDay)
    }
    console.warn(`⚠️ Could not parse day: ${expectedDay}`);
    return normaliseExerciseDay({}, expectedDay);
}


// ─── Normalisation ─────────────────────────────────────────────────────────────
function normaliseExerciseItem(raw: any, defaultName: string, defaultDuration = "15 min"): ExerciseItem {
    const duration = raw?.duration || defaultDuration;
    const intensity: "Low" | "Medium" | "High" =
        ["Low", "Medium", "High"].includes(raw?.intensity) ? raw.intensity : "Medium";

    return {
        name: raw?.name || defaultName,
        duration,
        description: raw?.description || "",
        sets: raw?.sets ?? 0,
        reps: raw?.reps ?? 0,
        intensity,
    };
}

const REQUIRED_EXERCISES: Exercise["type"][] = ["Warmup", "Main", "Cooldown", "Optional"];

function normaliseExercise(raw: any, type: Exercise["type"]): Exercise {
    if (!raw) raw = {};
    const items = Array.isArray(raw.items) && raw.items.length > 0
        ? raw.items.map((i: any) => normaliseExerciseItem(i, type + " Exercise"))
        : [normaliseExerciseItem(raw, type + " Exercise")];

    return { type, items };
}

function normaliseExerciseDay(raw: any, dayName?: string): DayExercisePlan {
    const name = dayName ?? raw.day ?? "Day";
    const exercises: Exercise[] = REQUIRED_EXERCISES.map(t => normaliseExercise(raw[t.toLowerCase()] ?? {}, t));

    return {
        day: name,
        summary: { totalDuration: "60 min", intensity: "Medium" },
        exercises,
    };
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

