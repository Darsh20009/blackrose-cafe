import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface BusinessConfig {
  subscription?: {
    expiresAt?: string | null;
  } | null;
}

export function SubscriptionCountdown() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language !== "en";
  const [now, setNow] = useState(() => Date.now());
  const { data } = useQuery<BusinessConfig>({
    queryKey: ["/api/business-config"],
    refetchInterval: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expiresAt = data?.subscription?.expiresAt
    ? new Date(data.subscription.expiresAt).getTime()
    : Number.NaN;

  if (!Number.isFinite(expiresAt)) return null;

  const daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / DAY_IN_MS));
  const isExpired = daysRemaining === 0;
  const label = isArabic
    ? isExpired
      ? "انتهى الاشتراك"
      : `متبقي ${new Intl.NumberFormat("ar-SA").format(daysRemaining)} يوم للاشتراك`
    : isExpired
      ? "Subscription expired"
      : `${daysRemaining} days left on subscription`;
  const tone = isExpired
    ? "border-red-200 bg-red-50 text-red-700"
    : daysRemaining <= 7
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 ${tone}`}
    >
      <Clock3 className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
