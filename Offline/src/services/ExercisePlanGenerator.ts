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
    trainerTip?: string;
    exercises: Exercise[];
    notes?: string[];
}

export interface StructuredExercisePlan {
    title: string;
    days: DayExercisePlan[];
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const EXERCISE_DATABASE: Record<string, { desc: string; sets?: number; reps?: number; intensity: "Low" | "Medium" | "High" }> = {
    "Brisk Walking": { desc: "Walk at a pace where you can talk but not sing.", intensity: "Medium" },
    "Cycling": { desc: "Steady pace on flat ground or stationary bike.", intensity: "Medium" },
    "Light Jogging": { desc: "Gentle run, focus on breathing.", intensity: "Medium" },
    "Bodyweight Squats": { desc: "Lower hips until thighs are parallel to floor.", sets: 3, reps: 12, intensity: "Medium" },
    "Push-Ups": { desc: "Keep back straight, lower chest to floor.", sets: 3, reps: 10, intensity: "High" },
    "Lunges": { desc: "Step forward, lower back knee toward ground.", sets: 3, reps: 10, intensity: "Medium" },
    "Planks": { desc: "Hold push-up position on forearms.", sets: 3, reps: 30, intensity: "High" },
    "Stretching": { desc: "Slow, static holds for flexibility.", intensity: "Low" },
    "Dynamic Stretching": { desc: "Active movements to warm up muscles.", intensity: "Low" },
    "Arm Circles": { desc: "Rotate arms in small circles to warm up shoulders.", intensity: "Low" },
    "Leg Raises": { desc: "Lie on back, lift legs toward ceiling.", sets: 3, reps: 12, intensity: "Medium" },
};

function buildExerciseDayPrompt(profile: UserProfile, day: string): string {
    const focus = getDailyFocus(day);
    return `Return JSON for ${day} workout.
User: ${profile.age}y ${profile.gender}, conditions: ${profile.conditions || "none"}.
Focus: ${focus}
Structure: Warmup(3 items), Main(3 items), Cooldown(3 items).
Item: {"n": "name", "d": "duration"}.
TrainerTip: One short, PERSONALIZED tip.
Notes: 3 safety tips.
Exercises to use: ${Object.keys(EXERCISE_DATABASE).join(", ")}.
JSON ONLY. NO TEXT.`;
}

function getDailyFocus(day: string): string {
    const focuses: Record<string, string> = {
        Monday: "Cardio", Tuesday: "Strength", Wednesday: "Recovery",
        Thursday: "Mixed", Friday: "Cardio", Saturday: "Full Body", Sunday: "Active Recovery"
    };
    return focuses[day] || "General Fitness";
}

export async function generateExercisePlan(
    onProgress?: (dayName: string, index: number) => void,
    options?: { autoSave?: boolean }
): Promise<StructuredExercisePlan | void> {
    const autoSave = options?.autoSave !== false;
    const profile = await storageService.getProfile();
    const LlamaService = (await import("./LlamaService")).default;
    const ModelService = (await import("./ModelService")).default;

    const activeModel = await ModelService.getActiveModel();
    if (!activeModel) throw new Error("No AI model selected.");

    await KnowledgeBase.initialize();
    const medicalContext = await KnowledgeBase.getRelevantContext(`exercise for ${profile.conditions}`);
    await LlamaService.loadModel(activeModel.filename);

    const generatedDays: DayExercisePlan[] = [];
    for (let i = 0; i < DAY_NAMES.length; i++) {
        const day = DAY_NAMES[i];
        onProgress?.(day, i);
        
        let success = false;
        let attempts = 0;
        while (!success && attempts < 2) {
            try {
                const response = await LlamaService.chat([{ role: "user", content: buildExerciseDayPrompt(profile, day) }], "Return JSON.");
                const parsed = parseMiniDay(response, day);
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

    const fullPlan: StructuredExercisePlan = { title: "7-Day Workout Plan", days: generatedDays };
    if (autoSave) {
        await storageService.savePlan({
            id: Date.now().toString(),
            type: "exercise",
            title: fullPlan.title,
            content: JSON.stringify(fullPlan),
            createdAt: new Date().toISOString()
        });
    }
    return fullPlan;
}

function parseMiniDay(raw: string, day: string): DayExercisePlan | null {
    const cleaned = extractJson(fixJSON(raw));
    let json: any = null;
    
    try {
        json = JSON.parse(cleaned);
    } catch (e) {
        console.warn("Standard JSON parse failed, attempting regex recovery for day:", day);
        json = attemptRegexRecovery(raw);
    }

    if (!json) {
        console.error("All parsing attempts failed for day:", day);
        return null;
    }
    
    try {
        const tip = json.TrainerTip || json.trainertip || json.tip || json.tpt || json.PersonalizedTip || "Focus on form and breathing.";
        const notes = json.Notes || json.notes || json.safety || json.SafetyTips || ["Stay hydrated", "Stop if dizzy"];

        // Case 1: Array of category objects
        if (Array.isArray(json)) {
            const first = json[0];
            // If it's a flat list of exercises instead of categories
            if (first && (first.n || first.name) && !first.d && !Array.isArray(first.d)) {
                 return {
                    day,
                    summary: { totalDuration: "45-60 min", intensity: "Medium" },
                    trainerTip: String(tip),
                    exercises: [
                        expandCategory(json.slice(0, 3), "Warmup"),
                        expandCategory(json.slice(3, 7), "Main"),
                        expandCategory(json.slice(7), "Cooldown")
                    ],
                    notes: Array.isArray(notes) ? notes : [String(notes)]
                };
            }

            const getCat = (name: string) => json.find(c => (c.n || c.name || "").toLowerCase().includes(name.toLowerCase()))?.d || [];
            return {
                day,
                summary: { totalDuration: "45-60 min", intensity: "Medium" },
                trainerTip: String(tip),
                exercises: [
                    expandCategory(getCat("Warmup"), "Warmup"),
                    expandCategory(getCat("Main"), "Main"),
                    expandCategory(getCat("Cooldown"), "Cooldown")
                ],
                notes: Array.isArray(notes) ? notes : [String(notes)]
            };
        }

        // Case 2: Nested categories
        return {
            day: day,
            summary: { totalDuration: "45-60 min", intensity: "Medium" },
            trainerTip: String(tip),
            exercises: [
                expandCategory(json.Warmup || json.warmup || json.w || [], "Warmup"),
                expandCategory(json.Main || json.main || json.m || [], "Main"),
                expandCategory(json.Cooldown || json.cooldown || json.c || [], "Cooldown")
            ],
            notes: Array.isArray(notes) ? notes : [String(notes)]
        };
    } catch (e) {
        return null;
    }
}

function attemptRegexRecovery(raw: string): any {
    const exercises: any[] = [];
    const itemRegex = /{\s*["']n["']\s*:\s*["']([^"']+)["']\s*,\s*["']d["']\s*:\s*["']([^"']+)["']\s*}/gi;
    let match;
    while ((match = itemRegex.exec(raw)) !== null) {
        exercises.push({ n: match[1], d: match[2] });
    }

    if (exercises.length > 0) {
        return {
            Warmup: exercises.slice(0, 3),
            Main: exercises.slice(3, 7),
            Cooldown: exercises.slice(7),
            TrainerTip: "Focus on form and safety."
        };
    }
    return null;
}

function expandCategory(raw: any, type: Exercise["type"]): Exercise {
    let items: any[] = [];
    if (Array.isArray(raw)) items = raw;
    else if (raw && typeof raw === "object") items = raw.items || raw.exercises || [raw];

    const normalisedItems: ExerciseItem[] = items.map((i: any) => {
        const name = i.n || i.name || i.exercise || "Walking";
        const db = EXERCISE_DATABASE[name] || EXERCISE_DATABASE["Brisk Walking"];
        return {
            name,
            duration: String(i.d || i.duration || "10 min"),
            intensity: db.intensity,
            description: db.desc,
            sets: db.sets,
            reps: db.reps
        };
    });

    if (normalisedItems.length === 0 && type !== "Optional") {
        const fallback = EXERCISE_DATABASE["Brisk Walking"];
        normalisedItems.push({ name: "Brisk Walking", duration: "10 min", intensity: "Low", description: fallback.desc, sets: undefined, reps: undefined });
    }

    return { type, items: normalisedItems };
}

function fixJSON(text: string) {
    let fixed = text.trim();
    fixed = fixed.replace(/```json|```/gi, "").trim();
    
    // Fix broken multiline strings/missing quotes in lists
    fixed = fixed.replace(/"\s*\n\s*(\d+\.)/g, ' $1'); 
    
    // Attempt to fix missing commas before keys
    fixed = fixed.replace(/"\s*\n\s*"/g, '",\n"');
    
    // Attempt to fix trailing commas
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

export async function loadLatestExercisePlan(): Promise<StructuredExercisePlan | null> {
    try {
        const plans = await storageService.getPlans("exercise");
        return plans.length > 0 ? JSON.parse(plans[0].content) : null;
    } catch { return null; }
}
