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
  navigateTo: (view: string) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  startNewChat: () => void;
  onLogout: () => void;
  currentUser: { username: string } | null; // Improved typing instead of 'any'
}

interface SidebarItemProps {
  label: string;
  active: boolean;
  onPress: () => void;
  isDestructive?: boolean;
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
      {/* Overlay */}
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleSidebar}
          accessibilityRole="button"
          accessibilityLabel="Close sidebar"
        />
      )}

      {/* Sidebar Container */}
      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }]}
      >
        <SafeAreaView style={styles.safeArea}>

          {/* Header */}
          <View style={styles.sidebarHeader}>
            <View style={styles.brandContainer}>
              <TouchableOpacity
                onPress={() => navigateTo("dashboard")}
                activeOpacity={0.8}
                style={styles.logoWrapper}
              >
                <Image
                  source={require('../assets/images/splash_logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>




            {/* <TouchableOpacity
              onPress={startNewChat}
              style={styles.sidebarNewChat}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.newChatText}>+ New</Text>
            </TouchableOpacity> */}
          </View>

          <View
            style={{
              marginLeft: 15,
              marginRight: 15,
              marginTop: 10,
              padding: 15,
              borderRadius: 15,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: COLORS.primary,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",

              // Shadow
              elevation: 3,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            {currentUser && (
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  {currentUser.username}
                </Text>

                <Text
                  style={{
                    fontSize: 12,
                    color: "#777",
                    marginTop: 2,
                  }}
                >
                  Welcome back 👋
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => navigateTo("profile")}
              activeOpacity={0.7}
              style={{
                backgroundColor: COLORS.primary,
                paddingVertical: 8,
                paddingHorizontal: 15,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                View Profile
              </Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Links */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.sideGroupTitle}>PRIMARY</Text>
            <SidebarItem
              label="💬 Chat History"
              active={currentView === "chat"}
              onPress={() => navigateTo("chat")}
            />

            {/* Dynamic Chat History */}
            {currentView === "chat" && (
              <View style={styles.historyList}>
                {sessions.length === 0 ? (
                  <Text style={styles.emptyHistoryText}>No recent chats</Text>
                ) : (
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
                        style={styles.histItemTouchable}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.histText,
                            s.id === currentSessionId && styles.histTextActive
                          ]}
                          numberOfLines={1}
                        >
                          {s.title || "Untitled Chat"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteSession(s.id)}
                        style={styles.histDeleteBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.histDeleteText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            <Text style={styles.sideGroupTitle}>HEALTH REPORTS</Text>
            <SidebarItem
              label="📊 Analyze Report"
              active={currentView === "report_analysis"}
              onPress={() => navigateTo("report_analysis")}
            />

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

            {/* <Text style={styles.sideGroupTitle}>PERSONALIZATION</Text>
            <SidebarItem
              label="👤 My Health Profile"
              active={currentView === "profile"}
              onPress={() => navigateTo("profile")}
            /> */}

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

            {/* Logout Section */}
            <View style={styles.logoutContainer}>
              <SidebarItem
                label="🚪 Logout"
                active={false}
                onPress={onLogout}
                isDestructive
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </>
  );
};

// Extracted and strongly-typed SidebarItem component
const SidebarItem: React.FC<SidebarItemProps> = ({ label, active, onPress, isDestructive }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[styles.sideItem, active && styles.sideItemActive]}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
  >
    <Text
      style={[
        styles.sideItemLabel,
        active && styles.sideItemLabelActive,
        isDestructive && styles.sideItemDestructive
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay || "rgba(0,0,0,0.4)",
    zIndex: 10,
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.surface || "#FFFFFF",
    zIndex: 20,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderRightWidth: 1,
    borderRightColor: COLORS.primary,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  safeArea: {
    flex: 1,
  },
  sidebarHeader: {
    paddingHorizontal: SPACING.lg || 20,
    paddingTop: SPACING.xl || 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandContainer: {
    flex: 1,
    paddingRight: 10,
  },
  logoWrapper: {
    height: 40, // Constrain the logo wrapper height to hide massive whitespace
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 4,
  },
  logoImage: {
    width: 140,
    height: 140,
    // Adjusted margins to properly crop your specific image asset without affecting layout
    marginTop: -50,
    marginBottom: -50,
  },
  userBadge: {
    fontSize: 13,
    color: COLORS.textSub || "#666",
    fontWeight: "600",
    marginTop: 2,
    marginLeft: 15
  },
  sidebarNewChat: {
    backgroundColor: COLORS.primary || "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.lg || 12,
    shadowColor: COLORS.primary || "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  newChatText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 10,
  },
  sideGroupTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted || "#999",
    marginTop: 28,
    marginHorizontal: 20,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sideItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    borderRadius: RADIUS.md || 8,
  },
  sideItemActive: {
    backgroundColor: "#F0F0F5",
  },
  sideItemLabel: {
    fontSize: 16,
    color: COLORS.textMain || "#1C1C1E",
    fontWeight: "500",
  },
  sideItemLabelActive: {
    color: COLORS.primary || "#007AFF",
    fontWeight: "700",
  },
  sideItemDestructive: {
    color: "#FF3B30",
  },
  historyList: {
    marginBottom: 10,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: COLORS.textMuted || "#999",
    fontStyle: "italic",
    marginLeft: 40,
    marginTop: 5,
  },
  histItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 30,
    marginRight: 10,
    paddingVertical: 8,
    paddingRight: 15,
    borderRadius: 8,
  },
  histItemTouchable: {
    flex: 1,
    paddingLeft: 10,
  },
  histItemActive: {
    backgroundColor: "#F2F2F7",
  },
  histText: {
    fontSize: 14,
    color: COLORS.textSub || "#666",
  },
  histTextActive: {
    color: COLORS.primary || "#007AFF",
    fontWeight: "600",
  },
  histDeleteBtn: {
    padding: 6,
    marginLeft: 5,
  },
  histDeleteText: {
    fontSize: 14,
    color: COLORS.textMuted || "#999",
    fontWeight: "600",
  },
  logoutContainer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F5",
    paddingTop: 10,
  },
});