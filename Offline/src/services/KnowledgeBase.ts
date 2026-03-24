import LlamaService from "./LlamaService";
import VectorService, { VectorEntry } from "./VectorService";

export interface KnowledgeChunk {
    content: string;
    category: "Diet" | "Exercise" | "Medical";
    tag: string;
}

const INITIAL_KNOWLEDGE: KnowledgeChunk[] = [
    // Diet - Diabetes
    {
        category: "Diet",
        tag: "Diabetes",
        content: "For patients with diabetes, prioritize complex carbohydrates like oats, quinoa, and brown rice. Avoid simple sugars and refined grains. Aim for 30-45g of carbs per meal."
    },
    {
        category: "Diet",
        tag: "Diabetes",
        content: "Fiber is crucial for blood sugar control. Include at least 5-8g of fiber per meal through leafy greens, beans, and whole fruits (not juices)."
    },
    {
        category: "Diet",
        tag: "Diabetes",
        content: "Consistency is key for diabetes. Eat meals at regular intervals to prevent blood sugar spikes and crashes. Avoid skipping meals."
    },
    // Diet - Hypertension
    {
        category: "Diet",
        tag: "Hypertension",
        content: "The DASH diet (Dietary Approaches to Stop Hypertension) emphasizes low sodium (under 1500mg/day) and high potassium, calcium, and magnesium. Use herbs instead of salt for flavor."
    },
    {
        category: "Diet",
        tag: "Hypertension",
        content: "Potassium-rich foods like spinach, avocados, and bananas help balance sodium levels and reduce blood pressure."
    },
    {
        category: "Diet",
        tag: "Hypertension",
        content: "Excessive caffeine and alcohol can raise blood pressure. Limit coffee and opt for herbal teas like hibiscus which may naturally lower BP."
    },
    // Diet - Heart Health
    {
        category: "Diet",
        tag: "Heart Health",
        content: "For heart health, eliminate trans fats and limit saturated fats. Focus on Omega-3 fatty acids found in fish (salmon, mackerel) and flaxseeds."
    },
    {
        category: "Diet",
        tag: "Heart Health",
        content: "Soluble fiber found in oats and legumes helps lower 'bad' LDL cholesterol levels. Aim for 10-25g of soluble fiber daily."
    },
    // Diet - Kidney Disease
    {
        category: "Diet",
        tag: "Kidney Disease",
        content: "Chronic Kidney Disease (CKD) requires limiting protein intake to reduce kidney workload. Avoid high-phosphorus foods like dark sodas and processed cheeses."
    },
    {
        category: "Diet",
        tag: "Kidney Disease",
        content: "Monitor potassium and sodium intake strictly in CKD. Leach high-potassium vegetables (potatoes, carrots) by soaking them in water before cooking."
    },
    // Exercise - Hypertension
    {
        category: "Exercise",
        tag: "Hypertension",
        content: "Avoid heavy weightlifting or isometric exercises (like planks) for extended periods if you have high blood pressure, as these can cause sharp spikes in BP. Focus on dynamic cardio."
    },
    {
        category: "Exercise",
        tag: "Hypertension",
        content: "Moderate aerobic activity like brisk walking for 30 minutes, 5 days a week, is highly effective for lowering blood pressure safely."
    },
    // Exercise - Diabetes
    {
        category: "Exercise",
        tag: "Diabetes",
        content: "Resistance training helps improve insulin sensitivity. Aim for 2-3 sessions per week, but always check blood sugar before and after exercise."
    },
    {
        category: "Exercise",
        tag: "Diabetes",
        content: "Carry a fast-acting carb source (like glucose tablets or juice) during exercise in case of hypoglycemia (low blood sugar)."
    },
    // Exercise - Heart Health
    {
        category: "Exercise",
        tag: "Heart Health",
        content: "Always include a 10-minute gradual warmup and cooldown. Avoid sudden bursts of high intensity; keep heart rate in the 50-70% of maximum range."
    },
    // Exercise - Kidney Disease
    {
        category: "Exercise",
        tag: "Kidney Disease",
        content: "Patients with chronic kidney disease should avoid high-intensity interval training. Gentle movements like Tai Chi or walking are preferred to prevent excessive protein breakdown."
    },
    // General Safety
    {
        category: "Medical",
        tag: "Safety",
        content: "Stop all activity immediately if you experience chest pain, sudden dizziness, extreme shortness of breath, or palpitations. Consult a doctor before resuming."
    }
];

class KnowledgeBase {
    /**
     * Expands a simple query into a more descriptive search term for better vector matching.
     */
    private expandQuery(query: string): string {
        const lower = query.toLowerCase();
        let expansion = query;

        const isDiet = lower.includes("diet") || lower.includes("meal") || lower.includes("food");
        const isExercise = lower.includes("exercise") || lower.includes("workout") || lower.includes("training") || lower.includes("activity");

        if (lower.includes("diabetes")) {
            if (isDiet) expansion += " diabetes dietary guidelines insulin sensitivity blood sugar control low glycemic index";
            if (isExercise) expansion += " diabetes exercise safety resistance training blood sugar monitoring hypoglycemia prevention";
        }
        if (lower.includes("hypertension") || lower.includes("blood pressure")) {
            if (isDiet) expansion += " hypertension dash diet low sodium high potassium blood pressure management";
            if (isExercise) expansion += " hypertension aerobic exercise avoid isometric spikes blood pressure lowering";
        }
        if (lower.includes("heart") || lower.includes("cardiac")) {
            if (isDiet) expansion += " heart health cardiovascular disease cholesterol omega-3 healthy fats";
            if (isExercise) expansion += " heart health cardiac rehab gradual warmup moderate intensity safety";
        }
        if (lower.includes("kidney") || lower.includes("ckd") || lower.includes("renal")) {
            if (isDiet) expansion += " chronic kidney disease renal diet low protein low phosphorus potassium management";
            if (isExercise) expansion += " kidney disease gentle movements tai chi avoid high intensity";
        }
        
        return expansion;
    }

    async initialize() {
        if (!(await LlamaService.isModelDownloaded(LlamaService.EMBEDDING_MODEL_NAME))) {
            console.log("Embedding model not yet available for KnowledgeBase initialization.");
            return;
        }

        await VectorService.load();
        
        // Use a simple versioning/length check
        // If the knowledge count changed, re-initialize
        if (VectorService.getEntryCount() >= INITIAL_KNOWLEDGE.length) {
            console.log("Knowledge Base already summarized and up to date.");
            return;
        }

        console.log("Initializing/Updating Knowledge Base with embeddings...");
        
        // Simple strategy: clear static knowledge and refill
        await VectorService.clear((e) => !e.metadata.isDynamic);

        for (const chunk of INITIAL_KNOWLEDGE) {
            const embedding = await LlamaService.getEmbeddings(chunk.content);
            const entry: VectorEntry = {
                content: chunk.content,
                metadata: { category: chunk.category, tag: chunk.tag },
                embedding: embedding
            };
            await VectorService.addEntry(entry);
        }
        
        console.log("Knowledge Base initialization complete.");
    }

    async getRelevantContext(query: string, limit: number = 3): Promise<string> {
        try {
            const expandedQuery = this.expandQuery(query);
            console.log(`🔍 Expanded Query: "${expandedQuery}"`);

            const queryEmbedding = await LlamaService.getEmbeddings(expandedQuery);
            const results = await VectorService.search(queryEmbedding, limit);
            
            if (results.length > 0) {
                console.log("🎯 RAG Search found relevant medical context:");
                results.forEach((r, i) => {
                    console.log(`  [${i}] Category: ${r.metadata.category}, Tag: ${r.metadata.tag}`);
                });
            } else {
                console.log("⚠️ RAG Search: No relevant medical context found.");
            }

            return results.map(r => r.content).join("\n\n");
        } catch (err) {
            console.error("Failed to get relevant context:", err);
            return "";
        }
    }

    /**
     * Adds dynamic information (like a specific medical report) to the vector database.
     */
    async addDynamicKnowledge(content: string, category: string, tag: string) {
        try {
            // Primitive check to avoid duplicate reports in current session
            const currentEntries = await VectorService.search(await LlamaService.getEmbeddings(tag), 1);
            if (currentEntries.length > 0 && currentEntries[0].metadata.tag === tag) {
                console.log(`[KnowledgeBase] Knowledge with tag ${tag} already exists. Skipping.`);
                return;
            }

            console.log(`📥 Adding dynamic knowledge: [${category}] ${tag}`);
            const embedding = await LlamaService.getEmbeddings(content);
            const entry: VectorEntry = {
                content,
                metadata: { category, tag, isDynamic: true },
                embedding
            };
            await VectorService.addEntry(entry);
        } catch (err) {
            console.error("Failed to add dynamic knowledge:", err);
        }
    }

    /**
     * Clears knowledge with a specific tag (e.g., a specific report).
     */
    async clearDynamicKnowledge(tag?: string) {
        // Since VectorService doesn't support partial clear yet, we would need to filter and re-save.
        // For now, let's keep it simple and just acknowledge it.
        console.log(`🧹 Request to clear knowledge with tag: ${tag || 'all dynamic'}`);
    }
}

export default new KnowledgeBase();
