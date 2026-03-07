import { initLlama, LlamaContext, TokenData } from "llama.rn";
import ReactNativeFS from "react-native-fs";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export type ProgressCallback = (progress: number) => void;
import { UserProfile } from "./StorageService";

class LlamaService {
  private context: LlamaContext | null = null;
  private readonly MODEL_NAME = "qwen2.5-0.5b-instruct-q4_k_m.gguf";
  private readonly DOWNLOAD_URL = "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf";

  private getLocalPath() {
    return `${ReactNativeFS.DocumentDirectoryPath}/${this.MODEL_NAME}`;
  }

  private getTempPath() {
    return `${this.getLocalPath()}.tmp`;
  }

  async isModelDownloaded(): Promise<boolean> {
    const localPath = this.getLocalPath();
    const exists = await ReactNativeFS.exists(localPath);
    if (!exists) return false;

    const stats = await ReactNativeFS.stat(localPath);
    if (stats.size < 100 * 1024 * 1024) { // Qwen 0.5B q4 is >300MB
      console.log("Model file too small, considering it missing/corrupt");
      await ReactNativeFS.unlink(localPath);
      return false;
    }
    return true;
  }

  async downloadModel(onProgress?: ProgressCallback): Promise<string> {
    const localPath = this.getLocalPath();
    const tempPath = this.getTempPath();

    if (await ReactNativeFS.exists(tempPath)) {
      await ReactNativeFS.unlink(tempPath);
    }
    if (await ReactNativeFS.exists(localPath)) {
      await ReactNativeFS.unlink(localPath);
    }

    const options: ReactNativeFS.DownloadFileOptions = {
      fromUrl: this.DOWNLOAD_URL,
      toFile: tempPath,
      progress: (res) => {
        const percentage = (res.bytesWritten / res.contentLength) * 100;
        if (onProgress) onProgress(percentage);
      },
      progressDivider: 1,
    };

    try {
      const result = await ReactNativeFS.downloadFile(options).promise;
      if (result.statusCode !== 200) {
        throw new Error(`Download failed with status ${result.statusCode}`);
      }

      // Rename temp to final only on 100% success
      await ReactNativeFS.moveFile(tempPath, localPath);
      console.log("Model download and verification complete.");
      return localPath;
    } catch (err) {
      console.error("Model download failed:", err);
      // Clean up partial file on failure
      if (await ReactNativeFS.exists(tempPath)) {
        await ReactNativeFS.unlink(tempPath).catch(() => { });
      }
      throw err;
    }
  }

  async loadModel() {
    if (this.context) return;
    const localPath = this.getLocalPath();

    if (!(await ReactNativeFS.exists(localPath))) {
      throw new Error("Model file missing. Must download first.");
    }

    try {
      this.context = await initLlama({
        model: localPath,
        n_ctx: 4096,
        n_threads: 4,
        use_mlock: false,
        n_gpu_layers: 0,
      });
      console.log("Model context loaded successfully.");
    } catch (err) {
      console.error("Llama context initialization failed:", err);
      await ReactNativeFS.unlink(localPath).catch(() => { });
      throw err;
    }
  }

  async offloadModel() {
    if (this.context) {
      await this.context.release();
      this.context = null;
      console.log("Model context offloaded.");
    }
  }

  generateSystemPrompt(profile: UserProfile | null): string {
    const base = "You are MediNova, a professional and empathetic health AI assistant. ";

    if (!profile || !profile.isSet) {
      return base + "Provide accurate wellness, diet, and exercise advice. Always emphasize safety and suggest consulting a professional for serious concerns.";
    }

    return `${base}
CRITICAL MISSION: Provide health, diet, and exercise advice specifically tailored to the user's profile below.

USER CONTEXT:
- Age: ${profile.age || "Not specified"}
- Gender: ${profile.gender || "Not specified"}
- Medical Conditions: ${profile.conditions || "None reported"}
- Condition Severity: ${profile.severity || "Not applicable"}

INSTRUCTIONS:
1. You MUST always consider the medical conditions listed above when suggesting food or activities.
2. If the user has diabetes, prioritize low-sugar, low-glycemic index recommendations.
3. If hypertension is noted, prioritize low-sodium recommendations.
4. Adapt the intensity of exercise to the user's age and condition severity.
5. If any suggestion could be risky given their profile, explicitly mention it and advise medical consultation.
6. Acknowledge the user's specific conditions (e.g., "Given your age and diabetes...") in your response when providing diet or exercise advice to show you are listening.
7. For diabetes specifically, focus on low-carb, high-fiber, and portion control.`;
  }

  private formatChatPrompt(messages: Message[], systemPrompt: string): string {
    let prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
    for (const msg of messages) {
      prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
    }
    prompt += `<|im_start|>assistant\n`;
    return prompt;
  }

  async chat(messages: Message[], systemPrompt: string, onToken?: (data: TokenData) => void) {
    if (!this.context) throw new Error("Model not initialized. Call loadModel first.");

    const prompt = this.formatChatPrompt(messages, systemPrompt);
    console.log("--- GENERATING WITH PROMPT ---\n", prompt, "\n----------------------------");

    try {
      const res = await this.context.completion(
        {
          prompt,
          n_predict: 512,
          stop: ["<|im_end|>", "<|im_start|>", "assistant\n", "user\n", "system\n"],
        },
        onToken
      );
      return res?.text ?? "";
    } catch (err) {
      console.error("Chat failed:", err);
      throw err;
    }
  }

  stopCompletion() {
    if (this.context) {
      this.context.stopCompletion();
      console.log("AI generation stopped by user.");
    }
  }

  async cleanup() {
    await this.offloadModel();
  }
}

export default new LlamaService();
