import { initLlama, LlamaContext, TokenData } from "llama.rn";
import ReactNativeFS from "react-native-fs";
import RNBackgroundDownloader, { DownloadTask } from '@kesha-antonov/react-native-background-downloader';

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export type ProgressCallback = (progress: number) => void;
import { UserProfile } from "./StorageService";
import ReportAnalyzechat from "./ReportAnalyzechat";

class LlamaService {
  private chatContext: LlamaContext | null = null;
  private embeddingContext: LlamaContext | null = null;
  private currentChatModel: string | null = null;
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

  async isModelDownloaded(modelFilename: string): Promise<boolean> {
    if (modelFilename === this.EMBEDDING_MODEL_NAME) return true;
    const localPath = this.getLocalPath(modelFilename);
    const exists = await ReactNativeFS.exists(localPath);
    if (!exists) return false;

    const stats = await ReactNativeFS.stat(localPath);
    if (stats.size < 100 * 1024 * 1024) {
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
      if (onComplete) onComplete();
      return;
    }

    const localPath = this.getLocalPath(modelFilename);
    this.downloadCallbacks[modelFilename] = { onProgress, onComplete, onError };

    if (this.activeDownloadTasks[modelFilename]) return;

    const existingTasks = await RNBackgroundDownloader.checkForExistingDownloads();
    let task = existingTasks.find((t: DownloadTask) => t.id === modelFilename);

    if (!task) {
        if (await ReactNativeFS.exists(localPath)) await ReactNativeFS.unlink(localPath);
        this.pausedDownloads[modelFilename] = { url: downloadUrl, bytesDownloaded: 0, bytesTotal: 0 };
        task = RNBackgroundDownloader.download({ id: modelFilename, url: downloadUrl, destination: localPath });
    }

    this.activeDownloadTasks[modelFilename] = task;

    task.progress((event: any) => {
        const bd = event?.bytesDownloaded || 0;
        const bt = event?.bytesTotal || 0;
        const cb = this.downloadCallbacks[modelFilename];
        if (cb?.onProgress) cb.onProgress(bt > 0 ? (bd / bt) * 100 : 0);
    })
    .done(() => {
        delete this.activeDownloadTasks[modelFilename];
        const cb = this.downloadCallbacks[modelFilename];
        delete this.downloadCallbacks[modelFilename];
        if (cb?.onComplete) cb.onComplete();
    })
    .error((errorObj: any) => {
        delete this.activeDownloadTasks[modelFilename];
        const cb = this.downloadCallbacks[modelFilename];
        delete this.downloadCallbacks[modelFilename];
        if (cb?.onError) cb.onError(errorObj?.error || "Unknown error");
    });
  }

  pauseDownload(modelFilename: string) {
    const task = this.activeDownloadTasks[modelFilename];
    if (task) { task.stop(); delete this.activeDownloadTasks[modelFilename]; }
  }

  async resumeDownload(modelFilename: string) {
    const paused = this.pausedDownloads[modelFilename];
    if (paused) await this.downloadModel(modelFilename, paused.url, this.downloadCallbacks[modelFilename]?.onProgress);
  }

  cancelDownload(modelFilename: string) {
    const task = this.activeDownloadTasks[modelFilename];
    if (task) { task.stop(); delete this.activeDownloadTasks[modelFilename]; delete this.downloadCallbacks[modelFilename]; }
  }

  subscribeToDownload(modelFilename: string, onProgress?: ProgressCallback, onComplete?: () => void, onError?: (err: any) => void): boolean {
    if (!this.activeDownloadTasks[modelFilename]) return false;
    this.downloadCallbacks[modelFilename] = { onProgress, onComplete, onError };
    return true;
  }

  getActiveDownloadIds(): string[] {
    return Object.keys(this.activeDownloadTasks);
  }

  unsubscribeFromDownload(modelFilename: string) {
    delete this.downloadCallbacks[modelFilename];
  }

  async loadModel(modelFilename: string, isEmbedding: boolean = false) {
    const targetIsEmbedding = isEmbedding || modelFilename === this.EMBEDDING_MODEL_NAME;
    
    // Efficiency checks
    if (targetIsEmbedding && this.embeddingContext) return;
    if (!targetIsEmbedding && this.chatContext && this.currentChatModel === modelFilename) return;

    let modelPath = this.getLocalPath(modelFilename);
    let isAsset = false;

    if (targetIsEmbedding) {
      if (!(await ReactNativeFS.exists(modelPath))) {
        try { await ReactNativeFS.copyFileAssets(modelFilename, modelPath); }
        catch { modelPath = modelFilename; isAsset = true; }
      }
    } else {
        if (!(await ReactNativeFS.exists(modelPath))) {
            const extPath = `/data/user/0/com.offline/files/${modelFilename}`;
            if (await ReactNativeFS.exists(extPath)) { modelPath = extPath; }
            else throw new Error("Model not found locally.");
        }
    }
    
    if (!isAsset && !modelPath.startsWith("file://") && modelPath.startsWith("/")) {
        modelPath = `file://${modelPath}`;
    }

    try {
      if (targetIsEmbedding) {
        if (this.embeddingContext) await this.embeddingContext.release();
        this.embeddingContext = await initLlama({
            model: modelPath, is_model_asset: isAsset, n_ctx: 512, embedding: true, pooling_type: 'mean'
        } as any);
        console.log("Embedding context initialized.");
      } else {
        if (this.chatContext) await this.chatContext.release();
        this.chatContext = await initLlama({
            model: modelPath, is_model_asset: isAsset, n_ctx: 2048, n_threads: 4
        } as any);
        this.currentChatModel = modelFilename;
        console.log("Chat context initialized with", modelFilename);
      }
    } catch (err) {
      console.error("Load failed:", err);
      throw err;
    }
  }

  async getEmbeddings(text: string): Promise<number[]> {
    if (!this.embeddingContext) await this.loadModel(this.EMBEDDING_MODEL_NAME, true);
    const result = await this.embeddingContext!.embedding(text);
    return result.embedding;
  }

  async offloadChatModel() {
    if (this.chatContext) {
      await this.chatContext.release();
      this.chatContext = null;
      this.currentChatModel = null;
      console.log("Chat model offloaded.");
    }
  }

  async offloadModel() {
    await this.offloadChatModel();
  }

  generateSystemPrompt(profile: UserProfile | null): string {
    const base = "You are MediNova, a professional health AI. ";
    if (!profile || !profile.isSet) return base + "Provide accurate wellness advice.";
    return `${base} User is ${profile.age}yo ${profile.gender} with ${profile.conditions || "no conditions"}. Factor these into all diet/exercise advice.`;
  }

  async chat(messages: Message[], systemPrompt: string, onToken?: (data: TokenData) => void) {
    if (!this.chatContext) throw new Error("Chat model not loaded.");
    const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
    const res = await this.chatContext.completion({
        messages: fullMessages as any, n_predict: 512, temperature: 0.7, top_p: 0.9, jinja: true
    }, onToken);
    const text = res?.text ?? "";
    console.log("--- AI RESPONSE ---\n", text, "\n-------------------");
    return text;
  }

  async reportChat(
    reportData: { title: string; lines: { label: string; value: string }[] },
    messages: Message[],
    profile: UserProfile | null,
    ragContext?: string,
    onToken?: (data: TokenData) => void
  ) {
    if (!this.chatContext) throw new Error("Chat model not loaded.");
    console.log("--- REPORT DATA RECEIVED ---", reportData);
    const fullMessages = ReportAnalyzechat.generateReportMessages(reportData as any, profile, messages as any);
    
    console.log("--- FINAL PROMPT TO MODEL ---");
    console.log(JSON.stringify(fullMessages, null, 2));

    const res = await this.chatContext.completion({
      messages: fullMessages as any, n_predict: 512, temperature: 0.7, top_p: 0.9, penalty_repeat: 1.2, jinja: true
    }, onToken);
    const text = res?.text ?? "";
    console.log("--- AI RESPONSE (REPORT) ---\n", text, "\n-------------------");
    return text;
  }

  stopCompletion() {
    if (this.chatContext) this.chatContext.stopCompletion();
  }

  async cleanup() {
    if (this.chatContext) await this.chatContext.release();
    if (this.embeddingContext) await this.embeddingContext.release();
    this.chatContext = null;
    this.embeddingContext = null;
  }
}

export default new LlamaService();
