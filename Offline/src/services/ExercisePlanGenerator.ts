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

// ─── Compact AI prompt: AI freely generates exercise names ───────
// Output format (tiny ~150 tokens for all 7 days):
// Mon:Ex1,Ex2,Ex3|Ex4,Ex5,Ex6|Ex7,Ex8,Ex9
// Separator: | between warmup / main / cooldown
const EX_KEYS = Object.keys(EXERCISE_DATABASE);

function buildCompactExercisePrompt(profile: UserProfile): string {
    return `You are a professional fitness trainer. Create a personalised 7-day workout plan.
User: ${profile.age}y ${profile.gender}, health conditions: ${profile.conditions || "none"}.
Instructions:
- Suggest appropriate exercises based on the user's health conditions
- Output EXACTLY 7 lines, one per day, NO extra text
- Format: DayAbbr:W1,W2,W3|M1,M2,M3|C1,C2,C3
- W=warmup(3 exercises), M=main(3 exercises), C=cooldown(3 exercises), separated by |
- Use 3-letter day abbreviations: Mon,Tue,Wed,Thu,Fri,Sat,Sun
- Keep exercise names short (2-4 words max)
Example:
Mon:Arm Circles,Leg Swings,March|Squats,Push-Ups,Lunges|Stretching,Deep Breathing,Walk`;
}

function buildCompactExTipsPrompt(profile: UserProfile): string {
    return `You are a fitness trainer. Write 7 short personalized fitness tips.
User: ${profile.age}y ${profile.gender}, conditions: ${profile.conditions || "none"}.
Rules:
- Output EXACTLY 7 lines
- Each line: a tip under 15 words
- NO numbering, NO extra text, JUST 7 lines`;
}

function parseExerciseLine(line: string): [string[], string[], string[]] | null {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return null;
    const sections = line.substring(colonIdx + 1).split("|");
    if (sections.length < 3) return null;
    const parse = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);
    return [parse(sections[0]), parse(sections[1]), parse(sections[2])];
}

function resolveExercise(name: string): { desc: string; intensity: "Low" | "Medium" | "High"; sets?: number; reps?: number } {
    // Exact match
    if (EXERCISE_DATABASE[name]) return EXERCISE_DATABASE[name];
    // Fuzzy match
    const lower = name.toLowerCase();
    const fuzzy = EX_KEYS.find(k => {
        const kl = k.toLowerCase();
        return kl.includes(lower) || lower.includes(kl) ||
            kl.split(" ").some(word => word.length > 3 && lower.includes(word));
    });
    if (fuzzy) return EXERCISE_DATABASE[fuzzy];
    // Unknown AI-generated exercise → use sensible defaults
    const isCardio = /run|jog|walk|swim|cycle|jump|skip/i.test(name);
    const isStretch = /stretch|yoga|cool|breathe|relax/i.test(name);
    if (isStretch) return { desc: `${name} — focus on controlled breathing.`, intensity: "Low" };
    if (isCardio) return { desc: `${name} — maintain steady pace.`, intensity: "Medium" };
    return { desc: `${name} — focus on proper form.`, intensity: "Medium", sets: 3, reps: 10 };
}

function buildExItem(name: string, duration: string): ExerciseItem {
    const db = resolveExercise(name);
    return {
        name,           // keep AI-generated name as-is
        duration,
        intensity: db.intensity,
        description: db.desc,
        sets: db.sets,
        reps: db.reps,
    };
}

// Fallback indices used if AI response can't be parsed
const FALLBACK_EX_ROTATION: [number[], number[], number[]][] = [
    [[10, 5, 9], [3, 4, 6], [7, 8, 9]],
    [[10, 5, 9], [3, 4, 6], [7, 8, 9]],
    [[10, 9, 5], [0, 1, 6], [7, 8, 9]],
    [[10, 5, 9], [3, 4, 2], [7, 8, 9]],
    [[10, 9, 5], [0, 1, 2], [7, 8, 9]],
    [[10, 5, 9], [3, 4, 6], [7, 8, 9]],
    [[9, 10, 5], [0, 1, 6], [7, 8, 9]],
];

export async function generateExercisePlan(
    onProgress?: (dayName: string, index: number) => void,
    options?: { autoSave?: boolean }
): Promise<StructuredExercisePlan | void> {
    const autoSave = options?.autoSave !== false;
    const profile = await storageService.getProfile();

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

    // ── Step 1: ONE compact AI call → AI picks exercise names ────
    let aiLines: string[] = [];
    let aiTips: string[] = [];

    if (LlamaService) {
        try {
            onProgress?.("Generating plan…", 0);
            const planResponse = await LlamaService.chat(
                [{ role: "user", content: buildCompactExercisePrompt(profile) }],
                "You are a professional fitness trainer. Follow the format exactly."
            );
            aiLines = planResponse.split("\n").map((l: string) => l.trim()).filter(Boolean);
        } catch { /* fall back to rotation */ }

        try {
            onProgress?.("Adding tips…", 6);
            const tipsResponse = await LlamaService.chat(
                [{ role: "user", content: buildCompactExTipsPrompt(profile) }],
                "You are a professional fitness trainer. Follow the format exactly."
            );
            aiTips = tipsResponse.split("\n").map((l: string) => l.trim()).filter(Boolean);
        } catch { /* fall back to defaults */ }
    }

    const defaultTips = [
        "Warm up before every session to prevent injury.",
        "Focus on controlled form over speed.",
        "Rest 60–90 seconds between sets.",
        "Breathe out on exertion, in on release.",
        "Stay consistent — small steps lead to big results.",
        "Cool down and stretch after every workout.",
        "Listen to your body and rest if needed.",
    ];

    const durations = ["10 min", "15 min", "12 min", "20 min", "10 min", "30 min", "10 min"];

    // ── Step 2: Build 7-day plan expanding AI names → full items ─
    const generatedDays: DayExercisePlan[] = DAY_NAMES.map((day, i) => {
        onProgress?.(day, i);

        let warmupNames: string[], mainNames: string[], cooldownNames: string[];

        const parsed = aiLines.length > i ? parseExerciseLine(aiLines[i]) : null;
        if (parsed) {
            [warmupNames, mainNames, cooldownNames] = parsed;
        } else {
            const [wi, mi, ci] = FALLBACK_EX_ROTATION[i];
            warmupNames = wi.map(k => EX_KEYS[k % EX_KEYS.length]);
            mainNames = mi.map(k => EX_KEYS[k % EX_KEYS.length]);
            cooldownNames = ci.map(k => EX_KEYS[k % EX_KEYS.length]);
        }

        const dur = durations[i % durations.length];
        const tip = aiTips[i]?.length > 5 ? aiTips[i] : defaultTips[i % defaultTips.length];

        return {
            day,
            summary: { totalDuration: "45–60 min", intensity: getDailyFocus(day) },
            trainerTip: tip,
            exercises: [
                { type: "Warmup", items: warmupNames.map(n => buildExItem(n, dur)) },
                { type: "Main", items: mainNames.map(n => buildExItem(n, dur)) },
                { type: "Cooldown", items: cooldownNames.map(n => buildExItem(n, dur)) },
            ],
            notes: ["Stay hydrated.", "Stop immediately if you feel pain.", "Consult a doctor if you have any conditions."],
        };
    });

    const fullPlan: StructuredExercisePlan = { title: "7-Day Workout Plan", days: generatedDays };

    if (autoSave) {
        await storageService.savePlan({
            id: Date.now().toString(),
            type: "exercise",
            title: fullPlan.title,
            content: JSON.stringify(fullPlan),
            createdAt: new Date().toISOString(),
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
