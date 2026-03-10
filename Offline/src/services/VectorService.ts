import ReactNativeFS from "react-native-fs";

export interface VectorEntry {
    content: string;
    metadata: any;
    embedding: number[];
}

class VectorService {
    private readonly DB_NAME = "vector_db.json";
    private entries: VectorEntry[] = [];
    private isLoaded: boolean = false;

    private getPath() {
        return `${ReactNativeFS.DocumentDirectoryPath}/${this.DB_NAME}`;
    }

    async load() {
        if (this.isLoaded) return;
        const path = this.getPath();
        if (await ReactNativeFS.exists(path)) {
            try {
                const content = await ReactNativeFS.readFile(path);
                this.entries = JSON.parse(content);
                this.isLoaded = true;
                console.log(`Vector DB loaded: ${this.entries.length} entries`);
            } catch (err) {
                console.error("Failed to load Vector DB:", err);
                this.entries = [];
            }
        } else {
            this.entries = [];
            this.isLoaded = true;
        }
    }

    async save() {
        const path = this.getPath();
        try {
            await ReactNativeFS.writeFile(path, JSON.stringify(this.entries));
        } catch (err) {
            console.error("Failed to save Vector DB:", err);
        }
    }

    async addEntry(entry: VectorEntry) {
        await this.load();
        this.entries.push(entry);
        await this.save();
    }

    async addEntries(newEntries: VectorEntry[]) {
        await this.load();
        this.entries.push(...newEntries);
        await this.save();
    }

    async clear() {
        this.entries = [];
        await this.save();
    }

    cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async search(queryEmbedding: number[], limit: number = 3): Promise<VectorEntry[]> {
        await this.load();
        if (this.entries.length === 0) return [];

        const results = this.entries.map(entry => ({
            entry,
            score: this.cosineSimilarity(queryEmbedding, entry.embedding)
        }));

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);

        return results.slice(0, limit).map(r => r.entry);
    }
}

export default new VectorService();
