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
  ScrollView,
  Modal,
} from "react-native";
import { SPACING, RADIUS, SHADOWS } from "../constants/theme";
import ModelService, { AIModel } from "../services/ModelService";
import LlamaService from "../services/LlamaService";

interface ModelManagerScreenProps {
  onBack: () => void;
}

export const ModelManagerScreen: React.FC<ModelManagerScreenProps> = ({ onBack }) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  const [models, setModels] = useState<(AIModel & { isDownloaded: boolean; isActive: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const [isPaused, setIsPaused] = useState(false);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);

  // States for Custom Modals
  const [deleteConfirmModel, setDeleteConfirmModel] = useState<AIModel | null>(null);
  const [infoAlert, setInfoAlert] = useState<{ title: string; message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    loadStatus();
    fetchRecommendation();
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
            setInfoAlert({ title: "Success", message: `${model.name} downloaded successfully.`, type: "success" });
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

  const fetchRecommendation = async () => {
    const recId = await ModelService.getRecommendedModelId();
    setRecommendedId(recId);
  };

  const handleDownload = async (model: AIModel) => {
    if (!model.downloadUrl) {
      setInfoAlert({
        title: "Manual Setup Required",
        message: `This is a custom model. Please push '${model.filename}' to your device's Documents folder manually using ADB or a file manager.`,
        type: "info"
      });
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
          setInfoAlert({ title: "Success", message: `${model.name} downloaded successfully.`, type: "success" });
        },
        (err) => {
          setDownloadingId(null);
          setIsPaused(false);
          setInfoAlert({ title: "Error", message: "Download failed or canceled.", type: "error" });
        }
      );
    } catch (err) {
      setDownloadingId(null);
      setIsPaused(false);
      setInfoAlert({ title: "Error", message: "Download failed.", type: "error" });
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
    setDeleteConfirmModel(model);
  };

  const handleActivate = async (model: AIModel) => {
    await ModelService.setActiveModel(model.id);
    await loadStatus();
    try {
      await LlamaService.loadModel(model.filename);
      setInfoAlert({ title: "Success", message: `${model.name} is now active.`, type: "success" });
    } catch (e) {
      setInfoAlert({ title: "Error", message: "Failed to load model.", type: "error" });
    }
  };

  const renderModel = ({ item }: { item: typeof models[0] }) => (
    <View style={[styles.modelCard, item.isActive && styles.activeCard]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.modelName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.modelSize}>{item.size}</Text>
        </View>
        <View style={styles.badgeContainer}>
          {item.isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          )}
          {recommendedId === item.id && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.activeBadgeText}>⭐ RECOMMENDED</Text>
            </View>
          )}
        </View>
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

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={models}
          renderItem={renderModel}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <Text style={styles.infoText}>
                You can have multiple models downloaded and switch between them. Active model is used for all AI features.
              </Text>
              {recommendedId && (
                <View style={[styles.infoText, { backgroundColor: COLORS.primary + '11', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#FFB020' }]}>
                  <Text style={{ fontWeight: 'bold', color: COLORS.textHeader, marginBottom: 4 }}>💡 Device Optimization Hint</Text>
                  <Text style={{ fontSize: 13, color: COLORS.textSub }}>
                    Based on your {Math.round(1)} GB detected RAM, we recommend using the
                    <Text style={{ fontWeight: 'bold' }}> {models.find(m => m.id === recommendedId)?.name.split('-')[0]} </Text>
                    for smooth performance.
                  </Text>
                </View>
              )}
            </View>
          }
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        transparent={true}
        visible={deleteConfirmModel !== null}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmModel(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>🗑️</Text>
            </View>
            <Text style={styles.modalTitle}>Delete Model?</Text>
            <Text style={styles.modalSubtitle}>Are you sure you want to delete {deleteConfirmModel?.name}? You will have to re-download it to use it again.</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setDeleteConfirmModel(null)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnDelete} onPress={async () => {
                if (deleteConfirmModel) {
                  await ModelService.deleteModel(deleteConfirmModel.id);
                  await loadStatus();
                  setDeleteConfirmModel(null);
                }
              }}>
                <Text style={styles.modalBtnDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Info/Success/Error Modal */}
      <Modal
        transparent={true}
        visible={infoAlert !== null}
        animationType="fade"
        onRequestClose={() => setInfoAlert(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconContainer, { backgroundColor: infoAlert?.type === 'success' ? '#27AE6015' : infoAlert?.type === 'error' ? '#FF3B3015' : '#4A90E215' }]}>
              <Text style={styles.modalIcon}>
                {infoAlert?.type === 'success' ? '✅' : infoAlert?.type === 'error' ? '❌' : 'ℹ️'}
              </Text>
            </View>
            <Text style={styles.modalTitle}>{infoAlert?.title}</Text>
            <Text style={styles.modalSubtitle}>{infoAlert?.message}</Text>
            
            <TouchableOpacity style={styles.modalBtnOk} onPress={() => setInfoAlert(null)}>
              <Text style={styles.modalBtnOkText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const createStyles = (COLORS: any) => StyleSheet.create({
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SPACING.xs },
  badgeContainer: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "40%" },
  modelName: { fontSize: 16, fontWeight: "700", color: COLORS.textMain, flex: 1 },
  modelSize: { fontSize: 12, fontWeight: "600", color: COLORS.primary },
  activeBadge: {
    backgroundColor: COLORS.success || "#27AE60",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill || 20,
    flexDirection: "row",
    alignItems: "center"
  },
  recommendedBadge: {
    backgroundColor: "#FFB020",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill || 20,
    flexDirection: "row",
    alignItems: "center"
  },
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
  dangerText: { color: COLORS.danger },

  // Modal Custom Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: "center",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  modalIcon: {
    fontSize: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textHeader,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: "center",
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textMain,
  },
  modalBtnDelete: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.danger || "#FF3B30",
    alignItems: "center",
    shadowColor: COLORS.danger || "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalBtnDeleteText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFF",
  },
  modalBtnOk: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  modalBtnOkText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFF",
  }
});
