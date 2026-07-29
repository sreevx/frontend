import { create } from "zustand";

interface UIStoreState {
  approvalModalOpen: boolean;
  reportViewerOpen: boolean;
  evidenceDrawerOpen: boolean;
  reasoningPanelOpen: boolean;
  showAllEvents: boolean;
  showScenarioPicker: boolean;
  toasts: Array<{
    id: string;
    title: string;
    body?: string;
    tone: "info" | "success" | "warning" | "error";
    createdAt: number;
  }>;

  openApprovalModal: () => void;
  closeApprovalModal: () => void;
  openReportViewer: () => void;
  closeReportViewer: () => void;
  toggleEvidenceDrawer: () => void;
  toggleReasoningPanel: () => void;
  toggleShowAllEvents: () => void;
  setShowScenarioPicker: (b: boolean) => void;
  pushToast: (t: Omit<UIStoreState["toasts"][number], "id" | "createdAt">) => void;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  approvalModalOpen: false,
  reportViewerOpen: false,
  evidenceDrawerOpen: false,
  reasoningPanelOpen: true,
  showAllEvents: false,
  showScenarioPicker: false,
  toasts: [],

  openApprovalModal() {
    set({ approvalModalOpen: true });
  },
  closeApprovalModal() {
    set({ approvalModalOpen: false });
  },
  openReportViewer() {
    set({ reportViewerOpen: true });
  },
  closeReportViewer() {
    set({ reportViewerOpen: false });
  },
  toggleEvidenceDrawer() {
    set((s) => ({ evidenceDrawerOpen: !s.evidenceDrawerOpen }));
  },
  toggleReasoningPanel() {
    set((s) => ({ reasoningPanelOpen: !s.reasoningPanelOpen }));
  },
  toggleShowAllEvents() {
    set((s) => ({ showAllEvents: !s.showAllEvents }));
  },
  setShowScenarioPicker(b) {
    set({ showScenarioPicker: b });
  },
  pushToast(t) {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({
      toasts: [...s.toasts, { ...t, id, createdAt: Date.now() }],
    }));
    // Auto-dismiss after 5s
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 5000);
  },
  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },
}));