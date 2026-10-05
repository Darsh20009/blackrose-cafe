import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type AuthModalMode = "guest" | "login" | "register" | "whatsapp";
export type AuthModalPurpose = "order" | "account";

interface AuthModalState {
  open: boolean;
  onSuccess?: () => void;
  initialMode?: AuthModalMode;
  purpose?: AuthModalPurpose;
}

interface AuthModalContextType {
  state: AuthModalState;
  openAuthModal: (opts?: {
    onSuccess?: () => void;
    initialMode?: AuthModalMode;
    purpose?: AuthModalPurpose;
  }) => void;
  closeAuthModal: () => void;
  triggerSuccess: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthModalState>({ open: false });

  const openAuthModal = useCallback((opts?: {
    onSuccess?: () => void;
    initialMode?: AuthModalMode;
    purpose?: AuthModalPurpose;
  }) => {
    setState({
      open: true,
      onSuccess: opts?.onSuccess,
      initialMode: opts?.initialMode ?? (opts?.purpose === "account" ? "whatsapp" : "guest"),
      purpose: opts?.purpose ?? "order",
    });
  }, []);

  const closeAuthModal = useCallback(() => {
    setState((prev) => ({ open: false, onSuccess: prev.onSuccess }));
  }, []);

  const triggerSuccess = useCallback(() => {
    setState((prev) => {
      prev.onSuccess?.();
      return { open: false };
    });
  }, []);

  return (
    <AuthModalContext.Provider value={{ state, openAuthModal, closeAuthModal, triggerSuccess }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
