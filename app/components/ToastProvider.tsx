"use client";

import { createContext, useContext, useState } from "react";

type Toast = { id: number; message: string; type: "success" | "error" };
const ToastContext = createContext<(message: string, type?: Toast["type"]) => void>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  function showToast(message: string, type: Toast["type"] = "success") {
    const id = Date.now();
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3500);
  }
  return <ToastContext.Provider value={showToast}>{children}<div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div className={`toast ${toast.type}`} key={toast.id}>{toast.message}</div>)}</div></ToastContext.Provider>;
}

export function useToast() { return useContext(ToastContext); }
