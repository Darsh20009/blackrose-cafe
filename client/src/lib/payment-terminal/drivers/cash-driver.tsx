import { useState } from "react";
import { Banknote, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DriverComponentProps } from "../types";

export default function CashDriver({ request, callbacks }: DriverComponentProps) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    await new Promise(r => setTimeout(r, 600));
    setDone(true);
    callbacks.onSuccess({ success: true, provider: "cash", transactionId: `CASH-${request.referenceId}` });
  };

  if (done) return (
    <div className="flex flex-col items-center gap-4 p-8 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200">
      <CheckCircle className="w-14 h-14 text-green-500" />
      <p className="font-bold text-xl text-green-700">تم استلام النقد</p>
      <p className="text-muted-foreground text-sm">المبلغ: {request.amount.toFixed(2)} ر.س</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-5 p-8 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
        <Banknote className="w-8 h-8 text-emerald-600" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-bold text-2xl text-emerald-700">{request.amount.toFixed(2)} ر.س</p>
        <p className="text-sm text-muted-foreground">الدفع نقداً — بعد استلام المبلغ اضغط تأكيد</p>
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <Button variant="outline" onClick={callbacks.onCancel} className="flex-1">إلغاء</Button>
        <Button onClick={handleConfirm} disabled={confirming} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700" data-testid="button-cash-confirm">
          {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          تأكيد الاستلام
        </Button>
      </div>
    </div>
  );
}
