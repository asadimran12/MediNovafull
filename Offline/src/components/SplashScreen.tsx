import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Animated,
  StatusBar,
  ActivityIndicator,
  Image,
} from "react-native";
import { COLORS } from "../constants/theme";

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
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}
      >
        <Image
          source={require('../assets/images/splash_logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
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
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginBottom: 10 }} />
        )}
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // White background
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
  },
  logoImage: {
    width: 250, // Big size logo
    height: 250,
  },
  footer: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
    width: '100%',
    paddingHorizontal: 40,
  },
  statusText: {
    color: "#000000", // Black text
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 10,
    textAlign: "center",
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)', // Light gray background for contrast
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    color: "#000000", // Black text
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
  }
});
