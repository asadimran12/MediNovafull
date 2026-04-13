import { Dimensions } from "react-native";
const { width, height } = Dimensions.get("window");

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;
export const SIDEBAR_WIDTH = width * 0.8;

export const lightColors = {
  // Brand Colors
  primary: "#59AA6F",
  secondary: "#30D158",      
  accent: "#5856D6",       

  // Backgrounds
  background: "#F2F2F7",   
  surface: "#FFFFFF",
  card: "#FFFFFF",
  button: "#59AA6F",

  // Text
  textHeader: "#1C1C1E",   
  textMain: "#3A3A3C",     
  textSub: "#8E8E93",      
  textMuted: "#C7C7CC",    
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
  splashGradient: ["#1C1C1E", "#2C2C2E"], 
};

export const darkColors = {
  // Brand Colors
  primary: "#59AA6F",       // Keep Brand Green consistent
  secondary: "#2EAA4F",     // Slightly darker green for contrast
  accent: "#5E5CE6",        // Lighter indigo for dark mode

  // Backgrounds
  background: "#000000",    // True black for deep dark mode
  surface: "#1C1C1E",       // Dark gray for cards/surfaces
  card: "#1C1C1E",          
  button: "#59AA6F",

  // Text
  textHeader: "#FFFFFF",    // White text
  textMain: "#EBEBF5",      // Off-white primary text
  textSub: "#EBEBF599",     // Subdued text (60% alpha)
  textMuted: "#EBEBF54D",   // Muted text (30% alpha)
  textWhite: "#FFFFFF",

  // Functional
  success: "#32D74B",       // iOS dark mode success green
  warning: "#FFD60A",       // iOS dark mode yellow
  danger: "#FF453A",        // iOS dark mode red
  border: "#38383A",        // Subtle dark border
  overlay: "rgba(0,0,0,0.7)",

  // UI Specific
  fullNoticeBg: "#2C220E",
  fullNoticeText: "#FDE68A",
  fullNoticeBorder: "#92400E",
  fullNoticeBtn: "#D97706",

  // Gradients
  brandGradient: ["#0A84FF", "#5E5CE6"],
  splashGradient: ["#000000", "#1C1C1E"], 
};

// Aliased for backward compatibility during transition
export const COLORS = lightColors;

export type ThemeColors = typeof lightColors;

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
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
};
