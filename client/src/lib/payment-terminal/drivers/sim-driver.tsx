import { useState } from "react";
import { FlaskConical, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DriverComponentProps } from "../types";

export default function SimDriver({ request, callbacks }: DriverComponentProps) {
  const [state, setState] = useState<"idle" | "processing" | "done" | "fail">("idle");

  const simulate = async (succeed: boolean) => {
    setState("processing");
    await new Promise(r => setTimeout(r, 1200));
    if (succeed) {
      setState("done");
      callbacks.onSuccess({ success: true, provider: "sim", transactionId: `SIM-${Date.now()}` });
    } else {
      setState("fail");
      callbacks.onError("رُفضت العملية — (محاكاة)");
    }
  };

  if (state === "processing") return (
    <div className="flex flex-col items-center gap-4 p-8 bg-amber-50 rounded-xl border border-amber-200">
      <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      <p className="font-semibold text-amber-700">جاري محاكاة الدفع...</p>
    </div>
  );
  if (state === "done") return (
    <div className="flex flex-col items-center gap-4 p-8 bg-green-50 rounded-xl border border-green-200">
      <CheckCircle className="w-14 h-14 text-green-500" />
      <p className="font-bold text-xl text-green-700">تمت المحاكاة بنجاح</p>
      <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">⚗️ وضع الاختبار — لم يُخصم مبلغ حقيقي</p>
    </div>
  );
  if (state === "fail") return (
    <div className="flex flex-col items-center gap-4 p-8 bg-red-50 rounded-xl border border-red-200">
      <XCircle className="w-12 h-12 text-red-500" />
      <p className="font-bold text-lg text-red-700">رُفضت العملية (محاكاة)</p>
      <Button variant="outline" onClick={() => setState("idle")}>حاول مرة أخرى</Button>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-5 p-8 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
        <FlaskConical className="w-8 h-8 text-amber-600" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-bold text-lg text-amber-700">وضع المحاكاة ⚗️</p>
        <p className="text-sm text-muted-foreground">المبلغ: {request.amount.toFixed(2)} ر.س — لن يُخصم مبلغ حقيقي</p>
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <Button variant="outline" onClick={() => simulate(false)} className="flex-1 border-red-200 text-red-600 hover:bg-red-50" data-testid="button-sim-fail">
          محاكاة رفض
        </Button>
        <Button onClick={() => simulate(true)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="button-sim-success">
          محاكاة نجاح
        </Button>
      </div>
    </div>
  );
}
