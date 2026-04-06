import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Coffee, Clock, Package, Check, Truck, ChevronRight, User, Star, Gift, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fmtOrderNum } from "@/lib/print-utils";

interface OrderItem {
  coffeeItem?: { nameAr?: string; nameEn?: string; price?: number };
  name?: string;
  nameAr?: string;
  quantity: number;
  customization?: { selectedItemAddons?: Array<{ nameAr: string }> };
}

interface TrackOrder {
  _id?: string;
  orderNumber: string;
  dailyNumber?: number;
  status: string;
  items: OrderItem[];
  totalAmount: number;
  orderType?: string;
  tableNumber?: string;
  customerName?: string;
  createdAt?: string;
  estimatedMinutes?: number;
  branchId?: string;
}

const STATUS_STEPS = [
  { key: 'pending',       label: 'تم الاستلام',    icon: Clock,   color: 'bg-yellow-500' },
  { key: 'in_progress',   label: 'قيد التحضير',   icon: Coffee,  color: 'bg-blue-500'   },
  { key: 'ready',         label: 'جاهز للاستلام', icon: Package, color: 'bg-green-500'  },
  { key: 'completed',     label: 'مكتمل',          icon: Check,   color: 'bg-gray-500'   },
];

const STATUS_MAP: Record<string, number> = {
  awaiting_payment: 0, payment_confirmed: 0, pending: 0,
  in_progress: 1,
  ready: 2,
  out_for_delivery: 2,
  completed: 3,
};

function getOrderTypeName(type?: string) {
  const m: Record<string, string> = {
    dine_in: 'طاولة', 'dine-in': 'طاولة',
    takeaway: 'سفري', pickup: 'سفري',
    delivery: 'توصيل',
    car_pickup: 'سيارة', 'car-pickup': 'سيارة',
    online: 'أونلاين',
    drive_thru: 'درايف ثرو',
  };
  return type ? (m[type] || type) : '';
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    awaiting_payment: 'bg-orange-100 text-orange-800 border-orange-300',
    payment_confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
    ready: 'bg-green-100 text-green-800 border-green-300',
    completed: 'bg-gray-100 text-gray-700 border-gray-300',
    out_for_delivery: 'bg-purple-100 text-purple-800 border-purple-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };
  const labels: Record<string, string> = {
    pending: 'في الانتظار', awaiting_payment: 'بانتظار الدفع',
    payment_confirmed: 'تم الدفع', in_progress: 'قيد التحضير',
    ready: '✅ جاهز للاستلام', completed: 'مكتمل',
    out_for_delivery: 'في الطريق إليك', cancelled: 'ملغي',
  };
  const cls = colors[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-block px-3 py-1 rounded-full border text-sm font-bold ${cls}`}>
      {labels[status] || status}
    </span>
  );
}

function CountdownTimer({ estimatedMinutes, startTime }: { estimatedMinutes: number; startTime: string }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const calc = () => {
      const start = new Date(startTime).getTime();
      const end = start + estimatedMinutes * 60 * 1000;
      const now = Date.now();
      const rem = Math.max(0, Math.floor((end - now) / 1000));
      const total = estimatedMinutes * 60;
      const elapsed = (now - start) / 1000;
      setTimeLeft(rem);
      setProgress(Math.max(0, Math.min(100, 100 - (elapsed / total) * 100)));
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [estimatedMinutes, startTime]);

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  return (
    <div className="mt-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">الوقت المتبقي للتحضير</span>
        <span className="text-2xl font-bold font-mono text-blue-600" dir="ltr">
          {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-center text-gray-400">وقت التحضير المتوقع: {estimatedMinutes} دقيقة</p>
    </div>
  );
}

export default function PublicOrderTrackPage() {
  const params = useParams<{ orderNumber: string }>();
  const [, navigate] = useLocation();
  const orderNumberRaw = params.orderNumber || '';
  const prevStatusRef = useRef('');
  const [showAlert, setShowAlert] = useState(false);

  const { data: order, isLoading, error } = useQuery<TrackOrder>({
    queryKey: ['/api/orders/number', orderNumberRaw],
    queryFn: async () => {
      const res = await fetch(`/api/orders/number/${encodeURIComponent(orderNumberRaw)}`);
      if (!res.ok) throw new Error('not found');
      return res.json();
    },
    enabled: !!orderNumberRaw,
    refetchInterval: 12000,
    retry: 1,
  });

  // WebSocket live updates
  useEffect(() => {
    if (!orderNumberRaw) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/orders`);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (['order_status_update', 'new_order', 'order_update'].includes(msg.type)) {
          const num = msg.orderNumber || msg.data?.orderNumber || msg.order?.orderNumber;
          if (num === orderNumberRaw) window.location.reload();
        }
      } catch {}
    };
    return () => { try { ws.close(); } catch {} };
  }, [orderNumberRaw]);

  // Alert when order becomes ready
  useEffect(() => {
    if (order && order.status === 'ready' && prevStatusRef.current && prevStatusRef.current !== 'ready') {
      setShowAlert(true);
    }
    if (order) prevStatusRef.current = order.status;
  }, [order]);

  const stepIndex = order ? (STATUS_MAP[order.status] ?? 0) : 0;

  if (!orderNumberRaw) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <p className="text-gray-500 text-lg">رقم الطلب غير موجود</p>
          <Button className="mt-4" onClick={() => navigate('/')}>العودة للرئيسية</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white" dir="rtl">
      {/* Header */}
      <div className="bg-black text-white py-4 px-4 text-center">
        <img src="/black-rose-logo.png" alt="Black Rose Cafe" className="h-12 mx-auto mb-1 object-contain brightness-0 invert" />
        <h1 className="text-lg font-bold tracking-widest">BLACK ROSE CAFE</h1>
        <p className="text-xs text-gray-300 mt-1">تتبع طلبك</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Order number pill */}
        <div className="text-center">
          <div className="inline-block bg-black text-white text-3xl font-bold font-mono px-8 py-3 rounded-2xl tracking-widest shadow-lg">
            {fmtOrderNum(orderNumberRaw)}
          </div>
        </div>

        {/* Ready alert */}
        {showAlert && (
          <div className="bg-green-500 text-white rounded-xl p-4 text-center font-bold text-lg shadow animate-pulse">
            🎉 طلبك جاهز للاستلام! تفضل
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">جاري البحث عن طلبك...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-bold text-lg mb-1">الطلب غير موجود</p>
            <p className="text-gray-500 text-sm">تأكد من رقم الطلب وحاول مجدداً</p>
          </div>
        )}

        {order && (
          <>
            {/* Status */}
            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-gray-700">حالة الطلب</span>
                <StatusBadge status={order.status} />
              </div>

              {/* Progress steps */}
              <div className="flex items-center gap-1">
                {STATUS_STEPS.map((step, idx) => {
                  const StepIcon = step.icon;
                  const done = idx <= stepIndex;
                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all
                        ${done ? `${step.color} text-white` : 'bg-gray-200 text-gray-400'}`}>
                        <StepIcon size={14} />
                      </div>
                      <span className={`text-[9px] text-center leading-tight ${done ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className="absolute" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Countdown for in-progress */}
              {order.status === 'in_progress' && order.estimatedMinutes && order.createdAt && (
                <CountdownTimer estimatedMinutes={order.estimatedMinutes} startTime={order.createdAt} />
              )}
            </div>

            {/* Order details */}
            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">تفاصيل الطلب</h3>

              {getOrderTypeName(order.orderType) && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">نوع الطلب</span>
                  <span className="font-semibold">{getOrderTypeName(order.orderType)}</span>
                </div>
              )}
              {order.tableNumber && (
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-500">الطاولة</span>
                  <span className="font-semibold">طاولة {order.tableNumber}</span>
                </div>
              )}

              <div className="space-y-2">
                {(order.items || []).map((item, i) => {
                  const name = item.coffeeItem?.nameAr || item.nameAr || item.name || '';
                  const addons = (item.customization?.selectedItemAddons || []).map(a => a.nameAr).join('، ');
                  return (
                    <div key={i} className="flex items-start justify-between py-2 border-b border-dashed last:border-0">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{name}</p>
                        {addons && <p className="text-xs text-gray-400 mt-0.5">+ {addons}</p>}
                      </div>
                      <span className="bg-black text-white text-xs font-bold px-2.5 py-0.5 rounded-full mr-3">
                        ×{item.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                <span className="font-bold text-gray-700">الإجمالي</span>
                <span className="font-bold text-lg">{Number(order.totalAmount).toFixed(2)} ر.س</span>
              </div>
            </div>

            {/* Invite to register */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-amber-500 text-white rounded-full p-2 flex-shrink-0">
                  <Star size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-base">انضم لعالم بلاك روز ☕</h3>
                  <p className="text-sm text-gray-600 mt-1">سجّل حسابك واحصل على نقاط لكل قهوة، وعروض حصرية، وأكثر!</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                {[
                  { icon: Gift, label: 'نقاط بكل طلب' },
                  { icon: Star, label: 'عروض حصرية' },
                  { icon: Coffee, label: 'مشروب مجاني' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="bg-white rounded-xl p-2 shadow-sm">
                    <Icon size={18} className="text-amber-500 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 font-medium">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-black hover:bg-gray-800 text-white text-sm font-bold"
                  onClick={() => navigate('/register')}
                >
                  <User size={15} className="ml-1.5" />
                  إنشاء حساب
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-black text-black text-sm font-bold"
                  onClick={() => navigate('/login')}
                >
                  تسجيل الدخول
                  <ChevronRight size={15} className="mr-1.5" />
                </Button>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 pb-2">
              "قهوة تُقال وورد يُهدى" — BLACK ROSE CAFE
            </p>
          </>
        )}
      </div>
    </div>
  );
}
