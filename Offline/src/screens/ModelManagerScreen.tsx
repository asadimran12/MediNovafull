import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";
import ModelService, { AIModel } from "../services/ModelService";
import LlamaService from "../services/LlamaService";

interface ModelManagerScreenProps {
  onBack: () => void;
}

export const ModelManagerScreen: React.FC<ModelManagerScreenProps> = ({ onBack }) => {
  const [models, setModels] = useState<(AIModel & { isDownloaded: boolean; isActive: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    loadStatus();
    reAttachActiveDownloads();

    return () => {
      // Unsubscribe UI callbacks when leaving the screen — download itself keeps running
      const activeIds = LlamaService.getActiveDownloadIds();
      activeIds.forEach(id => LlamaService.unsubscribeFromDownload(id));
    };
  }, []);

  const reAttachActiveDownloads = () => {
    const activeIds = LlamaService.getActiveDownloadIds();
    if (activeIds.length > 0) {
      const filename = activeIds[0]; // Re-attach to first active download
      setDownloadingId(null); // will be set from ModelService id below

      // Map filename back to model ID
      ModelService.getAvailableModels().then(models => {
        const model = models.find(m => m.filename === filename);
        if (!model) return;

        setDownloadingId(model.id);
        setIsPaused(false);

        LlamaService.subscribeToDownload(
          filename,
          (p) => setProgress(p),
          async () => {
            await loadStatus();
            setDownloadingId(null);
            setIsPaused(false);
            Alert.alert("Success", `${model.name} downloaded successfully.`);
          },
          () => {
            setDownloadingId(null);
            setIsPaused(false);
          }
        );
      });
    }
  };

  const loadStatus = async () => {
    setLoading(true);
    const all = await ModelService.getAvailableModels();
    const active = await ModelService.getActiveModel();
    
    const enriched = await Promise.all(all.map(async (m) => ({
      ...m,
      isDownloaded: await ModelService.isModelDownloaded(m.id),
      isActive: active?.id === m.id
    })));
    
    setModels(enriched);
    setLoading(false);
  };

  const handleDownload = async (model: AIModel) => {
    if (!model.downloadUrl) {
      Alert.alert(
        "Manual Setup Required", 
        `This is a custom model. Please push '${model.filename}' to your device's Documents folder manually using ADB or a file manager.`
      );
      return;
    }
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
          await loadStatus();
          setDownloadingId(null);
          setIsPaused(false);
          Alert.alert("Success", `${model.name} downloaded successfully.`);
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
      Alert.alert("Error", "Download failed.");
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

  const handleDelete = async (model: AIModel) => {
    Alert.alert(
      "Delete Model",
      `Are you sure you want to delete ${model.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            await ModelService.deleteModel(model.id);
            await loadStatus();
          } 
        }
      ]
    );
  };

  const handleActivate = async (model: AIModel) => {
    await ModelService.setActiveModel(model.id);
    await loadStatus();
    // Potentially force reload in LlamaService if it's already running
    try {
        await LlamaService.loadModel(model.filename);
        Alert.alert("Success", `${model.name} is now active.`);
    } catch (e) {
        Alert.alert("Error", "Failed to load model.");
    }
  };

  const renderModel = ({ item }: { item: typeof models[0] }) => (
    <View style={[styles.modelCard, item.isActive && styles.activeCard]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modelName}>{item.name}</Text>
          <Text style={styles.modelSize}>{item.size}</Text>
        </View>
        {item.isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.modelDesc}>{item.description}</Text>

      <View style={styles.actions}>
        {!item.isDownloaded ? (
          <>
            {downloadingId === item.id ? (
              <View style={styles.downloadProgressContainer}>
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
            ) : (
              <TouchableOpacity 
                style={[styles.btn, styles.primaryBtn]} 
                onPress={() => handleDownload(item)}
                disabled={!!downloadingId}
              >
                <Text style={styles.btnText}>Download</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {!item.isActive && (
              <TouchableOpacity 
                style={[styles.btn, styles.secondaryBtn]} 
                onPress={() => handleActivate(item)}
              >
                <Text style={styles.secondaryBtnText}>Set Active</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.btn, styles.dangerBtn]} 
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.dangerBtnText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage AI Models</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={models}
          renderItem={renderModel}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.infoText}>
              You can have multiple models downloaded and switch between them. Active model is used for all AI features.
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: SPACING.sm },
  backText: { color: COLORS.primary, fontWeight: "600", fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textHeader, marginLeft: SPACING.md },
  list: { padding: SPACING.md },
  infoText: {
    fontSize: 14,
    color: COLORS.textSub,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  modelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeCard: { borderColor: COLORS.primary, borderWidth: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.xs },
  modelName: { fontSize: 16, fontWeight: "700", color: COLORS.textMain },
  modelSize: { fontSize: 12, fontWeight: "600", color: COLORS.primary },
  activeBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  activeBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "900" },
  modelDesc: { fontSize: 13, color: COLORS.textMuted, marginBottom: SPACING.md, lineHeight: 18 },
  actions: { flexDirection: "row", gap: SPACING.sm },
  btn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: "center" },
  primaryBtn: { backgroundColor: COLORS.primary },
  secondaryBtn: { borderWidth: 1, borderColor: COLORS.primary },
  dangerBtn: { borderWidth: 1, borderColor: COLORS.danger },
  disabledBtn: { backgroundColor: COLORS.textMuted },
  btnText: { color: "#FFF", fontWeight: "700" },
  secondaryBtnText: { color: COLORS.primary, fontWeight: "700" },
  dangerBtnText: { color: COLORS.danger, fontWeight: "700" },
  downloadProgressContainer: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  progressText: { fontSize: 13, fontWeight: "600", color: COLORS.primary, marginBottom: SPACING.sm, textAlign: "center" },
  progressActions: { flexDirection: "row", justifyContent: "space-between", gap: SPACING.xs },
  controlBtn: { flex: 1, paddingVertical: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.textMuted, alignItems: "center" },
  controlBtnText: { color: COLORS.textMain, fontSize: 12, fontWeight: "600" },
  dangerBorder: { borderColor: COLORS.danger },
  dangerText: { color: COLORS.danger }
});
