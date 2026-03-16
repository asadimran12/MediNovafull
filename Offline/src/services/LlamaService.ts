import { initLlama, LlamaContext, TokenData } from "llama.rn";
import ReactNativeFS from "react-native-fs";
import RNBackgroundDownloader, { DownloadTask } from '@kesha-antonov/react-native-background-downloader';

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export type ProgressCallback = (progress: number) => void;
import { UserProfile } from "./StorageService";

class LlamaService {
  private context: LlamaContext | null = null;
  private currentLoadedModel: string | null = null;
  public readonly EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2.gguf";
  private readonly EMBEDDING_DOWNLOAD_URL = "https://huggingface.co/Mungert/all-MiniLM-L6-v2-GGUF/resolve/main/all-minilm-l6-v2-q8_0.gguf";
  private activeDownloadTasks: Record<string, DownloadTask> = {};
  private pausedDownloads: Record<string, { url: string; bytesDownloaded: number; bytesTotal: number }> = {};
  private downloadCallbacks: Record<string, {
    onProgress?: ProgressCallback;
    onComplete?: () => void;
    onError?: (err: any) => void;
  }> = {};

  private getLocalPath(modelFilename: string) {
    return `${ReactNativeFS.DocumentDirectoryPath}/${modelFilename}`;
  }

  private getTempPath(modelFilename: string) {
    return `${this.getLocalPath(modelFilename)}.tmp`;
  }

  async isModelDownloaded(modelFilename: string): Promise<boolean> {
    if (modelFilename === this.EMBEDDING_MODEL_NAME) {
      // Assume embedding model is bundled as an asset for 100% offline use
      return true;
    }
    const localPath = this.getLocalPath(modelFilename);
    const exists = await ReactNativeFS.exists(localPath);
    if (!exists) return false;

    const stats = await ReactNativeFS.stat(localPath);
    const minSize = 100 * 1024 * 1024;
    if (stats.size < minSize) {
      console.log(`${modelFilename} file too small, considering it missing/corrupt`);
      await ReactNativeFS.unlink(localPath);
      return false;
    }
    return true;
  }

  async downloadModel(
    modelFilename: string,
    downloadUrl: string,
    onProgress?: ProgressCallback,
    onComplete?: () => void,
    onError?: (err: any) => void
  ): Promise<void> {
    if (modelFilename === this.EMBEDDING_MODEL_NAME) {
      console.log("Embedding model is expected to be bundled as an asset. Skipping download.");
      if (onComplete) onComplete();
      return;
    }

    const localPath = this.getLocalPath(modelFilename);

    // Update callbacks
    this.downloadCallbacks[modelFilename] = { onProgress, onComplete, onError };

    // If an existing task is already running, just update callbacks and return
    if (this.activeDownloadTasks[modelFilename]) {
       console.log("Re-subscribed to active task for", modelFilename);
       const task = this.activeDownloadTasks[modelFilename];
       const taskAny = task as any;
       if (task.state === 'PAUSED' && onProgress) onProgress(taskAny.bytesTotal > 0 ? (taskAny.bytesDownloaded / taskAny.bytesTotal) * 100 : 0);
       return;
    }

    // Attempt to re-attach to existing task first
    const existingTasks = await RNBackgroundDownloader.checkForExistingDownloads();
    let task = existingTasks.find((t: DownloadTask) => t.id === modelFilename);

    if (!task) {
        if (await ReactNativeFS.exists(localPath)) {
            await ReactNativeFS.unlink(localPath);
        }

        // Track the URL so we can resume later with Range header
        this.pausedDownloads[modelFilename] = { url: downloadUrl, bytesDownloaded: 0, bytesTotal: 0 };

        task = RNBackgroundDownloader.download({
            id: modelFilename,
            url: downloadUrl,
            destination: localPath,
        });
    } else {
        console.log(`Re-attached to existing task: ${modelFilename}`);
    }

    this.activeDownloadTasks[modelFilename] = task;

    task.begin((event: any) => {
        console.log(`Going to download ${event?.expectedBytes || 0} bytes!`);
    })
    .progress((event: any) => {
        const bd = event?.bytesDownloaded || 0;
        const bt = event?.bytesTotal || 0;
        let currentProgress = bt > 0 ? (bd / bt) * 100 : 0;
        const cb = this.downloadCallbacks[modelFilename];
        if (cb?.onProgress) cb.onProgress(currentProgress || 0);
    })
    .done(() => {
        console.log('Download is done!');
        delete this.activeDownloadTasks[modelFilename];
        const cb = this.downloadCallbacks[modelFilename];
        delete this.downloadCallbacks[modelFilename];
        if (cb?.onComplete) cb.onComplete();
    })
    .error((errorObj: any) => {
        console.error('Download canceled/failed due to error: ', errorObj?.error);
        delete this.activeDownloadTasks[modelFilename];
        const cb = this.downloadCallbacks[modelFilename];
        delete this.downloadCallbacks[modelFilename];
        if (cb?.onError) cb.onError(errorObj?.error || "Unknown error");
    });
  }

  pauseDownload(modelFilename: string) {
    const task = this.activeDownloadTasks[modelFilename];
    if (!task) return;

    const taskAny = task as any;
    const bytesDownloaded = taskAny.bytesDownloaded || 0;
    const bytesTotal = taskAny.bytesTotal || 0;

    // Store pause state before stopping. We need the URL to restart later.
    // We saved the URL from the original download call in pausedDownloads.
    if (!this.pausedDownloads[modelFilename]) {
      // URL not stored yet; we can't resume — just stop cleanly
      console.warn('[LlamaService] pauseDownload: URL not tracked, canceling instead.');
      task.stop();
      delete this.activeDownloadTasks[modelFilename];
      return;
    }

    // Update bytes downloaded
    this.pausedDownloads[modelFilename].bytesDownloaded = bytesDownloaded;
    this.pausedDownloads[modelFilename].bytesTotal = bytesTotal;

    // Stop the native task (DownloadManager doesn't support pause)
    task.stop();
    delete this.activeDownloadTasks[modelFilename];

    console.log(`[LlamaService] Paused ${modelFilename} at ${bytesDownloaded} bytes`);

    // Notify UI of current paused progress
    const cb = this.downloadCallbacks[modelFilename];
    const pct = bytesTotal > 0 ? (bytesDownloaded / bytesTotal) * 100 : 0;
    if (cb?.onProgress) cb.onProgress(pct);
  }

  async resumeDownload(modelFilename: string) {
    const paused = this.pausedDownloads[modelFilename];
    if (!paused) {
      console.warn('[LlamaService] resumeDownload: no paused state found for', modelFilename);
      return;
    }

    if (this.activeDownloadTasks[modelFilename]) {
      console.log('[LlamaService] Already downloading', modelFilename);
      return;
    }

    const localPath = this.getLocalPath(modelFilename);
    const { url } = paused;

    // Android DownloadManager deletes temp files when a task is stopped,
    // so there are no partial bytes to resume from. We restart from scratch.
    console.log(`[LlamaService] Resuming ${modelFilename} — restarting fresh download`);

    // Clean up any partial file at destination
    if (await ReactNativeFS.exists(localPath)) {
      await ReactNativeFS.unlink(localPath);
    }

    const task = RNBackgroundDownloader.download({
      id: modelFilename,
      url,
      destination: localPath,
    });

    this.activeDownloadTasks[modelFilename] = task;

    task.begin((event: any) => {
      console.log(`[LlamaService] Restarted download, expectedBytes: ${event?.expectedBytes}`);
    })
    .progress((event: any) => {
      const bd = event?.bytesDownloaded || 0;
      const bt = event?.bytesTotal || 0;
      const pct = bt > 0 ? (bd / bt) * 100 : 0;
      const cb = this.downloadCallbacks[modelFilename];
      if (cb?.onProgress) cb.onProgress(pct);
    })
    .done(() => {
      console.log('[LlamaService] Restarted download done:', modelFilename);
      delete this.activeDownloadTasks[modelFilename];
      delete this.pausedDownloads[modelFilename];
      const cb = this.downloadCallbacks[modelFilename];
      delete this.downloadCallbacks[modelFilename];
      if (cb?.onComplete) cb.onComplete();
    })
    .error((errorObj: any) => {
      console.error('[LlamaService] Restarted download error:', errorObj?.error);
      delete this.activeDownloadTasks[modelFilename];
      const cb = this.downloadCallbacks[modelFilename];
      delete this.downloadCallbacks[modelFilename];
      if (cb?.onError) cb.onError(errorObj?.error || 'Unknown error');
    });
  }

  cancelDownload(modelFilename: string) {
    const task = this.activeDownloadTasks[modelFilename];
    if (task) {
      task.stop();
      delete this.activeDownloadTasks[modelFilename];
      delete this.downloadCallbacks[modelFilename];
    }
  }

  /** Re-subscribe a UI component to an already-running download. */
  subscribeToDownload(
    modelFilename: string,
    onProgress?: ProgressCallback,
    onComplete?: () => void,
    onError?: (err: any) => void
  ): boolean {
    if (!this.activeDownloadTasks[modelFilename]) return false;
    this.downloadCallbacks[modelFilename] = { onProgress, onComplete, onError };
    const task = this.activeDownloadTasks[modelFilename];
    // Emit current progress immediately so UI populates
    const taskAny = task as any;
    const current = taskAny.bytesTotal > 0 ? (taskAny.bytesDownloaded / taskAny.bytesTotal) * 100 : 0;
    if (onProgress) onProgress(current);
    return true;
  }

  /** Returns list of filenames currently being downloaded. */
  getActiveDownloadIds(): string[] {
    return Object.keys(this.activeDownloadTasks);
  }

  /** Remove UI callbacks (doesn't stop the download). */
  unsubscribeFromDownload(modelFilename: string) {
    delete this.downloadCallbacks[modelFilename];
  }


  async loadModel(modelFilename: string, isEmbedding: boolean = false) {
    if (this.context && this.currentLoadedModel === modelFilename) {
      return; // Already loaded
    }

    if (this.context) {
      // If we're loading a different model, release the current one
      await this.offloadModel();
    }

    let modelPath = this.getLocalPath(modelFilename);
    let isAsset = false;

    // For embedding model, check documents first, fallback to copying from assets
    if (modelFilename === this.EMBEDDING_MODEL_NAME) {
      if (!(await ReactNativeFS.exists(modelPath))) {
        console.log(`${modelFilename} not found in documents, checking assets...`);
        try {
          // On Android, we can try copying from assets to local files for better stability
          await ReactNativeFS.copyFileAssets(modelFilename, modelPath);
          console.log(`Successfully copied ${modelFilename} from assets to documents.`);
        } catch (err) {
          console.log(`${modelFilename} not found in assets or copy failed. Fallback to direct asset load.`);
          modelPath = modelFilename;
          isAsset = true;
        }
      }
    } else {
      if (!(await ReactNativeFS.exists(modelPath))) {
        throw new Error(`${modelFilename} missing. Must download first.`);
      }
    }

    try {
      this.context = await initLlama({
        model: modelPath,
        is_model_asset: isAsset,
        n_ctx: isEmbedding ? 512 : 4096,
        n_threads: 4,
        use_mlock: false,
        n_gpu_layers: 0,
        embedding: isEmbedding,
        pooling_type: isEmbedding ? 'mean' : undefined,
      } as any);
      this.currentLoadedModel = modelFilename;
      console.log(`${modelFilename} context loaded successfully (${isAsset ? "ASSET" : "LOCAL"}).`);
    } catch (err) {
      console.error(`${modelFilename} context initialization failed:`, err);
      throw err;
    }
  }

  async getEmbeddings(text: string): Promise<number[]> {
    // Ensure embedding model is loaded
    if (this.currentLoadedModel !== this.EMBEDDING_MODEL_NAME) {
      if (await this.isModelDownloaded(this.EMBEDDING_MODEL_NAME)) {
        await this.loadModel(this.EMBEDDING_MODEL_NAME, true);
      } else {
        throw new Error("Embedding model not downloaded.");
      }
    }

    try {
      const result = await this.context!.embedding(text);
      return result.embedding; // Return the underlying number array
    } catch (err) {
      console.error("Embedding generation failed:", err);
      throw err;
    }
  }

  async offloadModel() {
    if (this.context) {
      await this.context.release();
      this.context = null;
      this.currentLoadedModel = null;
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
          n_predict: 700,
          temperature: 0.6,
          stop: ["<|im_end|>"]
        },
        onToken
      );
      return res?.text ?? "";
    } catch (err) {
      console.error("Chat failed:", err);
      throw err;
    }
  }


  async reportChat(
    reportData: { title: string; lines: { label: string, value: string }[] },
    messages: Message[],
    profile: UserProfile | null,
    onToken?: (data: TokenData) => void
  ) {
    if (!this.context) throw new Error("Model not initialized. Call LoadModel first.");

    let systemPrompt = "You are a specialized medical report analyzer AI for MediNova. Your job is to explain medical and health reports to the user in simple, easily understandable terms.";

    if (profile && profile.isSet) {
      systemPrompt += `\n\nKeep in mind the user's profile:\n- Age: ${profile.age || "N/A"}\n- Gender: ${profile.gender || "N/A"}\n- Medical Conditions: ${profile.conditions || "None"}.`;
    }

    systemPrompt += `\n\nHEre is the report data the user uploaded:\nTitle: ${reportData.title}\nLines:\n${reportData.lines.map(l => `${l.label}: ${l.value}`).join("\n")}`;

    systemPrompt += `\nAnalyze this data carefully. Answer the user's questions strictly based on this report's information. Do NOT guess or make up numbers. Explain what values mean for their health. If you see abnormal values, gently advise consulting a healthcare professional. Be concise and helpful.`;

    const prompt = this.formatChatPrompt(messages, systemPrompt);
    console.log("--- GENERATING REPORT CHAT WITH PROMPT ---\n", prompt, "\n----------------------------");

    try {
      const res = await this.context.completion({
        prompt,
        n_predict: 1000,
        temperature: 0.6,
        stop: ["<|im_end|>"]
      }, onToken);
      return res?.text ?? "";

    } catch (error) {
      console.error("Report chat failed:", error);
      throw error;
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
