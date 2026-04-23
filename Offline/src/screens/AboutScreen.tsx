import React from "react";
import { useTheme } from "../context/ThemeContext";

import { StyleSheet, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { SPACING } from "../constants/theme";

interface AboutScreenProps {
  onBack?: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  // A simple array to map out your core features
  const features = [
    { icon: "🔒", title: "100% Private", desc: "Your data never leaves your device." },
    { icon: "🧠", title: "On-Device AI", desc: "Powered by an advanced GGUF offline model." },
    { icon: "⚡", title: "Instant Insights", desc: "Generate plans with zero cloud latency." },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* 1. HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <Text style={styles.appTitle}>MediNova</Text>
          <Text style={styles.appSubtitle}>Your Offline AI Health Companion</Text>
        </View>

        {/* 2. DESCRIPTION */}
        <Text style={styles.aboutText}>
          MediNova is designed to revolutionize your personal health journey. By utilizing
          cutting-edge, on-device Large Language Models, it provides tailored diet plans
          and exercise routines entirely offline.
        </Text>

        {/* 3. KEY FEATURES (Scannable) */}
        <View style={styles.featuresContainer}>
          {features.map((item, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{item.icon}</Text>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 4. MEDICAL DISCLAIMER (Visually distinct box) */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>⚠️ Safety Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            All information provided by MediNova is for educational purposes only.
            It is not a substitute for professional medical advice, diagnosis, or
            treatment. Always seek the advice of your physician or qualified health provider.
          </Text>
        </View>

        {/* 5. FOOTER & LINKS */}
        <View style={styles.footer}>
          <TouchableOpacity>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Version 1.0.0 (GGUF-Offline)</Text>
          <Text style={styles.copyrightText}>© 2024 MediNova. All rights reserved.</Text>
        </View>

      </ScrollView>
    </View>
  );
};

function createStyles(COLORS: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background
    },
    contentContainer: {
      padding: SPACING.lg || 20, // Fallback to 20 if SPACING.lg is undefined
      paddingBottom: 40,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 15,
      paddingVertical: 12,
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    backArrow: {
      fontSize: 22,
      color: COLORS.primary,
      fontWeight: "900",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: COLORS.textHeader,
    },

    // Hero Styles
    heroSection: {
      alignItems: "center",
      marginTop: 20,
      marginBottom: 30,
    },
    logoPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 20,
      backgroundColor: COLORS.primary || "#007AFF",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 15,
      shadowColor: COLORS.primary || "#007AFF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    logoText: {
      fontSize: 40,
      fontWeight: "bold",
      color: "#fff",
    },
    appTitle: {
      fontSize: 28,
      fontWeight: "900",
      color: COLORS.textHeader || "#111",
      letterSpacing: 0.5,
    },
    appSubtitle: {
      fontSize: 16,
      color: COLORS.primary || "#007AFF",
      fontWeight: "600",
      marginTop: 5,
    },

    // Main Text
    aboutText: {
      fontSize: 16,
      color: COLORS.textSub || "#444",
      lineHeight: 24,
      marginBottom: 30,
      textAlign: "center",
    },

    // Features Styles
    featuresContainer: {
      marginBottom: 30,
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
    },
    featureIcon: {
      fontSize: 24,
      marginRight: 15,
    },
    featureTextContainer: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: COLORS.textMain || "#222",
      marginBottom: 2,
    },
    featureDesc: {
      fontSize: 14,
      color: COLORS.textSub || "#666",
    },

    // Disclaimer Styles
    disclaimerBox: {
      backgroundColor: COLORS.surface,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.danger,
      padding: 15,
      borderRadius: 8,
      marginBottom: 40,
    },
    disclaimerTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: COLORS.danger,
      marginBottom: 8,
    },
    disclaimerText: {
      fontSize: 14,
      color: COLORS.textSub,
      lineHeight: 20,
    },

    // Footer Styles
    footer: {
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingTop: 20,
    },
    linkText: {
      fontSize: 14,
      color: COLORS.primary || "#007AFF",
      fontWeight: "600",
      marginBottom: 10,
    },
    versionText: {
      marginTop: 15,
      color: COLORS.textMuted || "#999",
      fontSize: 12,
      fontWeight: "bold",
    },
    copyrightText: {
      marginTop: 5,
      color: COLORS.textMuted || "#999",
      fontSize: 12,
    },
  });
}