import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Animated,
  Dimensions,
  Alert,
  AppState,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";

// Services
import LlamaService, { Message } from "./src/services/LlamaService";
import StorageService, {
  LocalMessage,
  ChatSession,
  HealthPlan,
  UserProfile,
} from "./src/services/StorageService";
import AuthService, { UserAccount } from "./src/services/AuthService";

// Constant & Components
import { COLORS, SIDEBAR_WIDTH, SPACING } from "./src/constants/theme";
import { Sidebar } from "./src/components/Sidebar";
import { ChatBubble } from "./src/components/ChatBubble";
import { ChatInput } from "./src/components/ChatInput";
import { SplashScreen } from "./src/components/SplashScreen";

// Screens
import { PlansScreen } from "./src/screens/PlansScreen";
import { AboutScreen } from "./src/screens/AboutScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { ExercisePlansScreen } from "./src/screens/ExercisePlan";

type AppView = "chat" | "diet_plans" | "exercise_plans" | "about" | "settings" | "profile";

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>("chat");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState("Preparing Secure AI");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState<number | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  const MAX_MESSAGES = 40;
  const isChatFull = messages.length >= MAX_MESSAGES;

  const flatListRef = useRef<FlatList>(null);
  const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const appState = useRef(AppState.currentState);

  // --- Initialization & Model Lifecycle ---
  useEffect(() => {
    (async () => {
      try {
        const isDownloaded = await LlamaService.isModelDownloaded();

        if (!isDownloaded) {
          setStatus("Starting First-Time Download");
          await LlamaService.downloadModel((progress) => {
            setDownloadProgress(progress);
            setStatus(progress < 100 ? "Downloading Secure AI" : "Download Complete");
          });
        }

        setStatus("Initializing Medical AI");
        await LlamaService.loadModel();

        setStatus("Syncing Health Data");
        await StorageService.init();

        // Initial Auth Check
        const userId = await AuthService.getCurrentUserId();
        if (userId) {
          const users = await AuthService.getAllUsers();
          const user = users.find(u => u.id === userId);
          if (user) {
            await StorageService.setUser(user.id);
            setCurrentUser(user);
            const profile = await StorageService.getProfile();
            setUserProfile(profile);
            const allChats = await StorageService.getAllChats();
            setSessions(allChats);
            await fetchPlans();

            if (!profile.isSet) {
              setCurrentView("profile");
            } else {
              initializeSession(allChats);
            }
          }
        }

        setIsReady(true);
        setStatus("Ready");
        setTimeout(() => setShowSplash(false), 2000);
      } catch (e: any) {
        setStatus("Initialization Failed: " + (e.message ?? e));
      }
    })();

    // AppState Listener for Load/Offload
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        console.log("App has come to the foreground, reloading model...");
        LlamaService.loadModel().catch(console.error);
      } else if (nextAppState.match(/inactive|background/)) {
        console.log("App going to background, offloading model...");
        LlamaService.offloadModel().catch(console.error);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      LlamaService.cleanup();
    };
  }, []);

  const initializeSession = async (allChats: ChatSession[]) => {
    const emptySession = allChats.find(
      (s) => !s.messages.some((m) => m.role === "user")
    );
    if (emptySession) {
      const session = await StorageService.loadChat(emptySession.id);
      if (session) {
        setCurrentSessionId(emptySession.id);
        setMessages(session.messages);
      }
    } else {
      const newId = Math.random().toString(36).substring(7);
      setCurrentSessionId(newId);
      setMessages([
        {
          id: "initial-greeting",
          text: "Hello! I am MediNova. Ask me for a diet plan, exercise routine, or medical guidance!",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const fetchPlans = async () => {
    const allPlans = await StorageService.getPlans();
    setPlans(allPlans);
  };

  // --- Persistence ---
  useEffect(() => {
    const hasUserMsg = messages.some((m) => m.role === "user");
    if (currentSessionId && hasUserMsg && isReady && !isTyping) {
      const title = StorageService.generateTitle(messages);
      const updatedSession: ChatSession = {
        id: currentSessionId,
        title,
        messages,
        updatedAt: new Date().toISOString(),
        isFull: messages.length >= MAX_MESSAGES,
      };
      StorageService.saveChat(updatedSession).then(() => {
        setSessions((prev) => {
          const index = prev.findIndex((s) => s.id === currentSessionId);
          const newSessions = [...prev];
          if (index > -1) newSessions[index] = updatedSession;
          else newSessions.push(updatedSession);
          return newSessions.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        });
      });
    }
  }, [messages.length, currentSessionId, isReady, isTyping]);

  useEffect(() => {
    if (messages.length > 0 && currentView === "chat") {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, currentView]);

  // --- Controls ---
  const toggleSidebar = () => {
    const toValue = isSidebarOpen ? -SIDEBAR_WIDTH : 0;
    Animated.timing(sidebarAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsSidebarOpen(!isSidebarOpen);
  };

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    toggleSidebar();
  };

  const startNewChat = () => {
    const newId = Math.random().toString(36).substring(7);
    setCurrentSessionId(newId);
    setMessages([
      {
        id: "initial-greeting",
        text: "Hello! I am MediNova. Ask me for a diet plan, exercise routine, or medical guidance!",
        role: "assistant",
        timestamp: new Date(),
      },
    ]);
    if (currentView !== "chat") setCurrentView("chat");
    if (isSidebarOpen) toggleSidebar();
  };

  const loadSession = async (id: string) => {
    const session = await StorageService.loadChat(id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
    }
    setCurrentView("chat");
    toggleSidebar();
  };

  const deleteSession = (id: string) => {
    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await StorageService.deleteChat(id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
            if (currentSessionId === id || sessions.length <= 1) startNewChat();
          },
        },
      ]
    );
  };

  const handleSaveAsPlan = (msg: LocalMessage) => {
    Alert.alert(
      "Save as Plan",
      "Would you like to save this as a Diet or Exercise plan?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Diet",
          onPress: async () => {
            await finalizePlanSave(msg, "diet");
          },
        },
        {
          text: "Exercise",
          onPress: async () => {
            await finalizePlanSave(msg, "exercise");
          },
        },
      ]
    );
  };

  const finalizePlanSave = async (msg: LocalMessage, type: "diet" | "exercise") => {
    const newPlan: HealthPlan = {
      id: Math.random().toString(36).substring(7),
      type,
      title: msg.text.substring(0, 30) + "...",
      content: msg.text,
      createdAt: new Date().toISOString(),
    };
    await StorageService.savePlan(newPlan);
    await fetchPlans();
    Alert.alert("Success", `Plan saved to your ${type} collection.`);
  };

  const handleClearAll = () => {
    Alert.alert("Danger", "Clear all chats and plans?", [
      { text: "Cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          Alert.alert("Notice", "Reset feature coming soon.");
        },
      },
    ]);
  };

  const handleSend = async () => {
    if (!isReady || !inputText.trim() || isTyping || isChatFull) return;
    const userText = inputText.trim();
    setInputText("");
    Keyboard.dismiss();
    const userMsg: LocalMessage = {
      id: Math.random().toString(),
      text: userText,
      role: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const systemPrompt = LlamaService.generateSystemPrompt(userProfile);
    const history: Message[] = [
      ...messages.map((m) => ({ role: m.role, content: m.text })),
      { role: "user", content: userText },
    ];

    setIsTyping(true);
    const astId = Math.random().toString();
    setMessages((prev) => [
      ...prev,
      { id: astId, text: "", role: "assistant", timestamp: new Date() },
    ]);

    let acc = "";
    try {
      await LlamaService.chat(history, systemPrompt, ({ token }) => {
        acc += token;
        setMessages((prev) =>
          prev.map((m) => (m.id === astId ? { ...m, text: acc } : m))
        );
      });
    } catch (e) {
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveProfile = async (profile: UserProfile) => {
    setUserProfile(profile);
    setCurrentView("chat");
    const allChats = await StorageService.getAllChats();
    initializeSession(allChats);
  };

  const handleLogin = async (user: UserAccount) => {
    await StorageService.setUser(user.id);
    setCurrentUser(user);
    const profile = await StorageService.getProfile();
    setUserProfile(profile);
    const allChats = await StorageService.getAllChats();
    setSessions(allChats);
    await fetchPlans();

    if (!profile.isSet) {
      setCurrentView("profile");
    } else {
      setCurrentView("chat");
      initializeSession(allChats);
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
    setUserProfile(null);
    setMessages([]);
    setSessions([]);
    setPlans([]);
    setCurrentView("chat"); // Will show AuthScreen
  };

  const handleStopGeneration = () => {
    LlamaService.stopCompletion();
    setIsTyping(false);
  };

  const handleCloseProfile = () => {
    setCurrentView("chat");
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "diet_plans":
        return <PlansScreen type="diet" plans={plans} onDelete={async (id) => { await StorageService.deletePlan(id); fetchPlans(); }} />;
      case "exercise_plans":
        return <ExercisePlansScreen />;
      case "about":
        return <AboutScreen />;
      case "settings":
        return <SettingsScreen onClearAll={handleClearAll} />;
      case "profile":
        return <ProfileScreen onSave={handleSaveProfile} onClose={handleCloseProfile} />;
      default:
        return (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={({ item }) => (
                <ChatBubble message={item} onSavePlan={handleSaveAsPlan} />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
            />
            {isChatFull && (
              <View style={styles.fullNotice}>
                <Text style={styles.fullNoticeText}>Limit reached. Start new for accuracy.</Text>
                <TouchableOpacity onPress={startNewChat} style={styles.inlineNewChatBtn}>
                  <Text style={styles.inlineNewChatBtnText}>New Chat</Text>
                </TouchableOpacity>
              </View>
            )}
            {isTyping && <Text style={styles.generatingState}>MediNova is generating...</Text>}
            <ChatInput
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              onStop={handleStopGeneration}
              isGenerating={isTyping}
              disabled={!isReady || isTyping || isChatFull}
            />
          </View>
        );
    }
  };

  if (showSplash) return <SplashScreen status={status} progress={downloadProgress} />;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {currentUser && (
          <>
            <Sidebar
              isOpen={isSidebarOpen}
              sidebarAnim={sidebarAnim}
              toggleSidebar={toggleSidebar}
              currentView={currentView}
              navigateTo={navigateTo}
              sessions={sessions}
              currentSessionId={currentSessionId}
              loadSession={loadSession}
              deleteSession={deleteSession}
              startNewChat={startNewChat}
              onLogout={handleLogout}
              currentUser={currentUser}
            />
            <View style={styles.header}>
              <TouchableOpacity onPress={toggleSidebar} style={styles.menuIcon}><Text style={{ fontSize: 24 }}>☰</Text></TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.headerTitle}>MediNova</Text>
                <Text style={[styles.statusText, { color: isReady ? COLORS.success : COLORS.warning }]}>
                  ● {isReady ? "Ready & Private" : status}
                </Text>
              </View>
              {currentView === "chat" && (
                <TouchableOpacity onPress={startNewChat}>
                  <Text style={{ color: COLORS.primary, fontWeight: "600" }}>New</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
        <View style={{ flex: 1 }}>
          {!currentUser ? (
            <AuthScreen onLogin={handleLogin} />
          ) : (
            renderCurrentView()
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", alignItems: "center", padding: 15, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textHeader },
  statusText: { fontSize: 11, fontWeight: "500" },
  menuIcon: { padding: 5 },
  listContent: { padding: 15 },
  generatingState: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic", marginLeft: 20, marginBottom: 10 },
  fullNotice: { backgroundColor: COLORS.fullNoticeBg, padding: 10, alignItems: "center", borderTopWidth: 1, borderTopColor: COLORS.fullNoticeBorder },
  fullNoticeText: { color: COLORS.fullNoticeText, fontSize: 12, marginBottom: 5 },
  inlineNewChatBtn: { backgroundColor: COLORS.fullNoticeBtn, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  inlineNewChatBtnText: { color: COLORS.surface, fontSize: 12, fontWeight: "700" },
});
