import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { SPACING, RADIUS, SHADOWS } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

const { width, height } = Dimensions.get("window");
const COLUMN_WIDTH = (width - SPACING.lg * 3) / 2;

interface DashboardScreenProps {
  onNavigate: (view: any) => void;
  onOpenSettings: () => void;
  userName: string;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = (props) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
  const { onNavigate, onOpenSettings, userName } = props;

  const modules = [
    { id: "chat", title: "Health Chat", desc: "Instant AI guidance", icon: "💬", color: "#4A90E2", bgColor: "#EBF4FF" },
    { id: "report_analysis", title: "Analyse Report", desc: "Scan & summarize", icon: "📊", color: "#9B51E0", bgColor: "#F3EAFF" },
    { id: "diet_plans", title: "Diet Plans", desc: "Personalized nutrition", icon: "🥗", color: "#27AE60", bgColor: "#E9F9EF" },
    { id: "exercise_plans", title: "Exercise Routine", desc: "Tailored fitness", icon: "💪", color: "#F2994A", bgColor: "#FFF3E8" },
  ];

  return (
    <View style={styles.outerContainer}>

      {/* ── TOP NAV & WELCOME ── */}
      <View style={[styles.topNav, { justifyContent: 'space-between', height: 'auto', alignItems: 'center', marginBottom: SPACING.lg }]}>
        <View style={[styles.welcomeSection, { marginTop: 0, marginBottom: 0, flex: 1, marginRight: 15 }]}>
          <Text numberOfLines={1}>
            <Text style={[styles.welcomeText, { fontSize: 16 }]}>Welcome back, </Text>
            <Text style={[styles.userNameText, { fontSize: 22 }]}>{userName || "Friend"}</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={onOpenSettings} activeOpacity={0.7} style={styles.settingsBtn}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* ── HERO CARD ── */}
      <View style={styles.heroCard}>
        {/* Doctor image — right half */}
        <View style={styles.heroImageTarget}>
          <Image
            source={require("../assets/images/doctor_hero.jpg")}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* Gradient fade strips right→left */}
        <View style={styles.heroFade}>
          {Array.from({ length: 32 }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 3,
                height: "100%",
                backgroundColor: "#1A4C3B",
                opacity: 1 - i / 32,
              }}
            />
          ))}
        </View>

        {/* Left text content */}
        <View style={styles.heroContent}>
          {/* Badge */}
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeIcon}>✦</Text>
            <Text style={styles.heroBadgeText}>AI HEALTH ASSISTANT</Text>
          </View>

          {/* Title */}
          <Text style={styles.heroTitle}>
            Experience{"\n"}MediNova AI{"\n"}Consultation
          </Text>
          {/* Subtitle */}
          <Text style={styles.heroSubtitle}>
            Instant symptom analysis &{"\n"}precise health guidance.
          </Text>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => onNavigate("chat")}
            activeOpacity={0.85}
          >
            <Text style={styles.heroButtonLabel}>Consult Now  →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MODULES HEADING ── */}
      <Text style={styles.sectionHeading}>App Modules</Text>

      {/* ── MODULE GRID ── */}
      <View style={styles.gridContainer}>
        {modules.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.moduleCard}
            onPress={() => onNavigate(item.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
              <Text style={styles.moduleIcon}>{item.icon}</Text>
            </View>
            <Text style={styles.moduleTitle}>{item.title}</Text>
            <Text style={styles.moduleDesc} numberOfLines={2}>{item.desc}</Text>
            <View style={[styles.activeBar, { backgroundColor: item.color }]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <View style={styles.privacyBadge}>
          <Text style={styles.privacyText}>🛡️  100% Offline & Private</Text>
        </View>
        <Text style={styles.footerSub}>Powered by local Edge-AI technology</Text>
      </View>

    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────
const createStyles = (COLORS: any) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },

  /* ── NAV ── */
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
    height: 44,
  },
  headerLogo: {
    width: 140,
    height: 140,
    marginLeft: -10,
    marginTop: -50,
    marginBottom: -50,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  settingsIcon: {
    fontSize: 20,
  },

  /* ── WELCOME ── */
  welcomeSection: {
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textSub,
    fontWeight: "500",
  },
  userNameText: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.textHeader,
    letterSpacing: -0.5,
  },

  /* ── HERO ── */
  heroCard: {
    backgroundColor: "#1A4C3B",
    borderRadius: RADIUS.xl,
    flex: 1,                    // fills remaining vertical space
    marginBottom: SPACING.md,
    overflow: "hidden",
    position: "relative",
    ...SHADOWS.medium,
  },
  heroImageTarget: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "52%",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroFade: {
    position: "absolute",
    left: "47%",
    top: 0,
    bottom: 0,
    width: 100,
    flexDirection: "row",
    zIndex: 5,
  },
  heroContent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "60%",
    paddingHorizontal: 20,
    paddingVertical: 22,
    justifyContent: "center",
    gap: 12,
    zIndex: 10,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  heroBadgeIcon: {
    fontSize: 10,
    marginRight: 5,
    color: "#A8E6C3",
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#A8E6C3",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 19,
    fontWeight: "400",
  },
  heroButton: {
    backgroundColor: "#59AA6F",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    alignSelf: "flex-start",
    ...SHADOWS.light,
  },
  heroButtonLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  /* ── MODULES ── */
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textHeader,
    marginBottom: SPACING.sm,
    letterSpacing: -0.2,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  moduleCard: {
    backgroundColor: COLORS.surface,
    width: COLUMN_WIDTH,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 108,
    ...SHADOWS.light,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  moduleIcon: {
    fontSize: 20,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textHeader,
    marginBottom: 2,
  },
  moduleDesc: {
    fontSize: 11,
    color: COLORS.textSub,
    lineHeight: 15,
  },
  activeBar: {
    position: "absolute",
    bottom: 0,
    left: RADIUS.lg,
    right: RADIUS.lg,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    opacity: 0.55,
  },

  /* ── FOOTER ── */
  footer: {
    alignItems: "center",
    paddingTop: 4,
  },
  privacyBadge: {
    backgroundColor: "rgba(89,170,111,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "700",
  },
  footerSub: {
    fontSize: 10,
    color: COLORS.textSub,
  },
});
