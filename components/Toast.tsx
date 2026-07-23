"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<(message: string, type?: ToastType) => void>(
  () => {},
);

export const useToast = () => useContext(ToastContext);

const STYLES: Record<ToastType, string> = {
  success: "border-green-600 bg-green-600 text-white",
  error: "border-red-600 bg-red-600 text-white",
  info: "border-neutral-700 bg-neutral-800 text-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = (idRef.current += 1);
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(
      () => setToasts((list) => list.filter((t) => t.id !== id)),
      3000,
    );
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg border px-4 py-2 text-sm font-medium shadow-lg ${STYLES[t.type]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
