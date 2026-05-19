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
  StatusBar,
  TextInput,
} from "react-native";
import { SPACING, RADIUS, SHADOWS } from "../constants/theme";
import ModelService, { AIModel } from "../services/ModelService";
import LlamaService from "../services/LlamaService";
import StorageService from "../services/StorageService";
import { BACKEND_URL } from "@env";
interface ModelManagerScreenProps {
  onBack: () => void;
}

export const ModelManagerScreen: React.FC<ModelManagerScreenProps> = ({ onBack }) => {
  const { colors: COLORS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  const [models, setModels] = useState<(AIModel & { isDownloaded: boolean; isActive: boolean; isUnlocked: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const [isPaused, setIsPaused] = useState(false);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);

  // States for Custom Modals
  const [deleteConfirmModel, setDeleteConfirmModel] = useState<AIModel | null>(null);
  const [infoAlert, setInfoAlert] = useState<{ title: string; message: string; type: "success" | "error" | "info" } | null>(null);

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPaidModel, setSelectedPaidModel] = useState<AIModel | null>(null);
  const [cardNumber, setCardNumber] = useState("4242424242424242");
  const [expMonth, setExpMonth] = useState("12");
  const [expYear, setExpYear] = useState("2026");
  const [cvc, setCvc] = useState("123");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadStatus();
    fetchRecommendation();
    reAttachActiveDownloads();

    return () => {
      const activeIds = LlamaService.getActiveDownloadIds();
      activeIds.forEach(id => LlamaService.unsubscribeFromDownload(id));
    };
  }, []);

  const reAttachActiveDownloads = () => {
    const activeIds = LlamaService.getActiveDownloadIds();
    if (activeIds.length > 0) {
      const filename = activeIds[0];
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
      isActive: active?.id === m.id,
      isUnlocked: await StorageService.isModelUnlocked(m.id)
    })));

    setModels(enriched);
    setLoading(false);
  };

  const fetchRecommendation = async () => {
    const recId = await ModelService.getRecommendedModelId();
    setRecommendedId(recId);
  };

  const handleDownload = async (model: AIModel & { isUnlocked?: boolean }) => {
    const unlocked = await StorageService.isModelUnlocked(model.id);
    if (model.plan === "paid" && !unlocked) {
      setSelectedPaidModel(model);
      setShowSubscriptionModal(true);
      return;
    }
    if (!model.downloadUrl) {
      setInfoAlert({
        title: "Manual Setup Required",
        message: `Please push '${model.filename}' to your device manually.`,
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
    } catch (err) {
      setDownloadingId(null);
      setIsPaused(false);
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

  const submitPayment = async () => {
    if (!selectedPaidModel) return;
    setIsProcessing(true);

    try {
      const username = await StorageService.getPrimaryUsername();

      const payload = {
        username: username || "guest",
        name: selectedPaidModel.MiniName,
        price: selectedPaidModel.price,
        card_number: cardNumber,
        exp_month: parseInt(expMonth),
        exp_year: parseInt(expYear),
        cvc: cvc
      };

      const response = await fetch(`${BACKEND_URL}/users/Addpayment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        await StorageService.unlockModel(selectedPaidModel.id, "paid", selectedPaidModel.price || 0);
        setInfoAlert({ title: "Success!", message: "Payment successful. You unlocked the model!", type: "success" });
        setShowSubscriptionModal(false);
        // Start the download now that it is paid for!
        setDownloadingId(selectedPaidModel.id);
        setProgress(0);
        setIsPaused(false);
        await LlamaService.downloadModel(
          selectedPaidModel.filename,
          selectedPaidModel.downloadUrl,
          (p) => setProgress(p),
          async () => {
            await loadStatus();
            setDownloadingId(null);
            setIsPaused(false);
            setInfoAlert({ title: "Success", message: `${selectedPaidModel.name} downloaded successfully.`, type: "success" });
          },
          () => {
            setDownloadingId(null);
            setIsPaused(false);
          }
        );
        setSelectedPaidModel(null);
      } else {
        setInfoAlert({ title: "Payment Failed", message: data.message, type: "error" });
      }
    } catch (error) {
      setInfoAlert({ title: "Network Error", message: "Could not reach the server. Is the backend running?", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (model: AIModel) => {
    setDeleteConfirmModel(model);
  };

  const handleActivate = async (model: AIModel) => {
    await ModelService.setActiveModel(model.id);
    await loadStatus();
    try {
      await LlamaService.loadModel(model.filename);
      setInfoAlert({ title: "Model Activated", message: `${model.name} is now ready to use.`, type: "success" });
    } catch (e) {
      setInfoAlert({ title: "Error", message: "Failed to load model into memory.", type: "error" });
    }
  };

  const renderModel = ({ item }: { item: typeof models[0] }) => (
    <View style={[styles.modelCard, item.isActive && styles.activeCard]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modelName}>{item.MiniName}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.modelSize}>📦 {item.size}</Text>
            {item.plan === "paid" ? (
              item.isUnlocked ? (
                <View style={[styles.recTag, { backgroundColor: '#D1FAE5' }]}>
                  <Text style={[styles.recTagText, { color: '#10B981' }]}>✅ PURCHASED</Text>
                </View>
              ) : (
                <View style={[styles.recTag, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.recTagText, { color: '#EF4444' }]}>💎 ${item.price}</Text>
                </View>
              )
            ) : (
              <View style={[styles.recTag, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.recTagText, { color: '#10B981' }]}>🆓 FREE</Text>
              </View>
            )}
            {recommendedId === item.id && (
              <View style={styles.recTag}>
                <Text style={styles.recTagText}>RECOMMENDED</Text>
              </View>
            )}
          </View>
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
          downloadingId === item.id ? (
            <View style={styles.downloadProgressContainer}>
              <View style={styles.progressTop}>
                <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
                <Text style={styles.progressStatus}>{isPaused ? "Paused" : "Downloading..."}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <View style={styles.progressActions}>
                <TouchableOpacity style={styles.miniBtn} onPress={() => isPaused ? handleResume(item) : handlePause(item)}>
                  <Text style={styles.miniBtnText}>{isPaused ? "▶ Resume" : "⏸ Pause"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniBtn, styles.dangerBorder]} onPress={() => handleCancelDownload(item)}>
                  <Text style={[styles.miniBtnText, styles.dangerText]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleDownload(item)} disabled={!!downloadingId}>
              <Text style={styles.btnText}>
                {item.plan === "paid" && !item.isUnlocked ? `Unlock for $${item.price}` : "Download AI Model"}
              </Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.downloadedActions}>
            {!item.isActive ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleActivate(item)}>
                <Text style={styles.secondaryBtnText}>Set as Active</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>Currently in Use</Text>
              </View>
            )}
            <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDelete(item)}>
              <Text style={{ fontSize: 18 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Premium Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {onBack && (
            <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
              <View style={styles.backButtonPrimary}>
                <Text style={styles.backButtonTextWhite}>‹ Back</Text>
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>AI Model Manager</Text>
          </View>
          <View style={{ width: 70 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Checking local models...</Text>
        </View>
      ) : (
        <FlatList
          data={models}
          renderItem={renderModel}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.tipCard}>
                <Text style={styles.tipTitle}>💡 AI Memory Tip</Text>
                <Text style={styles.tipText}>
                  Active models are loaded into RAM. If the app feels slow, use the Recommended model for your device.
                </Text>
              </View>
              <Text style={styles.sectionTitle}>Available Models</Text>
            </View>
          }
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal transparent visible={deleteConfirmModel !== null} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>🗑️</Text>
            </View>
            <Text style={styles.modalTitle}>Delete AI Model?</Text>
            <Text style={styles.modalSubtitle}>This will remove {deleteConfirmModel?.name} from your device storage. You can re-download it later.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setDeleteConfirmModel(null)}>
                <Text style={styles.modalBtnCancelText}>Keep it</Text>
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

      {/* Info Alert Modal */}
      <Modal transparent visible={infoAlert !== null} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconContainer, { backgroundColor: infoAlert?.type === 'success' ? '#D1FAE5' : '#FEE2E2' }]}>
              <Text style={styles.modalIcon}>{infoAlert?.type === 'success' ? '✅' : 'ℹ️'}</Text>
            </View>
            <Text style={styles.modalTitle}>{infoAlert?.title}</Text>
            <Text style={styles.modalSubtitle}>{infoAlert?.message}</Text>
            <TouchableOpacity style={styles.modalBtnOk} onPress={() => setInfoAlert(null)}>
              <Text style={styles.modalBtnOkText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Subscription Modal */}
      <Modal
        visible={showSubscriptionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSubscriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { padding: 20, paddingTop: 30 }]}>
            <TouchableOpacity
              style={{ position: 'absolute', top: 15, right: 15 }}
              onPress={() => setShowSubscriptionModal(false)}
            >
              <Text style={{ fontSize: 24, color: COLORS.textMuted }}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Unlock Premium Model</Text>

            <View style={{ width: '100%', marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textMain }}>{selectedPaidModel?.MiniName}</Text>
              <Text style={{ fontSize: 14, color: COLORS.primary, fontWeight: '700', marginTop: 4 }}>Price: ${selectedPaidModel?.price}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textMain, marginBottom: 8 }}>Card Number</Text>
              <TextInput
                style={styles.inputField}
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="numeric"
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textMain, marginBottom: 8 }}>Exp Month</Text>
                  <TextInput
                    style={styles.inputField}
                    value={expMonth}
                    onChangeText={setExpMonth}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textMain, marginBottom: 8 }}>Exp Year</Text>
                  <TextInput
                    style={styles.inputField}
                    value={expYear}
                    onChangeText={setExpYear}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textMain, marginBottom: 8 }}>CVC</Text>
                  <TextInput
                    style={styles.inputField}
                    value={cvc}
                    onChangeText={setCvc}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 25 }]}
                onPress={submitPayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnText}>Pay ${selectedPaidModel?.price} & Download</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.light,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...SHADOWS.light,
  },
  backButtonTextWhite: { fontSize: 16, color: "#fff", fontWeight: "700" },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: "900", color: COLORS.textHeader, letterSpacing: -0.5 },

  list: { padding: 20, paddingBottom: 40 },
  listHeader: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 },

  tipCard: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 16, padding: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  tipTitle: { fontSize: 15, fontWeight: "800", color: '#3B82F6', marginBottom: 4 },
  tipText: { fontSize: 13, color: COLORS.textSub, lineHeight: 18, opacity: 0.9 },

  modelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeCard: { borderColor: COLORS.primary, borderWidth: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, alignItems: "flex-start" },
  modelName: { fontSize: 18, fontWeight: "800", color: COLORS.textHeader, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modelSize: { fontSize: 13, fontWeight: "700", color: COLORS.primary },

  recTag: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  recTagText: { fontSize: 10, fontWeight: "900", color: '#92400E' },

  activeBadge: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  activeBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "900" },

  modelDesc: { fontSize: 14, color: COLORS.textSub, marginBottom: 20, lineHeight: 20 },

  actions: { width: '100%' },
  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },

  downloadedActions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: { flex: 1, backgroundColor: COLORS.background, paddingVertical: 6, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  secondaryBtnText: { color: COLORS.textHeader, fontWeight: "800", fontSize: 13 },

  activePill: { flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingVertical: 6, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: '#10B981' },
  activePillText: { color: '#10B981', fontWeight: "800", fontSize: 13 },

  deleteIconBtn: { width: 42, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },

  downloadProgressContainer: { width: '100%' },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressPercent: { fontSize: 18, fontWeight: "900", color: COLORS.primary },
  progressStatus: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted },
  progressBarBg: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, marginBottom: 16, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary },
  progressActions: { flexDirection: 'row', gap: 10 },
  miniBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  miniBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.textHeader },
  dangerBorder: { borderColor: '#FEE2E2' },
  dangerText: { color: '#EF4444' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textMuted, fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContainer: { width: "100%", backgroundColor: COLORS.surface, borderRadius: 24, padding: 30, alignItems: "center" },
  modalIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(239, 68, 68, 0.15)", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  modalIcon: { fontSize: 28 },
  modalTitle: { fontSize: 22, fontWeight: "900", color: COLORS.textHeader, marginBottom: 10, textAlign: "center" },
  modalSubtitle: { fontSize: 15, color: COLORS.textSub, textAlign: "center", marginBottom: 30, lineHeight: 22 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtnCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.background, alignItems: "center" },
  modalBtnCancelText: { fontSize: 15, fontWeight: "700", color: COLORS.textHeader },
  modalBtnDelete: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#EF4444', alignItems: "center" },
  modalBtnDeleteText: { fontSize: 15, fontWeight: "800", color: "#FFF" },
  modalBtnOk: { width: "100%", paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: "center" },
  modalBtnOkText: { fontSize: 15, fontWeight: "800", color: "#FFF" },
  inputField: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.textMain,
    backgroundColor: COLORS.background,
    width: '100%'
  }
});
