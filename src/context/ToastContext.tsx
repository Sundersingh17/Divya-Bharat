"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type Toast = { id: number; message: string; type?: "ok" | "err" };
type ToastContextType = { showToast: (message: string, type?: "ok" | "err") => void };

const ToastContext = createContext<ToastContextType | undefined>(undefined);
let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "ok" | "err" = "ok") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-36 md:bottom-6 left-1/2 -translate-x-1/2 z-[120] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg animate-fadeSlideUp ${
              t.type === "err" ? "bg-red-dark text-cream" : "bg-ink text-cream"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold-soft flex-shrink-0" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
