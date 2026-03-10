import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { ChatSession } from "../services/StorageService";

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.8;

interface SidebarProps {
  isOpen: boolean;
  sidebarAnim: Animated.Value;
  toggleSidebar: () => void;
  currentView: string;
  navigateTo: (view: any) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  startNewChat: () => void;
  onLogout: () => void;
  currentUser: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  sidebarAnim,
  toggleSidebar,
  currentView,
  navigateTo,
  sessions,
  currentSessionId,
  loadSession,
  deleteSession,
  startNewChat,
  onLogout,
  currentUser,
}) => {
  return (
    <>
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleSidebar}
        />
      )}

      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }]}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.sidebarHeader}>
            <View>
              <Image
                source={require('../assets/images/splash_logo.png')}
                style={{ width: 100, height: 100 }}
                resizeMode="contain"
              />
              {currentUser && (
                <Text style={styles.userBadge}>User: {currentUser.username}</Text>
              )}
            </View>
            <TouchableOpacity onPress={startNewChat} style={styles.sidebarNewChat}>
              <Text style={{ color: "#FFF", fontWeight: "600" }}>+ New</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            <Text style={styles.sideGroupTitle}>PRIMARY</Text>
            <SidebarItem
              label="💬 Chat History"
              active={currentView === "chat"}
              onPress={() => navigateTo("chat")}
            />
            {currentView === "chat" &&
              sessions.map((s) => (
                <View
                  key={s.id}
                  style={[
                    styles.histItemContainer,
                    s.id === currentSessionId && styles.histItemActive,
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => loadSession(s.id)}
                    style={{ flex: 1 }}
                  >
                    <Text style={styles.histText} numberOfLines={1}>
                      {s.title}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteSession(s.id)}
                    style={styles.histDeleteBtn}
                  >
                    <Text style={styles.histDeleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

            <Text style={styles.sideGroupTitle}>VITAL PLANS</Text>
            <SidebarItem
              label="🥗 Diet Plans"
              active={currentView === "diet_plans"}
              onPress={() => navigateTo("diet_plans")}
            />
            <SidebarItem
              label="💪 Exercise Plans"
              active={currentView === "exercise_plans"}
              onPress={() => navigateTo("exercise_plans")}
            />

            <Text style={styles.sideGroupTitle}>PERSONALIZATION</Text>
            <SidebarItem
              label="👤 My Health Profile"
              active={currentView === "profile"}
              onPress={() => navigateTo("profile")}
            />

            <Text style={styles.sideGroupTitle}>GENERAL</Text>
            <SidebarItem
              label="ℹ️ About App"
              active={currentView === "about"}
              onPress={() => navigateTo("about")}
            />
            <SidebarItem
              label="⚙️ Settings"
              active={currentView === "settings"}
              onPress={() => navigateTo("settings")}
            />

            <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: "#EEE", paddingTop: 10 }}>
              <SidebarItem
                label="🚪 Logout / Switch Account"
                active={false}
                onPress={onLogout}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </>
  );
};

const SidebarItem = ({ label, active, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.sideItem, active && styles.sideItemActive]}
  >
    <Text style={[styles.sideItemLabel, active && styles.sideItemLabelActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    zIndex: 10,
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.surface,
    zIndex: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  sidebarHeader: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sidebarBrand: { fontSize: 24, fontWeight: "900", color: COLORS.primary, letterSpacing: -0.5 },
  userBadge: { fontSize: 12, color: COLORS.textSub, fontWeight: "600", marginTop: -2 },
  sidebarNewChat: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.lg,
  },
  sideGroupTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginTop: 25,
    marginLeft: 20,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sideItem: { paddingVertical: 14, paddingHorizontal: 20, flexDirection: "row", alignItems: "center" },
  sideItemActive: { backgroundColor: "#F0F0F5" },
  sideItemLabel: { fontSize: 16, color: COLORS.textMain, fontWeight: "500" },
  sideItemLabelActive: { color: COLORS.primary, fontWeight: "700" },
  histItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 40,
    paddingVertical: 10,
    paddingRight: 15,
  },
  histItemActive: {
    backgroundColor: "#F2F2F7",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  histText: { fontSize: 14, color: COLORS.textSub, flex: 1 },
  histDeleteBtn: { padding: 5, marginLeft: 5 },
  histDeleteText: { fontSize: 14, color: COLORS.textMuted },
});
