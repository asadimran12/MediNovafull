import * as ReactNativeFS from "react-native-fs";
import { BACKEND_URL } from "@env";

export interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: LocalMessage[];
  updatedAt: string;
  isFull?: boolean;
}

export interface HealthPlan {
  id: string;
  type: "diet" | "exercise";
  title: string;
  content: string;
  createdAt: string;
}

export interface UserProfile {
  age?: string;
  gender?: "Male" | "Female" | "Other" | "";
  conditions?: string;
  severity?: "Low" | "Medium" | "High" | "";
  forgetPasswordQuestion?: string;
  forgetPasswordAnswer?: string;
  isSet: boolean;
}


// ─── Storage Service ───────────────────────────────────────────────────────────

class StorageService {

  private readonly BACKEND_URL = 'https://medinovafull-2.onrender.com';
  private userId: string | null = null;
  private readonly USERS_BASE_DIR = `${ReactNativeFS.DocumentDirectoryPath}/users`;

  private getUserDir() {
    if (!this.userId) return `${ReactNativeFS.DocumentDirectoryPath}/guest`;
    return `${this.USERS_BASE_DIR}/${this.userId}`;
  }

  private get chatsDir() { return `${this.getUserDir()}/chats`; }
  private get plansDir() { return `${this.getUserDir()}/plans`; }
  private get profilePath() { return `${this.getUserDir()}/user_profile.json`; }

  async setUser(userId: string | null) { this.userId = userId; await this.init(); }

  async init() {
    if (!(await ReactNativeFS.exists(this.USERS_BASE_DIR)))
      await ReactNativeFS.mkdir(this.USERS_BASE_DIR);
    const userDir = this.getUserDir();
    if (!(await ReactNativeFS.exists(userDir))) await ReactNativeFS.mkdir(userDir);
    if (!(await ReactNativeFS.exists(this.chatsDir))) await ReactNativeFS.mkdir(this.chatsDir);
    if (!(await ReactNativeFS.exists(this.plansDir))) await ReactNativeFS.mkdir(this.plansDir);
  }

  async saveChat(chat: ChatSession) {
    await ReactNativeFS.writeFile(`${this.chatsDir}/${chat.id}.json`, JSON.stringify(chat), "utf8");
  }

  async exportAllDataLocally(): Promise<string> {
    await this.init();

    // Gather all data
    const exportData: any = {
      timestamp: new Date().toISOString(),
      profile: await this.getProfile(),
      chats: await this.getAllChats(),
      plans: await this.getPlans(),
      auth: {}
    };

    // Gather Auth Data (Users & Sessions)
    const authDir = `${ReactNativeFS.DocumentDirectoryPath}/auth`;
    try {
      if (await ReactNativeFS.exists(`${authDir}/users.json`)) {
        exportData.auth.users = JSON.parse(await ReactNativeFS.readFile(`${authDir}/users.json`, "utf8"));
      }
      if (await ReactNativeFS.exists(`${authDir}/session.json`)) {
        exportData.auth.session = JSON.parse(await ReactNativeFS.readFile(`${authDir}/session.json`, "utf8"));
      }
    } catch (e) {
      console.error("Failed to read auth data for export", e);
    }

    // Determine export path (try Download directory first, fallback to Document directory)
    const exportDir = ReactNativeFS.DownloadDirectoryPath || ReactNativeFS.DocumentDirectoryPath;
    const exportPath = `${exportDir}/MediNova_Export_${Date.now()}.json`;

    await ReactNativeFS.writeFile(exportPath, JSON.stringify(exportData, null, 2), "utf8");
    console.log(`Exported ${exportData.chats.length} chats, ${exportData.plans.length} plans to: ${exportPath}`);
    return exportPath;
  }

  async exportAllDataOnCloud() {
    try {
      const exportData: any = {
        timestamp: new Date().toISOString(),
        profile: await this.getProfile(),
        chats: await this.getAllChats(),
        plans: await this.getPlans(),
        auth: {
          users: [],
          session: {}
        }
      };
      const authDir = `${ReactNativeFS.DocumentDirectoryPath}/auth`;
      try {
        if (await ReactNativeFS.exists(`${authDir}/users.json`)) {
          exportData.auth.users = JSON.parse(await ReactNativeFS.readFile(`${authDir}/users.json`, "utf8"));
        }
        if (await ReactNativeFS.exists(`${authDir}/session.json`)) {
          exportData.auth.session = JSON.parse(await ReactNativeFS.readFile(`${authDir}/session.json`, "utf8"));
        }
      } catch (e) {
        console.error("Failed to read auth data for export", e);
      }
      const response = await fetch(`${this.BACKEND_URL}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exportData),
      });
      const data = await response.json();
    } catch (error) {
      console.error("Failed to export to cloud", error);
      throw error;
    }
  }



  async importAllDataLocally(filePath: string) {
    try {
      const content = await ReactNativeFS.readFile(filePath, "utf8");
      const data = JSON.parse(content);
      console.log("Importing data:", data);

      await this.init();


      if (data.profile) {
        await this.saveProfile(data.profile);
      }

      if (data.chats) {
        for (const chat of data.chats) {
          await this.saveChat(chat);
        }
      }

      if (data.plans) {
        for (const plan of data.plans) {
          await this.savePlan(plan);
        }
      }

      const authDir = `${ReactNativeFS.DocumentDirectoryPath}/auth`;
      if (!(await ReactNativeFS.exists(authDir))) {
        await ReactNativeFS.mkdir(authDir);
      }
      if (data.auth?.users) {
        await ReactNativeFS.writeFile(`${authDir}/users.json`, JSON.stringify(data.auth.users), "utf8");
      }
      if (data.auth?.session) {
        await ReactNativeFS.writeFile(`${authDir}/session.json`, JSON.stringify(data.auth.session), "utf8");
      }
      return true;
    } catch (e) {
      console.error("Failed to import data", e);
      return false;
    }
  }

  async loadChat(id: string): Promise<ChatSession | null> {
    const path = `${this.chatsDir}/${id}.json`;
    if (!(await ReactNativeFS.exists(path))) return null;
    const content = await ReactNativeFS.readFile(path, "utf8");
    const chat = JSON.parse(content);
    chat.messages = chat.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    return chat;
  }

  async getAllChats(): Promise<ChatSession[]> {
    await this.init();
    const files = await ReactNativeFS.readDir(this.chatsDir);
    const chats: ChatSession[] = [];
    for (const file of files) {
      if (!file.name.endsWith(".json")) continue;
      try { chats.push(JSON.parse(await ReactNativeFS.readFile(file.path, "utf8"))); }
      catch (e) { console.error("Chat parse error:", file.path); }
    }
    return chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async deleteChat(id: string) {
    const path = `${this.chatsDir}/${id}.json`;
    if (await ReactNativeFS.exists(path)) await ReactNativeFS.unlink(path);
  }

  async savePlan(plan: HealthPlan) {
    await this.init();
    await ReactNativeFS.writeFile(`${this.plansDir}/${plan.id}.json`, JSON.stringify(plan), "utf8");
  }

  async getPlans(type?: "diet" | "exercise"): Promise<HealthPlan[]> {
    await this.init();
    const files = await ReactNativeFS.readDir(this.plansDir);
    const plans: HealthPlan[] = [];
    for (const file of files) {
      if (!file.name.endsWith(".json")) continue;
      try {
        const plan: HealthPlan = JSON.parse(await ReactNativeFS.readFile(file.path, "utf8"));
        if (!type || plan.type === type) plans.push(plan);
      } catch (e) { console.error("Plan parse error:", file.path); }
    }
    return plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async deletePlan(id: string) {
    const path = `${this.plansDir}/${id}.json`;
    if (await ReactNativeFS.exists(path)) await ReactNativeFS.unlink(path);
  }

  async getProfile(): Promise<UserProfile> {
    if (!(await ReactNativeFS.exists(this.profilePath))) return { isSet: false };
    try { return JSON.parse(await ReactNativeFS.readFile(this.profilePath, "utf8")); }
    catch { return { isSet: false }; }
  }

  async saveProfile(profile: UserProfile) {
    await ReactNativeFS.writeFile(this.profilePath, JSON.stringify(profile), "utf8");
  }

  async deleteProfile() {
    if (await ReactNativeFS.exists(this.profilePath)) await ReactNativeFS.unlink(this.profilePath);
  }

  // ─── Generic Storage ────────────────────────────────────────────────────────
  async setItem(key: string, value: string) {
    const path = `${this.getUserDir()}/${key}.txt`;
    await ReactNativeFS.writeFile(path, value, "utf8");
  }

  async getItem(key: string): Promise<string | null> {
    const path = `${this.getUserDir()}/${key}.txt`;
    if (!(await ReactNativeFS.exists(path))) return null;
    return await ReactNativeFS.readFile(path, "utf8");
  }

  generateTitle(messages: LocalMessage[]): string {
    const first = messages.find((m) => m.role === "user");
    if (!first) return "New Health Chat";
    return first.text.length > 30 ? first.text.substring(0, 27) + "..." : first.text;
  }
}

const storageService = new StorageService();

export default storageService;