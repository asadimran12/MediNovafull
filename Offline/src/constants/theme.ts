import { Dimensions } from "react-native";
const { width, height } = Dimensions.get("window");

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;
export const SIDEBAR_WIDTH = width * 0.8;

export const COLORS = {
  // Brand Colors

  primary: "#59AA6F",
  secondary: "#30D158",      // Vibrant Blue
  accent: "#5856D6",       // Indigo Accent

  // Backgrounds
  background: "#F2F2F7",   // Light Grayish Blue
  surface: "#FFFFFF",
  card: "#FFFFFF",
  button: "#59AA6F",

  // Text
  textHeader: "#1C1C1E",   // Dark Gray
  textMain: "#3A3A3C",     // Medium Gray
  textSub: "#8E8E93",      // Light Gray
  textMuted: "#C7C7CC",    // Muted Gray
  textWhite: "#FFFFFF",

  // Functional
  success: "#34C759",
  warning: "#FFCC00",
  danger: "#FF3B30",
  border: "#E5E5EA",
  overlay: "rgba(0,0,0,0.4)",

  // UI Specific
  fullNoticeBg: "#FEF3C7",
  fullNoticeText: "#92400E",
  fullNoticeBorder: "#FDE68A",
  fullNoticeBtn: "#F59E0B",

  // Gradients (Represented as primary pairs)
  brandGradient: ["#0A84FF", "#5856D6"],
  splashGradient: ["#1C1C1E", "#2C2C2E"], // Dark modern splash
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 30,
  pill: 999,
};

export const SHADOWS = {
  light: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
};
