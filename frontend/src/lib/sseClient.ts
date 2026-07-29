import type { SSEEvent } from "../types";

/**
 * SSE client abstraction.
 *
 * In live mode: opens `new EventSource(url)` and dispatches parsed events.
 * In mock mode: replays a static array of events at their relative
 * timestamps so the dashboard "comes alive" without a backend.
 *
 * One env switch decides mode:
 *   NEXT_PUBLIC_LIVE_SSE = "1" → live EventSource
 *   default                 → mock replay
 */

export type ConnectionMode = "mock" | "live" | "disconnected";

export interface SSEClientHandlers {
  onEvent: (event: SSEEvent) => void;
  onStatusChange: (status: ConnectionMode) => void;
  onError?: (err: unknown) => void;
}

export interface SSEClient {
  connect: (investigationId: string) => void;
  disconnect: () => void;
  setReplayingEvents: (events: SSEEvent[]) => void;
}

const LIVE_ENABLED = process.env.NEXT_PUBLIC_LIVE_SSE === "1";

/**
 * Live SSE client.
 */
function createLiveClient(handlers: SSEClientHandlers): SSEClient {
  let es: EventSource | null = null;
  let connectedId: string | null = null;

  return {
    connect(investigationId) {
      if (es) this.disconnect();
      handlers.onStatusChange("disconnected");
      const url = `/api/events/${investigationId}`;
      es = new EventSource(url);
      connectedId = investigationId;
      es.onopen = () => handlers.onStatusChange("live");
      es.onerror = (e) => {
        handlers.onStatusChange("disconnected");
        handlers.onError?.(e);
      };
      es.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data) as SSEEvent;
          handlers.onEvent(parsed);
        } catch (err) {
          handlers.onError?.(err);
        }
      };
    },
    disconnect() {
      es?.close();
      es = null;
      connectedId = null;
      handlers.onStatusChange("disconnected");
    },
    setReplayingEvents() {
      // no-op for live client
      void connectedId;
    },
  };
}

/**
 * Mock SSE client — replays an array of SSEEvents on their relative
 * timestamps. The first event fires immediately; subsequent events
 * fire at (timestamp[i] - timestamp[0]) milliseconds from connect.
 *
 * This lets the entire investigation "play back" without a backend.
 */
function createMockClient(handlers: SSEClientHandlers): SSEClient {
  let events: SSEEvent[] = [];
  let timers: ReturnType<typeof setTimeout>[] = [];
  let connected = false;

  function clearTimers() {
    for (const t of timers) clearTimeout(t);
    timers = [];
  }

  return {
    setReplayingEvents(evs) {
      events = evs;
    },
    connect() {
      clearTimers();
      if (events.length === 0) {
        handlers.onStatusChange("disconnected");
        return;
      }
      handlers.onStatusChange("mock");
      connected = true;
      const start = events[0].timestamp
        ? new Date(events[0].timestamp).getTime()
        : Date.now();
      const now = Date.now();
      const t0 = start <= now ? now : start; // if events are in the past, play them now
      for (const ev of events) {
        const evTime = new Date(ev.timestamp).getTime();
        const delay = Math.max(0, evTime - start) + (t0 - start === 0 ? (evTime - start) : 0);
        // Simpler: relative offset from event 0
        const offset = evTime - new Date(events[0].timestamp).getTime();
        const finalDelay = start <= now ? offset : Math.max(0, evTime - now);
        const t = setTimeout(() => {
          if (!connected) return;
          handlers.onEvent(ev);
        }, finalDelay);
        timers.push(t);
        void delay;
      }
      // After all events fire, mark as disconnected
      const last = events[events.length - 1];
      const lastDelay = start <= now
        ? new Date(last.timestamp).getTime() - new Date(events[0].timestamp).getTime() + 100
        : Math.max(0, new Date(last.timestamp).getTime() - now) + 100;
      timers.push(
        setTimeout(() => {
          if (connected) handlers.onStatusChange("disconnected");
        }, lastDelay)
      );
    },
    disconnect() {
      connected = false;
      clearTimers();
      handlers.onStatusChange("disconnected");
    },
  };
}

export function createSSEClient(handlers: SSEClientHandlers): SSEClient {
  return LIVE_ENABLED ? createLiveClient(handlers) : createMockClient(handlers);
}