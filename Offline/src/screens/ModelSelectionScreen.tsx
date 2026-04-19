import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import { SPACING, RADIUS, SHADOWS } from "../constants/theme";
import ModelService, { AIModel } from "../services/ModelService";
import LlamaService, { ProgressCallback } from "../services/LlamaService";

interface ModelSelectionScreenProps {
  onComplete: () => void;
}

export const ModelSelectionScreen: React.FC<ModelSelectionScreenProps> = ({ onComplete }) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  const [models, setModels] = useState<(AIModel & { isDownloaded: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [guideVisible, setGuideVisible] = useState(false);

  const [isPaused, setIsPaused] = useState(false);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
    fetchRecommendation();
  }, []);

  const fetchRecommendation = async () => {
    const recId = await ModelService.getRecommendedModelId();
    setRecommendedId(recId);
  };

  const loadModels = async () => {
    const available = await ModelService.getAvailableModels();
    const enriched = await Promise.all(available.map(async (m) => ({
      ...m,
      isDownloaded: await ModelService.isModelDownloaded(m.id)
    })));
    setModels(enriched);
    setLoading(false);
  };

  const handleUseLocal = async (model: AIModel) => {
    await ModelService.setActiveModel(model.id);
    onComplete();
  };

  const handleDownload = async (model: AIModel) => {
    setDownloadingId(model.id);
    setProgress(0);
    setIsPaused(false);
    try {
      await LlamaService.downloadModel(
        model.filename, 
        model.downloadUrl, 
        (p) => {
          setProgress(p);
        },
        async () => {
          await ModelService.setActiveModel(model.id);
          setDownloadingId(null);
          setIsPaused(false);
          Alert.alert("Success", `${model.name} downloaded and set as active.`);
          onComplete();
        },
        (err) => {
          setDownloadingId(null);
          setIsPaused(false);
          Alert.alert("Error", "Download failed or canceled.");
        }
      );
    } catch (err) {
      setDownloadingId(null);
      setIsPaused(false);
      Alert.alert("Error", "Download failed. Please check your connection.");
    }
  };

  const handlePause = (model: AIModel) => {
    LlamaService.pauseDownload(model.filename);
    setIsPaused(true);
  };

  const handleResume = (model: AIModel) => {
    LlamaService.resumeDownload(model.filename);
    setIsPaused(false);
  };

  const handleCancelDownload = (model: AIModel) => {
    LlamaService.cancelDownload(model.filename);
    setDownloadingId(null);
    setProgress(0);
    setIsPaused(false);
  };

  const renderModel = ({ item }: { item: typeof models[0] }) => (
    <View style={styles.modelCard}>
      <View style={styles.modelInfo}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={styles.modelName} numberOfLines={1}>{item.name}</Text>
          {recommendedId === item.id && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedBadgeText}>⭐ BEST CHOICE</Text>
            </View>
          )}
        </View>
        <Text style={styles.modelSize}>{item.size}</Text>
        {item.isDownloaded && (
          <View style={[styles.recommendedBadge, { backgroundColor: COLORS.success, marginBottom: 8 }]}>
            <Text style={styles.recommendedBadgeText}>✓ DOWNLOADED</Text>
          </View>
        )}
        <Text style={styles.modelDesc}>{item.description}</Text>
      </View>
      
      {downloadingId === item.id ? (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {isPaused ? `Paused at ${Math.round(progress || 0)}%` : `Downloading ${Math.round(progress || 0)}%`}
          </Text>
          <View style={styles.progressActions}>
             {isPaused ? (
               <TouchableOpacity style={[styles.controlBtn]} onPress={() => handleResume(item)}>
                  <Text style={styles.controlBtnText}>Resume</Text>
               </TouchableOpacity>
             ) : (
               <TouchableOpacity style={[styles.controlBtn]} onPress={() => handlePause(item)}>
                  <Text style={styles.controlBtnText}>Pause</Text>
               </TouchableOpacity>
             )}
             <TouchableOpacity style={[styles.controlBtn, styles.dangerBorder]} onPress={() => handleCancelDownload(item)}>
                <Text style={[styles.controlBtnText, styles.dangerText]}>Cancel</Text>
             </TouchableOpacity>
          </View>
        </View>
      ) : item.isDownloaded ? (
        <TouchableOpacity 
          style={[styles.downloadBtn, { backgroundColor: COLORS.success }]} 
          onPress={() => handleUseLocal(item)}
        >
          <Text style={styles.downloadBtnText}>Use This Model</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.downloadBtn} 
          onPress={() => handleDownload(item)}
          disabled={!!downloadingId}
        >
          <Text style={styles.downloadBtnText}>Download & Use</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.guideBtn} onPress={() => setGuideVisible(true)}>
          <Text style={styles.guideBtnEmoji}>📖</Text>
          <Text style={styles.guideBtnText}>How it works</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Welcome to MediNova</Text>
      <Text style={styles.subtitle}>
        To provide 100% private medical guidance offline, we need to download an AI model directly to your device.
      </Text>

      {recommendedId && (
        <View style={styles.recommendationBanner}>
          <Text style={styles.recommendationText}>
            💡 Based on your phone's hardware, we recommend the 
            <Text style={{ fontWeight: '800' }}> {models.find(m => m.id === recommendedId)?.name} </Text> 
            for the best experience.
          </Text>
        </View>
      )}

      <FlatList
        data={models}
        renderItem={renderModel}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.skipBtn} onPress={onComplete} disabled={!!downloadingId}>
        <Text style={styles.skipBtnText}>Skip and go to Dashboard</Text>
      </TouchableOpacity>

      <Modal
        visible={guideVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGuideVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How MediNova Works</Text>
              <TouchableOpacity onPress={() => setGuideVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.guideStep}>
                <Text style={styles.stepNumber}>1</Text>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>Choose a Model</Text>
                  <Text style={styles.stepDesc}>Pick an AI model based on your device's performance. Larger models are smarter but slower.</Text>
                </View>
              </View>

              <View style={styles.guideStep}>
                <Text style={styles.stepNumber}>2</Text>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>Offline Processing</Text>
                  <Text style={styles.stepDesc}>Once downloaded, your AI works entirely without internet. No data ever leaves your phone.</Text>
                </View>
              </View>

              <View style={styles.guideStep}>
                <Text style={styles.stepNumber}>3</Text>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>Health Insights</Text>
                  <Text style={styles.stepDesc}>Generate diet plans, exercise routines, and analyze reports with medical-grade privacy.</Text>
                </View>
              </View>

              <View style={styles.guideStep}>
                <Text style={styles.stepNumber}>4</Text>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>Manage Anytime</Text>
                  <Text style={styles.stepDesc}>You can always delete models or download new ones from the App Settings.</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.gotItBtn} 
                onPress={() => setGuideVisible(false)}
              >
                <Text style={styles.gotItBtnText}>Got it!</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textHeader,
    textAlign: "center",
    marginTop: SPACING.xl,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: "center",
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  recommendationBanner: {
    backgroundColor: COLORS.primary + "15",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + "30",
  },
  recommendationText: {
    color: COLORS.textMain,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    gap: SPACING.md,
  },
  modelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modelInfo: {
    marginBottom: SPACING.md,
  },
  modelName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textMain,
    flex: 1,
  },
  recommendedBadge: { 
    backgroundColor: "#FFB020", 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: RADIUS.pill || 20,
    flexDirection: "row",
    alignItems: "center"
  },
  recommendedBadgeText: { 
    color: "#FFF", 
    fontSize: 10, 
    fontWeight: "900" 
  },
  modelSize: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 8,
  },
  modelDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  downloadBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  downloadBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  progressContainer: {
    height: 40,
    backgroundColor: "#F1F5F9",
    borderRadius: RADIUS.md,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  progressBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.success + "44",
  },
  progressText: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.textMain,
  },
  skipBtn: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  skipBtnText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: SPACING.md,
  },
  guideBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  guideBtnEmoji: { fontSize: 16, marginRight: 8 },
  guideBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: COLORS.textHeader },
  closeIcon: { fontSize: 20, color: COLORS.textSub, padding: 5 },
  guideStep: {
    flexDirection: "row",
    marginBottom: SPACING.xl,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + "22",
    color: COLORS.primary,
    textAlign: "center",
    lineHeight: 32,
    fontWeight: "bold",
    fontSize: 16,
    marginRight: SPACING.md,
  },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: 17, fontWeight: "bold", color: COLORS.textHeader, marginBottom: 4 },
  stepDesc: { fontSize: 14, color: COLORS.textMain, lineHeight: 20 },
  gotItBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  gotItBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  progressActions: { flexDirection: "row", justifyContent: "space-between", gap: SPACING.xs, marginTop: SPACING.sm },
  controlBtn: { flex: 1, paddingVertical: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.textMuted, alignItems: "center" },
  controlBtnText: { color: COLORS.textMain, fontSize: 12, fontWeight: "600" },
  dangerBorder: { borderColor: COLORS.danger },
  dangerText: { color: COLORS.danger }
});
