import { Ticket } from "lucide-react";
import CouponManagement from "@/components/coupon-management";
import { useTranslate } from "@/lib/useTranslate";

export default function StaffCouponsPage() {
  const tc = useTranslate();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6" dir={tc("rtl", "ltr")}>
      <header className="flex items-start gap-3">
        <div className="rounded-lg border bg-white p-2.5 text-primary">
          <Ticket className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{tc("إدارة أكواد الخصم", "Discount codes")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tc("إنشاء الأكواد وتعديلها وتفعيلها أو إلغاؤها، ومتابعة عدد مرات استخدامها.", "Create, edit, activate or disable codes, and track usage.")}
          </p>
        </div>
      </header>
      <CouponManagement />
    </div>
  );
}
