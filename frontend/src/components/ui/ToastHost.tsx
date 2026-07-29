"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/cn";

const iconMap = {
  info: InformationCircleIcon,
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
};

const toneClasses = {
  info: "border-agent-sensing/40 bg-bg-surface text-ink-primary",
  success: "border-sev-low/40 bg-bg-surface text-ink-primary",
  warning: "border-sev-moderate/40 bg-bg-surface text-ink-primary",
  error: "border-sev-critical/40 bg-bg-surface text-ink-primary",
};

export function ToastHost() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);

  // Auto-dismiss is handled in store. This component is presentational.
  useEffect(() => {
    void toasts;
  }, [toasts]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = iconMap[t.tone];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
              className={cn(
                "pointer-events-auto flex items-start gap-2.5 px-3 py-2 border rounded min-w-[280px] max-w-[400px]",
                "shadow-panel",
                toneClasses[t.tone]
              )}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{t.title}</div>
                {t.body && (
                  <div className="text-xs text-ink-secondary mt-0.5">
                    {t.body}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-ink-tertiary hover:text-ink-primary transition-colors"
                aria-label="Dismiss"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}