import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Animated,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { COLORS, RADIUS, SPACING } from "../constants/theme";

interface SplashScreenProps {
  status: string;
  progress?: number; // 0-100
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ status, progress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Progress bar width animation
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (progress !== undefined) {
      Animated.timing(progressWidth, {
        toValue: progress,
        duration: 200,
        useNativeDriver: false, // width doesn't support native driver
      }).start();
    }
  }, [progress]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <Animated.View 
        style={[
          styles.content, 
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}
      >
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoIcon}>✚</Text>
        </View>
        <Text style={styles.brandName}>MediNova</Text>
        <Text style={styles.tagline}>Your Private AI Health Assistant</Text>
      </Animated.View>

      <View style={styles.footer}>
        {progress !== undefined && progress < 100 ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
               <Animated.View 
                 style={[
                   styles.progressBarFill, 
                   { 
                     width: progressWidth.interpolate({
                       inputRange: [0, 100],
                       outputRange: ['0%', '100%']
                     }) 
                   }
                 ]} 
               />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}% Downloaded</Text>
          </View>
        ) : (
          <ActivityIndicator color={COLORS.primary} size="small" style={{ marginBottom: 10 }} />
        )}
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1C1E", // Dark premium background
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 50,
    color: "#FFF",
    fontWeight: "300",
  },
  brandName: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  footer: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
    width: '100%',
    paddingHorizontal: 40,
  },
  statusText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 10,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
  }
});
