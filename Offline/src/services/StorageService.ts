import ReactNativeFS from "react-native-fs";

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
  isSet: boolean;
}

// ─── Re-exports from DietPlanGenerator ────────────────────────────────────────
// Keep backward compatibility for any consumer that imports diet-plan symbols
// from StorageService.

export { generateDietPlan, safeParseDietPlan, loadLatestDietPlan } from './DietPlanGenerator';
export type { MealItem, Meal, DayPlan, StructuredDietPlan } from './DietPlanGenerator';

// ─── Storage Service ───────────────────────────────────────────────────────────

class StorageService {
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

  generateTitle(messages: LocalMessage[]): string {
    const first = messages.find((m) => m.role === "user");
    if (!first) return "New Health Chat";
    return first.text.length > 30 ? first.text.substring(0, 27) + "..." : first.text;
  }
}

const storageService = new StorageService();

export default storageService;