import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - SPACING.lg * 3) / 2;

interface DashboardScreenProps {
  onNavigate: (view: any) => void;
  onOpenSettings: () => void;
  userName: string;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = (props) => {
  const { onNavigate, onOpenSettings, userName } = props;

  const modules = [
    { id: "chat", title: "Health Chat", desc: "Instant AI medical guidance", icon: "💬", color: "#4A90E2", bgColor: "#EBF4FF" },
    { id: "report_analysis", title: "Analyse Report", desc: "Scan & summarize results", icon: "📊", color: "#9B51E0", bgColor: "#F3EAFF" },
    { id: "diet_plans", title: "Diet Plans", desc: "Personalized nutrition", icon: "🥗", color: "#27AE60", bgColor: "#E9F9EF" },
    { id: "exercise_plans", title: "Exercise Routine", desc: "Tailored fitness guides", icon: "💪", color: "#F2994A", bgColor: "#FFF3E8" },
  ];

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topNav}>
          <Image
            source={require("../assets/images/splash_logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <TouchableOpacity
            onPress={onOpenSettings}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 24 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerTextSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userNameText}>{userName || "Friend"}</Text>
        </View>

        <View style={styles.heroCard}>
          {/* RIGHT: Background Image */}
          <View style={styles.heroImageTarget}>
            <Image
              source={require("../assets/images/doctor_hero.jpg")}
              style={styles.heroImage}
              resizeMode="cover"
            />
            {/* Green tint overlay for the image */}
            <View style={styles.heroImageTint} />
          </View>

          {/* MIDDLE BLUR BORDER */}
          <View style={styles.heroBlurBridge}>
            {Array.from({ length: 25 }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 2,
                  height: '100%',
                  backgroundColor: '#2B5E4A',
                  opacity: 1 - (i / 25)
                }}
              />
            ))}
          </View>

          {/* LEFT/FULL CONTENT LAYER */}
          <View style={styles.heroContentInside}>
            <View>
              {/* Badge */}
              <View style={styles.badgeTop}>
                <Text style={styles.badgeTopIcon}>✨</Text>
                <Text style={styles.badgeTopText}>AI CLINICAL INTELLIGENCE</Text>
              </View>

              {/* Title */}
              <Text style={styles.heroTitle}>
                Experience{"\n"}MediNova AI{"\n"}Consultation
              </Text>

              {/* Subtitle */}
              <View style={styles.subtitleContainer}>
                <Text style={styles.heroSubtitle}>
                  Our clinical AI analyzes your symptoms and medical history in real-time to provide precise, preliminary health insights.
                </Text>
              </View>
            </View>

            {/* Button */}
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => onNavigate("chat")}
              activeOpacity={0.8}
            >
              <Text style={styles.heroButtonLabel}>Start Consultation  →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionHeading}>App Modules</Text>

        <View style={styles.gridContainer}>
          {modules.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.moduleItemCard}
              onPress={() => onNavigate(item.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
                <Text style={styles.moduleIconText}>{item.icon}</Text>
              </View>
              <Text style={styles.moduleItemTitle}>{item.title}</Text>
              <Text style={styles.moduleItemDesc} numberOfLines={2}>{item.desc}</Text>
              <View style={[styles.activeBar, { backgroundColor: item.color }]} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footerBranding}>
          <View style={styles.privacyIndicator}>
            <Text style={styles.footerBrandText}>🛡️ 100% Offline & Private</Text>
          </View>
          <Text style={styles.mutedBrandingText}>Powered by local Edge-AI technology</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  headerLogo: {
    width: 200,
    height: 200,
    margin: -100,
    left: 70
  },
  settingsIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTextSection: {
    marginBottom: SPACING.xl,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.textSub,
    fontWeight: "500",
  },
  userNameText: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.textHeader,
    letterSpacing: -0.5,
  },
  heroCard: {
    backgroundColor: "#2B5E4A",      // Dark green base from the image
    borderRadius: RADIUS.xl,
    minHeight: 400, // Make it taller like the image
    marginBottom: SPACING.xl,
    overflow: "hidden",
    position: "relative",
    ...SHADOWS.medium,
  },
  heroImageTarget: {
    // RIGHT: Image occupies right 50%
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "50%",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroImageTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(43, 94, 74, 0.3)", // slight green tint over the image
  },
  heroBlurBridge: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 50,
    flexDirection: "row",
    zIndex: 5,
  },
  heroContentInside: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: "space-between",
    zIndex: 10,
  },
  badgeTop: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: SPACING.lg,
  },
  badgeTopIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  badgeTopText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: SPACING.md,
    lineHeight: 34,
  },
  subtitleContainer: {
    width: "70%", // don't overlap too much text on the face
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 22,
    fontWeight: "500",
  },
  heroButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30, // fully rounded pill
    alignSelf: "flex-start",
    marginTop: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    ...SHADOWS.light,
  },
  heroButtonLabel: {
    color: "#184D3D", // dark green text
    fontWeight: "bold",
    fontSize: 15,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textHeader,
    marginBottom: SPACING.md,
    letterSpacing: -0.3,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  moduleItemCard: {
    backgroundColor: COLORS.surface,
    width: COLUMN_WIDTH,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 140,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  moduleIconText: {
    fontSize: 24,
  },
  moduleItemTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textHeader,
    marginBottom: 4,
  },
  moduleItemDesc: {
    fontSize: 12,
    color: COLORS.textSub,
    lineHeight: 16,
  },
  activeBar: {
    position: "absolute",
    bottom: 0,
    left: RADIUS.lg,
    right: RADIUS.lg,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    opacity: 0.5,
  },
  footerBranding: {
    marginTop: SPACING.md,
    alignItems: "center",
  },
  privacyIndicator: {
    backgroundColor: "rgba(89, 170, 111, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    marginBottom: 6,
  },
  footerBrandText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "700",
  },
  mutedBrandingText: {
    fontSize: 11,
    color: COLORS.textSub,
  },
});
