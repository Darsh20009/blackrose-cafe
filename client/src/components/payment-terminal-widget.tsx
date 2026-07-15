import { Suspense } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { getDriver } from "@/lib/payment-terminal/registry";
import type { DriverId, PaymentRequest, PaymentCallbacks } from "@/lib/payment-terminal/types";

interface PaymentTerminalWidgetProps {
  driverId: DriverId;
  request: PaymentRequest;
  callbacks: PaymentCallbacks;
  businessConfig?: Record<string, any>;
  isTestMode?: boolean;
}

export default function PaymentTerminalWidget({
  driverId,
  request,
  callbacks,
  businessConfig = {},
  isTestMode = false,
}: PaymentTerminalWidgetProps) {
  const driver = getDriver(driverId);

  if (!driver) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 bg-red-50 rounded-xl border border-red-200">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="font-semibold text-red-700">Driver غير موجود: {driverId}</p>
        <p className="text-sm text-muted-foreground">يرجى التحقق من إعدادات بوابة الدفع</p>
      </div>
    );
  }

  const DriverComponent = driver.Component;

  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-4 p-10 bg-primary/5 rounded-xl border border-primary/20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="font-semibold text-sm text-muted-foreground">جاري تحميل بوابة {driver.nameAr}...</p>
        </div>
      }
    >
      <DriverComponent
        request={request}
        callbacks={callbacks}
        config={{ ...businessConfig, driverId }}
        isTestMode={isTestMode}
      />
    </Suspense>
  );
}
