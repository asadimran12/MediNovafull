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
    // Diet - Heart Health
    {
        category: "Diet",
        tag: "Heart Health",
        content: "For heart health, eliminate trans fats and limit saturated fats. Focus on Omega-3 fatty acids found in fish (salmon, mackerel) and flaxseeds."
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
    // Exercise - Kidney Disease
    {
        category: "Exercise",
        tag: "Kidney Disease",
        content: "Patients with chronic kidney disease should avoid high-intensity interval training. Gentle movements like Tai Chi or walking are preferred to prevent excessive protein breakdown."
    }
];

class KnowledgeBase {
    async initialize() {
        if (!(await LlamaService.isModelDownloaded(LlamaService.EMBEDDING_MODEL_NAME))) {
            console.log("Embedding model not yet available for KnowledgeBase initialization.");
            return;
        }

        await VectorService.load();
        
        // Check if already initialized (simplified check)
        // In a real app, we'd use a versioning system
        const results = await VectorService.search([0], 1); // dummy search
        if (results.length > 0) {
            console.log("Knowledge Base already initialized.");
            return;
        }

        console.log("Initializing Knowledge Base with embeddings...");
        
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

    async getRelevantContext(query: string, limit: number = 2): Promise<string> {
        try {
            const queryEmbedding = await LlamaService.getEmbeddings(query);
            const results = await VectorService.search(queryEmbedding, limit);
            
            if (results.length > 0) {
                console.log("🎯 RAG Search found relevant medical context:");
                results.forEach((r, i) => {
                    console.log(`  [${i}] Category: ${r.metadata.category}, Tags: ${r.metadata.tags?.join(", ")}`);
                });
            } else {
                console.log("⚠️ RAG Search: No relevant medical context found for profile.");
            }

            return results.map(r => r.content).join("\n\n");
        } catch (err) {
            console.error("Failed to get relevant context:", err);
            return "";
        }
    }
}

export default new KnowledgeBase();
