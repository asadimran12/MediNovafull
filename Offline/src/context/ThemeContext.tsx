import React, { createContext, useContext, useState, useEffect } from "react";
import { Appearance } from "react-native";
import { lightColors, darkColors, ThemeColors } from "../constants/theme";
import storageService from "../services/StorageService";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeContextProps {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  themeMode: "system",
  isDark: false,
  colors: lightColors,
  setThemeMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [systemColorScheme, setSystemColorScheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    // Load initial theme from storage
    storageService.getAppTheme().then((savedTheme) => {
      setThemeModeState(savedTheme);
    });

    // Listen to OS theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    storageService.setAppTheme(mode);
  };

  const isDark = 
    themeMode === "dark" || 
    (themeMode === "system" && systemColorScheme === "dark");

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
