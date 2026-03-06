import ReactNativeFS from "react-native-fs";

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string; // Simplistic local hashing for this offline demo
  createdAt: string;
}

class AuthService {
  private readonly AUTH_DIR = `${ReactNativeFS.DocumentDirectoryPath}/auth`;
  private readonly USERS_FILE = `${ReactNativeFS.DocumentDirectoryPath}/auth/users.json`;
  private readonly SESSION_FILE = `${ReactNativeFS.DocumentDirectoryPath}/auth/session.json`;

  async init() {
    const exists = await ReactNativeFS.exists(this.AUTH_DIR);
    if (!exists) {
      await ReactNativeFS.mkdir(this.AUTH_DIR);
    }
  }

  async getAllUsers(): Promise<UserAccount[]> {
    await this.init();
    const exists = await ReactNativeFS.exists(this.USERS_FILE);
    if (!exists) return [];
    try {
      const content = await ReactNativeFS.readFile(this.USERS_FILE, "utf8");
      return JSON.parse(content);
    } catch (e) {
      return [];
    }
  }

  async register(username: string, passwordHash: string): Promise<UserAccount | null> {
    const users = await this.getAllUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return null; // User already exists
    }

    const newUser: UserAccount = {
      id: Math.random().toString(36).substring(7),
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await ReactNativeFS.writeFile(this.USERS_FILE, JSON.stringify(users), "utf8");
    return newUser;
  }

  async login(username: string, passwordHash: string): Promise<UserAccount | null> {
    const users = await this.getAllUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === passwordHash);
    
    if (user) {
      await this.saveSession(user.id);
      return user;
    }
    return null;
  }

  async saveSession(userId: string) {
    await this.init();
    await ReactNativeFS.writeFile(this.SESSION_FILE, JSON.stringify({ userId }), "utf8");
  }

  async getCurrentUserId(): Promise<string | null> {
    const exists = await ReactNativeFS.exists(this.SESSION_FILE);
    if (!exists) return null;
    try {
      const content = await ReactNativeFS.readFile(this.SESSION_FILE, "utf8");
      const { userId } = JSON.parse(content);
      return userId;
    } catch (e) {
      return null;
    }
  }

  async logout() {
    const exists = await ReactNativeFS.exists(this.SESSION_FILE);
    if (exists) {
      await ReactNativeFS.unlink(this.SESSION_FILE);
    }
  }
}

export default new AuthService();
