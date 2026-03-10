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

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  onOpenSettings,
  userName,
}) => {
  const modules = [
    {
      id: "chat",
      title: "Health Chat",
      desc: "Instant AI medical guidance",
      icon: "💬",
      color: "#4A90E2",
    },
    {
      id: "report_analysis",
      title: "Analyse Report",
      desc: "Scan & summarize results",
      icon: "📊",
      color: "#9B51E0",
    },
    {
      id: "diet_plans",
      title: "Diet Plans",
      desc: "Personalized nutrition",
      icon: "🥗",
      color: "#27AE60",
    },
    {
      id: "exercise_plans",
      title: "Exercise Routine",
      desc: "Tailored fitness guides",
      icon: "💪",
      color: "#F2994A",
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.userName}>{userName || "Friend"}</Text>
        </View>
        <TouchableOpacity onPress={onOpenSettings} style={styles.settingsIcon}>
          <Text style={{ fontSize: 24 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroInfo}>
          <Text style={styles.heroTitle}>MediNova AI</Text>
          <Text style={styles.heroSubtitle}>Your private, offline health companion.</Text>
          <TouchableOpacity 
            style={styles.heroButton}
            onPress={() => onNavigate("chat")}
          >
            <Text style={styles.heroButtonText}>Start Consultation</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.heroImageContainer}>
          <Text style={styles.heroEmoji}>🧠</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>App Modules</Text>
      
      <View style={styles.modulesGrid}>
        {modules.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.moduleCard}
            onPress={() => onNavigate(item.id)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + "15" }]}>
              <Text style={[styles.moduleIcon, { color: item.color }]}>{item.icon}</Text>
            </View>
            <Text style={styles.moduleTitle}>{item.title}</Text>
            <Text style={styles.moduleDesc}>{item.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>🛡️ 100% Offline & Private</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  welcome: { fontSize: 16, color: COLORS.textSub, fontWeight: "500" },
  userName: { fontSize: 28, fontWeight: "bold", color: COLORS.textHeader },
  settingsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.light,
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    flexDirection: "row",
    marginBottom: SPACING.xl,
    ...SHADOWS.medium,
  },
  heroInfo: { flex: 1.5 },
  heroTitle: { fontSize: 24, fontWeight: "bold", color: "#FFF", marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: "#E0FFED", lineHeight: 20, marginBottom: SPACING.lg },
  heroButton: {
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignSelf: "flex-start",
  },
  heroButtonText: { color: COLORS.primary, fontWeight: "bold", fontSize: 14 },
  heroImageContainer: { flex: 1, justifyContent: "center", alignItems: "flex-end" },
  heroEmoji: { fontSize: 60 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textHeader, marginBottom: SPACING.md },
  modulesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  moduleCard: {
    backgroundColor: COLORS.surface,
    width: COLUMN_WIDTH,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  moduleIcon: { fontSize: 24 },
  moduleTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.textHeader, marginBottom: 4 },
  moduleDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },
  footer: { marginTop: SPACING.lg, alignItems: "center", paddingBottom: SPACING.lg },
  footerText: { fontSize: 12, color: COLORS.textSub, fontWeight: "500" },
});
