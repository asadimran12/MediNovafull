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
  Alert,
  AppState,
  Image,
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
import { SIDEBAR_WIDTH, SPACING, RADIUS, SHADOWS } from "./src/constants/theme";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
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
import ImportData from "./src/screens/ImporData";
import { ExercisePlansScreen } from "./src/screens/ExercisePlan";
import { ModelSelectionScreen } from "./src/screens/ModelSelectionScreen";
import { ModelManagerScreen } from "./src/screens/ModelManagerScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { ReportAnalysisScreen } from "./src/screens/ReportAnalysisScreen";
import ImageUploader from "./src/screens/ImageUploader";
import ModelService from "./src/services/ModelService";
import ChatPage from "./src/screens/ChatPage";
import { ForgetPassword } from "./src/screens/ForgetPassword";
import NotificationService from "./src/services/NotificationService";
import { ChatHistoryPage } from "./src/screens/ChatHistoryPage";
import { CloudRestoreLoginScreen } from "./src/screens/CloudRestoreLoginScreen";

type AppView = "dashboard" | "chat" | "diet_plans" | "exercise_plans" | "about" | "settings" | "profile" | "model_setup" | "model_manager" | "report_analysis" | "image_uploader" | "chat_page" | "forget_password" | "restore" | "chat_history" | "cloud_restore_login";

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

function MainApp() {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
  const [currentView, setCurrentView] = useState<AppView>("dashboard");
  const [hasSkippedImport, setHasSkippedImport] = useState(false);
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
  const [scannedReport, setScannedReport] = useState<any>(null);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'gallery' | 'pdf' | 'camera' | undefined>();
  const [cloudData, setCloudData] = useState<any>(null);


  const MAX_MESSAGES = 40;
  const isChatFull = messages.length >= MAX_MESSAGES;

  const flatListRef = useRef<FlatList>(null);
  const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const appState = useRef(AppState.currentState);

  // --- Initialization & Lifecycle ---
  useEffect(() => {
    NotificationService.init().catch(e => console.error("[Notifee] Init error:", e));

    (async () => {
      try {
        setStatus("Syncing Health Data");
        await StorageService.init();

        // Initial Auth Check
        const userId = await AuthService.getCurrentUserId();
        if (userId) {
          const users = await AuthService.getAllUsers();
          const user = users.find(u => u.id === userId);
          if (user) {
            await handleLogin(user);
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
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        console.log("App foregrounded, reloading active model...");
        const activeModel = await ModelService.getActiveModel();
        if (activeModel) {
          LlamaService.loadModel(activeModel.filename).catch(console.error);
        }
      } else if (nextAppState.match(/inactive|background/)) {
        console.log("App backgrounded, offloading model...");
        LlamaService.offloadChatModel().catch(console.error);
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
          text: "Hello! I am MediNova. Ask me anything about diabetes, cardiovascular diseases, or other general health questions. I can also provide diet and exercise guidance!",
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
    if (isSidebarOpen) {
      toggleSidebar();
      setTimeout(() => setCurrentView(view), 300);
    } else {
      setCurrentView(view);
    }
  };

  const startNewChat = () => {
    const newId = Math.random().toString(36).substring(7);
    setCurrentSessionId(newId);
    setMessages([
      {
        id: "initial-greeting",
        text: "Hello! I am MediNova. Ask me anything about diabetes, cardiovascular diseases, or other general health questions. I can also provide diet and exercise guidance!",
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
    if (isSidebarOpen) { toggleSidebar(); }
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
          // Basic clear for now - would ideally clear files
          setMessages([]);
          setSessions([]);
          setPlans([]);
          Alert.alert("Success", "History cleared.");
        },
      },
    ]);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping || isChatFull) return;

    // Check if model is loaded/ready
    const activeModel = await ModelService.getActiveModel();
    if (!activeModel) {
      Alert.alert("Download Required", "Please download an AI model from Settings to use the chat.");
      return;
    }

    const isDownloaded = await ModelService.isModelDownloaded(activeModel.id);
    if (!isDownloaded) {
      Alert.alert("Download Required", "The selected model is not downloaded. Visit Settings -> Manage AI Models.");
      return;
    }

    try {
      await LlamaService.loadModel(activeModel.filename);
    } catch (e) {
      Alert.alert("Error", "Failed to initialize AI model.");
      return;
    }

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
      console.error("Chat error:", e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveProfile = async (profile: UserProfile) => {
    setUserProfile(profile);
    setCurrentView("dashboard");
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

    // Check if any model is downloaded
    const downloaded = await ModelService.getDownloadedModels();
    if (downloaded.length === 0) {
      setCurrentView("model_setup");
    } else {
      if (!profile.isSet) {
        // Close sidebar before showing profile setup
        setIsSidebarOpen(false);
        Animated.timing(sidebarAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 0,
          useNativeDriver: true,
        }).start();
        setCurrentView("profile");
      } else {
        setCurrentView("dashboard");
        initializeSession(allChats);
      }
    }
  };

  const handleModelSetupComplete = async () => {
    const profile = await StorageService.getProfile();
    if (!profile.isSet) {
      setCurrentView("profile");
    } else {
      setCurrentView("dashboard");
      const allChats = await StorageService.getAllChats();
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
    setCurrentView("dashboard");
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <DashboardScreen
            userName={currentUser?.username || ""}
            onNavigate={(view) => setCurrentView(view)}
            onOpenSettings={() => setCurrentView("settings")}
          />
        );
      case "diet_plans":
        return <PlansScreen type="diet" plans={plans} onDelete={async (id) => { await StorageService.deletePlan(id); fetchPlans(); }} onBack={() => setCurrentView("dashboard")} />;
      case "exercise_plans":
        return <ExercisePlansScreen onBack={() => setCurrentView("dashboard")} />;
      case "about":
        return <AboutScreen onBack={() => setCurrentView("dashboard")} />;
      case "settings":
        return <SettingsScreen
          onClearAll={handleClearAll}
          onManageModels={() => setCurrentView("model_manager")}
          onManageProfile={() => setCurrentView("profile")}
          onAbout={() => setCurrentView("about")}
          onBack={() => setCurrentView("dashboard")}
          onLogout={handleLogout}
        />;
      case "profile":
        return <ProfileScreen onSave={handleSaveProfile} onClose={handleCloseProfile} />;
      case "model_setup":
        return <ModelSelectionScreen onComplete={handleModelSetupComplete} />;
      case "model_manager":
        return <ModelManagerScreen onBack={() => setCurrentView("settings")} />;
      case "report_analysis":
        return <ReportAnalysisScreen
          onBack={() => setCurrentView("dashboard")}
          onNavigateToUpload={(mode) => {
            setUploadMode(mode);
            setCurrentView("image_uploader");
          }}
          onNavigateToChat={() => setCurrentView("chat_page")}
        />;

      case "chat_history":
        return <ChatHistoryPage onSelectChat={(id) => {
          loadSession(id);
          setCurrentView("chat");
        }} />;

      case "image_uploader":
        return <ImageUploader
          initialMode={uploadMode}
          onNavigate={(report, imageUri) => {
            setScannedReport(report);
            setScannedImage(imageUri || null);
            setCurrentView("chat_page");
          }}
          onBack={() => {
            setUploadMode(undefined);
            setCurrentView("report_analysis");
          }}
        />;
      case "chat_page":
        return <ChatPage
          onBack={() => {
            setScannedReport(null);
            setScannedImage(null);
            setCurrentView("report_analysis");
          }}
          reportData={scannedReport}
          imageUri={scannedImage}
        />;
      case "forget_password":
        return <ForgetPassword onBack={() => setCurrentView("chat")} />;
      case "restore":
        return (
          <ImportData
            onSkip={() => setCurrentView("dashboard")}
            onCloudDataFetched={setCloudData}
            onCloudRestoreReady={() => setCurrentView("cloud_restore_login")}
            onImportSuccess={async () => {
              const userId = await AuthService.getCurrentUserId();
              if (userId) {
                const users = await AuthService.getAllUsers();
                const user = users.find(u => u.id === userId);
                if (user) {
                  await handleLogin(user);
                  setCurrentView("dashboard");
                  return;
                }
              }
              setCurrentView("dashboard");
            }}
          />
        );
      case "cloud_restore_login":
        return (
          <CloudRestoreLoginScreen
            cloudData={cloudData}
            onRestoreSuccess={async (user) => {
              await handleLogin(user);
            }}
            onBack={() => setCurrentView("restore")}
          />
        );
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
              disabled={isTyping || isChatFull}
            />
          </View>
        );
    }
  };

  if (showSplash) return <SplashScreen status={status} progress={downloadProgress} />;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {currentUser && currentView !== "model_setup" && currentView !== "dashboard" && currentView !== "settings" && currentView !== "profile" && currentView !== "diet_plans" && currentView !== "exercise_plans" && (
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
              <TouchableOpacity onPress={toggleSidebar} style={[styles.menuIcon, { zIndex: 10 }]}><Text style={{ fontSize: 24 }}>☰</Text></TouchableOpacity>
              {currentView !== "chat" && currentView !== "chat_page" && currentView !== "report_analysis" && currentView !== "image_uploader" && currentView !== "model_manager" ? (
                <View style={styles.logoContainer}>
                  <View style={styles.imageContainer}>
                    <Image
                      source={require("./src/assets/images/splash_logo.png")}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>


                  <Text
                    style={[
                      styles.statusText,
                      { color: isReady ? COLORS.success : COLORS.warning },
                    ]}
                  >
                    ● {isReady ? "Ready & Private" : status}
                  </Text>
                </View>
              ) : currentView === "chat" ? (
                <View style={[styles.chatHeader, { flex: 1, borderBottomWidth: 0, padding: 0, marginLeft: 10 }]}>
                  <View>
                    <Text style={styles.chatTitle}>Health Assistant</Text>
                    <Text style={styles.chatSubtitle}>General Consultation & Guidance</Text>
                  </View>
                </View>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginRight: 40 }}>
                  <Text style={[styles.headerTitle, { fontSize: 18, color: COLORS.textHeader, fontWeight: '800' }]}>
                    {currentView === "report_analysis" ? "Report Analysis" :
                      currentView === "image_uploader" ? "Upload Report" :
                        currentView === "model_manager" ? "Manage Models" :
                          currentView === "chat_page" ? "Analysis Results" : ""}
                  </Text>
                </View>
              )}
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
            currentView === "restore" ? (
              renderCurrentView()
            ) : currentView === "cloud_restore_login" ? (
              renderCurrentView()
            ) : currentView === "forget_password" ? (
              <ForgetPassword onBack={() => setCurrentView("chat")} />
            ) : (
              <AuthScreen
                onLogin={handleLogin}
                onForgetPassword={() => setCurrentView("forget_password")}
                onRestore={() => setCurrentView("restore")}
                cloudData={cloudData}
              />
            )
          ) : (
            renderCurrentView()
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function createStyles(COLORS: any) {
  return StyleSheet.create({

  logoContainer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    flex: 1,
    marginLeft: 15,
  },

  imageContainer: {
    width: 140,
    height: 140,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "flex-start",
    marginTop: -45,
    marginBottom: -45,
    marginLeft: -15,
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  appName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textHeader,
  },
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
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: "bold",
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textHeader,
  },
  chatSubtitle: {
    fontSize: 12,
    color: COLORS.textSub,
    fontWeight: "500",
  },
  chatInfoBanner: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    marginHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  chatInfoEmoji: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  chatInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMain,
    lineHeight: 18,
  }
});
}
