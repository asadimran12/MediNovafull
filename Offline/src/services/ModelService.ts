import ReactNativeFS from "react-native-fs";
import StorageService from "./StorageService";

export interface AIModel {
  id: string;
  name: string;
  description: string;
  size: string;
  downloadUrl: string;
  filename: string;
  isCustom?: boolean;
}

const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "qwen-0.5b",
    name: "Qwen 2.5 (0.5B) - Recommended",
    description: "Fast, efficient, and great for most medical queries. Low memory usage.",
    size: "350 MB",
    downloadUrl: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf",
    filename: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
  },
  {
    id: "qwen-1.5b",
    name: "Qwen 2.5 (1.5B) - Advanced",
    description: "Higher intelligence, better reasoning. Requires more device storage and RAM.",
    size: "950 MB",
    downloadUrl: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf",
    filename: "qwen2.5-1.5b-instruct-q4_k_m.gguf",
  }
];

class ModelService {
  async getAvailableModels(): Promise<AIModel[]> {
    return AVAILABLE_MODELS;
  }

  async getDownloadedModels(): Promise<AIModel[]> {
    const downloaded: AIModel[] = [];
    for (const model of AVAILABLE_MODELS) {
      const exists = await ReactNativeFS.exists(`${ReactNativeFS.DocumentDirectoryPath}/${model.filename}`);
      if (exists) {
        downloaded.push(model);
      }
    }
    return downloaded;
  }

  async isModelDownloaded(modelId: string): Promise<boolean> {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) return false;
    return await ReactNativeFS.exists(`${ReactNativeFS.DocumentDirectoryPath}/${model.filename}`);
  }

  async getActiveModel(): Promise<AIModel | null> {
    const activeId = await StorageService.getItem("active_model_id");
    if (!activeId) {
        // Fallback to first downloaded model if none selected
        const downloaded = await this.getDownloadedModels();
        if (downloaded.length > 0) return downloaded[0];
        return null;
    }
    return AVAILABLE_MODELS.find(m => m.id === activeId) || null;
  }

  async setActiveModel(modelId: string): Promise<void> {
    await StorageService.setItem("active_model_id", modelId);
  }

  async deleteModel(modelId: string): Promise<void> {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (model) {
      const path = `${ReactNativeFS.DocumentDirectoryPath}/${model.filename}`;
      if (await ReactNativeFS.exists(path)) {
        await ReactNativeFS.unlink(path);
      }
      const active = await this.getActiveModel();
      if (active?.id === modelId) {
        await StorageService.setItem("active_model_id", "");
      }
    }
  }

  getFilePath(model: AIModel): string {
    return `${ReactNativeFS.DocumentDirectoryPath}/${model.filename}`;
  }
}

export default new ModelService();
