import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import type { Order } from "@shared/schema";
import { brand } from "@/lib/brand";
import { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import SarIcon from "@/components/sar-icon";
import { fmtOrderNum } from "@/lib/print-utils";

interface ReceiptInvoiceProps {
  order: Order;
  variant?: "button" | "auto";
}

export function ReceiptInvoice({ order, variant = "button" }: ReceiptInvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [trackingQrUrl, setTrackingQrUrl] = useState<string>("");

  const getItemsArray = (): any[] => {
    try {
      if (!order || !order.items) return [];
      const items = order.items;
      if (Array.isArray(items)) return items;
      if (typeof items === 'string') {
        try {
          const parsed = JSON.parse(items);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      if (typeof items === 'object' && items !== null) {
        return Object.values(items);
      }
      return [];
    } catch (e) {
      console.error("Error parsing order items:", e, order?.items);
      return [];
    }
  };

  const items = getItemsArray();
  const safeOrder = order || {} as Order;

  useEffect(() => {
    const generateTrackingQR = async () => {
      if (!order || !order.orderNumber) return;
      try {
        const trackingUrl = `${window.location.origin}/track/${order.orderNumber}`;
        const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
          width: 150,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        setTrackingQrUrl(qrDataUrl);
      } catch (error) {
        console.error("Error generating tracking QR code:", error);
      }
    };
    generateTrackingQR();
  }, [order?.orderNumber]);

  // Early return if no valid order
  if (!order || !order.orderNumber) {
    return null;
  }

  const generatePDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`فاتورة-${order.orderNumber}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const printReceipt = async () => {
    if (!invoiceRef.current) return;
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument!;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><style>
        @page { size: 80mm auto; margin: 0; }
        * { margin: 0; padding: 0; }
        body { background: #fff; }
        img { width: 100%; display: block; }
      </style></head><body><img src="${imgData}" /></body></html>`);
      doc.close();
      setTimeout(() => {
        try { iframe.contentWindow!.print(); } catch {}
        const cleanup = () => { try { iframe.remove(); } catch {} };
        iframe.contentWindow!.addEventListener('afterprint', cleanup, { once: true });
        setTimeout(cleanup, 8000);
      }, 400);
    } catch (err) {
      console.error('Print failed:', err);
    }
  };

  useEffect(() => {
    // Auto-print if variant is auto
    if (variant === "auto" && order && order.id) {
      const timer = setTimeout(() => {
        printReceipt();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [variant, order?.id]);

  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      'cash': 'نقداً',
      'pos': 'جهاز نقاط البيع',
      'delivery': 'الدفع عند التوصيل',
      'stc': 'STC Pay',
      'alinma': 'الإنماء باي',
      'ur': 'يور باي',
      'barq': 'برق',
      'rajhi': 'الراجحي',
      'qahwa-card': 'بطاقة قهوة'
    };
    return methods[method] || method;
  };

  // Early return if no valid order
  if (!order || !order.orderNumber) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Invoice Preview */}
      <div
        ref={invoiceRef}
        style={{ direction: "rtl", lineHeight: 1.7 }}
        className="bg-white rounded-none p-6 max-w-[80mm] mx-auto text-black"
        data-testid="invoice-preview"
      >
        {/* Header */}
        <div className="text-center mb-4 pb-3 border-b-2 border-black">
          <img
            src={brand.logoCustomer}
            alt={brand.nameEn}
            crossOrigin="anonymous"
            className="mx-auto mb-2"
            style={{ width: '70%', maxWidth: 180, height: 'auto', display: 'block' }}
          />
          <p className="text-[12px] font-bold uppercase tracking-tight opacity-80 mt-1">Tax Invoice - فاتورة ضريبية</p>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-[12px] border-b border-black pb-3">
          <div className="space-y-1.5">
            <div className="flex justify-between gap-2">
              <span className="opacity-70">رقم الفاتورة:</span>
              <span className="font-mono font-bold">{fmtOrderNum(order.orderNumber)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="opacity-70">التاريخ:</span>
              <span>{new Date(order.createdAt).toLocaleDateString('ar-SA')}</span>
            </div>
          </div>
          <div className="space-y-1.5 text-left">
            <div className="flex justify-between flex-row-reverse gap-2">
              <span className="opacity-70">:الوقت</span>
              <span>{new Date(order.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {order.tableNumber && (
              <div className="flex justify-between flex-row-reverse gap-2">
                <span className="opacity-70">:الطاولة</span>
                <span className="font-bold">#{order.tableNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-right py-2 font-bold">المنتج</th>
                <th className="text-center py-2 font-bold w-10">كمية</th>
                <th className="text-left py-2 font-bold w-16">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, index: number) => {
                const inlineAddons = item.customization?.selectedItemAddons || [];
                const itemNameAr = item.nameAr || item.coffeeItem?.nameAr || item.name || '';
                const itemNameEn = item.nameEn || item.coffeeItem?.nameEn || '';
                const isLast = index === items.length - 1;
                return (
                  <tr key={index} className={isLast ? '' : 'border-b border-gray-300'}>
                    <td className="py-3 text-right align-top">
                      <div className="font-bold leading-relaxed">{itemNameAr}</div>
                      {itemNameEn && itemNameEn !== itemNameAr && (
                        <div className="text-[11px] text-gray-500 mt-1 ltr text-right">{itemNameEn}</div>
                      )}
                      {inlineAddons.length > 0 && (
                        <div className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                          + {inlineAddons.map((a: any) => a.nameAr).join('، ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-center align-top font-bold">{item.quantity}</td>
                    <td className="py-3 text-left align-top font-bold">
                      {(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-black pt-3 space-y-1.5 text-[13px]">
          <div className="flex justify-between">
            <span>المجموع الفرعي:</span>
            <span className="font-medium">{(Number(order.totalAmount) / 1.15).toFixed(2)} <SarIcon /></span>
          </div>
          <div className="flex justify-between">
            <span>الضريبة (15%):</span>
            <span className="font-medium">{(Number(order.totalAmount) - (Number(order.totalAmount) / 1.15)).toFixed(2)} <SarIcon /></span>
          </div>
          <div className="flex justify-between text-[16px] font-black border-t-2 border-black mt-2 pt-2">
            <span>الإجمالي:</span>
            <span>{Number(order.totalAmount).toFixed(2)} <SarIcon /></span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-5 pt-3 border-t-2 border-black text-[12px] space-y-1">
          <p className="font-bold text-[14px]">شكراً لزيارتكم</p>
          <p>الرقم الضريبي: 312718675800003</p>
          <p>السجل التجاري: 1163184110</p>
          <p className="font-bold mt-2 tracking-tight">www.blackrose.com.sa</p>
        </div>
      </div>

      {/* Action Buttons */}
      {variant === "button" && (
        <div className="flex gap-2 w-full no-print">
          <Button
            onClick={printReceipt}
            className="flex-1 bg-primary hover:bg-primary/90"
            data-testid="button-print-invoice"
          >
            <Printer className="ml-2 h-4 w-4" />
            طباعة الفاتورة
          </Button>
          <Button
            onClick={generatePDF}
            variant="outline"
            className="flex-1"
            data-testid="button-download-invoice"
          >
            <Download className="ml-2 h-4 w-4" />
            تحميل PDF
          </Button>
        </div>
      )}
    </div>
  );
}
