import { create } from "zustand";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "mock"
  | "live"
  | "disconnected"
  | "error";

interface ConnectionStoreState {
  status: ConnectionStatus;
  detail: string | null;
  eventsReceived: number;
  lastEventAt: string | null;
  setStatus: (status: ConnectionStatus, detail?: string | null) => void;
  recordEvent: (timestamp: string) => void;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionStoreState>((set) => ({
  status: "idle",
  detail: null,
  eventsReceived: 0,
  lastEventAt: null,
  setStatus(status, detail = null) {
    set({ status, detail });
  },
  recordEvent(timestamp) {
    set((s) => ({
      eventsReceived: s.eventsReceived + 1,
      lastEventAt: timestamp,
    }));
  },
  reset() {
    set({
      status: "idle",
      detail: null,
      eventsReceived: 0,
      lastEventAt: null,
    });
  },
}));