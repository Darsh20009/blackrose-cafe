import type { ComponentType } from "react";

export type DriverId =
  | "geidea"
  | "paymob"
  | "cash"
  | "sim"
  | "mada"
  | "stcpay"
  | "alahli"
  | "alrajhi"
  | "foodicspay"
  | "neoleap"
  | "moyasar"
  | "hyperpay"
  | "tap";

export type DriverStatus = "live" | "beta" | "coming_soon";

export interface PaymentRequest {
  amount: number;
  currency: string;
  referenceId: string;
  customerPhone?: string;
  customerEmail?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  provider?: string;
  error?: string;
  raw?: any;
}

export interface PaymentCallbacks {
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export interface DriverComponentProps {
  request: PaymentRequest;
  callbacks: PaymentCallbacks;
  config: Record<string, any>;
  isTestMode: boolean;
}

export interface PaymentDriverDefinition {
  id: DriverId;
  nameEn: string;
  nameAr: string;
  color: string;
  textColor?: string;
  description: string;
  descriptionAr: string;
  status: DriverStatus;
  region: "ksa" | "gcc" | "global";
  configKeys?: string[];
  Component: ComponentType<DriverComponentProps>;
}
