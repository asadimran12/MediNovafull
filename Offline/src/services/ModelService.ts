import DeviceInfo from "react-native-device-info";
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
  },
];

class ModelService {
  async getAvailableModels(): Promise<AIModel[]> {
    const available: AIModel[] = [];
    for (const model of AVAILABLE_MODELS) {
      if (!model.downloadUrl) {
        // Only include custom models if they actually exist on disk
        if (await this.isModelDownloaded(model.id)) {
          available.push(model);
        }
      } else {
        available.push(model);
      }
    }
    return available;
  }

  async getDownloadedModels(): Promise<AIModel[]> {
    const downloaded: AIModel[] = [];
    for (const model of AVAILABLE_MODELS) {
      if (await this.isModelDownloaded(model.id)) {
        downloaded.push(model);
      }
    }
    return downloaded;
  }

  async isModelDownloaded(modelId: string): Promise<boolean> {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) return false;
    
    const internalPath = `${ReactNativeFS.DocumentDirectoryPath}/${model.filename}`;
    if (await ReactNativeFS.exists(internalPath)) return true;

    const externalPaths = [
      `${ReactNativeFS.ExternalDirectoryPath}/${model.filename}`,
      `${ReactNativeFS.ExternalStorageDirectoryPath}/Documents/${model.filename}`,
      `/sdcard/Documents/${model.filename}`,
      `${ReactNativeFS.ExternalDirectoryPath}/Documents/${model.filename}`,
    ];

    for (const externalPath of externalPaths) {
      console.log(`[ModelService] Checking external path: ${externalPath}`);
      if (externalPath && await ReactNativeFS.exists(externalPath)) {
        console.log(`[ModelService] Match found at: ${externalPath}`);
        try {
          // Try to copy to internal storage for better performance/stability
          // but don't block the user if it fails due to EACCES
          console.log(`[ModelService] Attempting to copy to internal storage: ${internalPath}`);
          await ReactNativeFS.copyFile(externalPath, internalPath);
          console.log(`[ModelService] Successfully imported ${model.filename} to internal storage.`);
        } catch (e) {
          console.warn(`[ModelService] Could not copy to internal storage (Permissions?), will load directly from external path.`);
        }
        return true; // Found, so it's "downloaded" as far as the UI is concerned
      }
    }
    return false;
  }

  async getActiveModel(): Promise<AIModel | null> {
    const activeId = await StorageService.getItem("active_model_id");
    if (!activeId) return null;

    const model = AVAILABLE_MODELS.find(m => m.id === activeId);
    if (!model) return null;

    // Only return as active if it's actually downloaded
    if (await this.isModelDownloaded(model.id)) {
      return model;
    }

    return null;
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

  async getRecommendedModelId(): Promise<string> {
    try {
      const totalMemory = await DeviceInfo.getTotalMemory(); // in bytes
      const ramGB = totalMemory / (1024 * 1024 * 1024);
      
      console.log(`[ModelService] Detected ${ramGB.toFixed(2)} GB RAM`);

      if (ramGB < 3.5) {
        return "qwen-0.5b"; // Ultra fast for budget devices
      } else {
        return "qwen-1.5b"; // Balanced for mid/high range
      }
    } catch (e) {
      return "qwen-0.5b"; // Safe fallback
    }
  }

  getFilePath(model: AIModel): string {
    return `${ReactNativeFS.DocumentDirectoryPath}/${model.filename}`;
  }
}

export default new ModelService();
