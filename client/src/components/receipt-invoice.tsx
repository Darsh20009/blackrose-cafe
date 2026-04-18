import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import type { Order } from "@shared/schema";
import logoImage from "../assets/blackrose-logo.png";
import { brand } from "@/lib/brand";
import { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import SarIcon from "@/components/sar-icon";
import { printHtmlInPage, fmtOrderNum } from "@/lib/print-utils";

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
        const trackingUrl = `https://www.blackrose.com.sa/tracking?order=${order.orderNumber}`;
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

  const printReceipt = () => {
    const totalAmount = Number(order.totalAmount) || 0;
    const subtotal = (totalAmount / 1.15).toFixed(2);
    const vatAmount = (totalAmount - totalAmount / 1.15).toFixed(2);
    const dateStr = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('ar-SA')
      : '';
    const timeStr = order.createdAt
      ? new Date(order.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      : '';

    const paymentLabels: Record<string, string> = {
      cash: 'نقداً', pos: 'نقاط البيع', stc: 'STC Pay',
      alinma: 'الإنماء', ur: 'يور باي', barq: 'برق',
      rajhi: 'الراجحي', 'qahwa-card': 'بطاقة قهوة', delivery: 'الدفع عند التوصيل',
    };
    const payMethod = paymentLabels[order.paymentMethod as string] || order.paymentMethod || '';

    const itemsHtml = items.map((item: any) => {
      const nameAr = item.nameAr || item.coffeeItem?.nameAr || item.name || '';
      const nameEn = item.nameEn || item.coffeeItem?.nameEn || '';
      const qty = item.quantity || 1;
      const price = Number(item.price || item.unitPrice || item.coffeeItem?.price || 0);
      const lineTotal = (price * qty).toFixed(2);
      const addons = (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr).join('، ');
      return `
        <tr>
          <td style="padding:4px 2px;border-bottom:1px solid #eee;text-align:right;">
            <div style="font-weight:600;">${nameAr}</div>
            ${nameEn && nameEn !== nameAr ? `<div style="font-size:10px;color:#777;direction:ltr;">${nameEn}</div>` : ''}
            ${addons ? `<div style="font-size:10px;color:#999;">+ ${addons}</div>` : ''}
          </td>
          <td style="padding:4px 2px;text-align:center;border-bottom:1px solid #eee;">${qty}</td>
          <td style="padding:4px 2px;text-align:left;border-bottom:1px solid #eee;">${lineTotal}</td>
        </tr>`;
    }).join('');

    const isCarPickup = (order as any).deliveryType === 'curbside' ||
      (order as any).deliveryType === 'car_pickup' ||
      (order as any).deliveryType === 'car-pickup' ||
      (order as any).carPickup;
    const carType    = (order as any).carType    || (order as any).carInfo?.carType    || '';
    const carColor   = (order as any).carColor   || (order as any).carInfo?.carColor   || '';
    const plateNumber = (order as any).plateNumber || (order as any).carPlate || (order as any).carInfo?.plateNumber || '';

    // ── صفحة العميل (Page 1) — بدون بيانات السيارة ──
    const customerPage = `
      <div style="page-break-after:always;break-after:page;font-family:'Cairo',Arial,sans-serif;direction:rtl;width:80mm;max-width:80mm;margin:0 auto;padding:10px;color:#000;font-size:12px;">
        <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;">
          <img src="${logoImage}" alt="BLACK ROSE CAFE" style="width:80px;height:80px;object-fit:contain;display:block;margin:0 auto 4px;" />
          <div style="font-size:16px;font-weight:bold;">${brand.nameAr}</div>
          <div style="font-size:10px;color:#555;">فاتورة ضريبية — نسخة العميل</div>
          <div style="font-size:11px;margin-top:4px;">رقم الطلب: <strong>#${order.orderNumber || ''}</strong></div>
          <div style="font-size:10px;">${dateStr} ${timeStr}</div>
          ${(order as any).tableNumber ? `<div style="font-size:11px;">طاولة: <strong>${(order as any).tableNumber}</strong></div>` : ''}
          ${(order as any).scheduledPickupTime ? `<div style="font-size:11px;color:#d97706;font-weight:bold;">🕐 موعد الاستلام: ${(order as any).scheduledPickupTime}</div>` : ''}
        </div>
        <div style="margin-bottom:6px;font-size:11px;">
          <div>العميل: ${(order as any).customerName || 'عميل نقدي'}</div>
          ${(order as any).customerPhone ? `<div>الجوال: ${(order as any).customerPhone}</div>` : ''}
          ${(order as any).employeeName ? `<div>الكاشير: ${(order as any).employeeName}</div>` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="border-bottom:1px solid #000;">
              <th style="text-align:right;padding:4px 2px;">المنتج</th>
              <th style="text-align:center;padding:4px 2px;">ك</th>
              <th style="text-align:left;padding:4px 2px;">المجموع</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="margin-top:8px;border-top:1px solid #000;padding-top:6px;font-size:11px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span>المجموع (غير شامل الضريبة):</span><span>${subtotal} ر.س</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span>ضريبة القيمة المضافة (15%):</span><span>${vatAmount} ر.س</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;border-top:1px solid #000;padding-top:4px;margin-top:4px;">
            <span>الإجمالي:</span><span>${totalAmount.toFixed(2)} ر.س</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;">
            <span>طريقة الدفع:</span><span>${payMethod}</span>
          </div>
        </div>
        ${trackingQrUrl ? `
        <div style="text-align:center;margin-top:10px;">
          <img src="${trackingQrUrl}" style="width:100px;height:100px;" />
          <div style="font-size:9px;color:#555;">امسح لتتبع طلبك</div>
        </div>` : ''}
        <div style="text-align:center;margin-top:10px;border-top:1px solid #000;padding-top:6px;font-size:10px;color:#555;">
          <div style="font-weight:bold;">شكراً لزيارتكم!</div>
          <div>www.blackrose.com.sa</div>
        </div>
      </div>`;

    // ── صفحة الموظف / المطبخ (Page 2) — مع بيانات السيارة ──
    const employeeItemsHtml = items.map((item: any) => {
      const nameAr = item.nameAr || item.coffeeItem?.nameAr || item.name || '';
      const nameEn = item.nameEn || item.coffeeItem?.nameEn || '';
      const qty = item.quantity || 1;
      const addons = (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr).join('، ');
      return `
        <div style="margin-bottom:8px;padding-bottom:6px;border-bottom:1px dashed #ccc;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="font-size:15px;font-weight:bold;">${nameAr}</div>
              ${nameEn && nameEn !== nameAr ? `<div style="font-size:11px;color:#666;direction:ltr;">${nameEn}</div>` : ''}
              ${addons ? `<div style="font-size:11px;color:#555;margin-top:2px;">+ ${addons}</div>` : ''}
            </div>
            <div style="font-size:20px;font-weight:bold;border:2px solid #000;padding:2px 10px;border-radius:4px;white-space:nowrap;">×${qty}</div>
          </div>
        </div>`;
    }).join('');

    const employeePage = `
      <div style="font-family:'Cairo',Arial,sans-serif;direction:rtl;width:80mm;max-width:80mm;margin:0 auto;padding:10px;color:#000;">
        <div style="text-align:center;border-bottom:3px solid #000;padding-bottom:10px;margin-bottom:10px;">
          <div style="font-size:13px;font-weight:bold;color:#555;">ورقة التحضير — نسخة الموظف</div>
          <div style="font-size:30px;font-weight:bold;margin:8px 0;letter-spacing:2px;">#${order.orderNumber || ''}</div>
          <div style="font-size:11px;">${timeStr} — ${dateStr}</div>
          ${(order as any).tableNumber ? `<div style="font-size:13px;font-weight:bold;margin-top:4px;">طاولة رقم: ${(order as any).tableNumber}</div>` : ''}
          ${(order as any).scheduledPickupTime ? `<div style="font-size:12px;font-weight:bold;color:#d97706;">🕐 موعد الاستلام: ${(order as any).scheduledPickupTime}</div>` : ''}
          ${isCarPickup ? `<div style="font-size:13px;font-weight:bold;color:#6b21a8;border:2px solid #6b21a8;padding:3px 6px;margin-top:4px;border-radius:4px;">🚗 استلام من السيارة</div>` : ''}
          ${carType ? `<div style="font-size:12px;color:#6b21a8;font-weight:bold;margin-top:4px;background:#f3e8ff;padding:4px 8px;border-radius:4px;">نوع: ${carType} | لون: ${carColor} | لوحة: ${plateNumber}</div>` : ''}
          ${(order as any).orderType ? `<div style="font-size:11px;color:#555;margin-top:4px;">${(order as any).orderType}</div>` : ''}
        </div>
        <div style="margin-bottom:10px;">
          ${employeeItemsHtml}
        </div>
        ${(order as any).customerNotes ? `
        <div style="margin-top:8px;border:2px solid #000;padding:6px;font-size:12px;">
          <strong>ملاحظات:</strong> ${(order as any).customerNotes}
        </div>` : ''}
        <div style="text-align:center;margin-top:12px;font-size:11px;color:#888;">
          الكاشير: ${(order as any).employeeName || ''} — العميل: ${(order as any).customerName || 'نقدي'}
        </div>
      </div>`;

    printHtmlInPage(customerPage + employeePage, '80mm');
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
        style={{ direction: "rtl" }}
        className="bg-white rounded-none p-10 max-w-[80mm] mx-auto text-black"
        data-testid="invoice-preview"
      >
        {/* Header */}
        <div className="text-center mb-4 pb-2 border-b border-black">
          <p className="text-[12px] font-black uppercase tracking-wider">{brand.nameEn}</p>
          <p className="text-[9px] font-bold uppercase tracking-tight opacity-70">Tax Invoice - فاتورة ضريبية</p>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-1 mb-3 text-[9px] border-b border-black/5 pb-2">
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="opacity-60">رقم الفاتورة:</span>
              <span className="font-mono">{fmtOrderNum(order.orderNumber)}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">التاريخ:</span>
              <span>{new Date(order.createdAt).toLocaleDateString('ar-SA')}</span>
            </div>
          </div>
          <div className="space-y-0.5 text-left">
            <div className="flex justify-between flex-row-reverse">
              <span className="opacity-60">:الوقت</span>
              <span>{new Date(order.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {order.tableNumber && (
              <div className="flex justify-between flex-row-reverse">
                <span className="opacity-60">:الطاولة</span>
                <span className="font-bold">#{order.tableNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-3">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-black">
                <th className="text-right py-1">المنتج</th>
                <th className="text-center py-1">كمية</th>
                <th className="text-left py-1">المجموع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item: any, index: number) => {
                const inlineAddons = item.customization?.selectedItemAddons || [];
                const itemNameAr = item.nameAr || item.coffeeItem?.nameAr || item.name || '';
                const itemNameEn = item.nameEn || item.coffeeItem?.nameEn || '';
                return (
                  <tr key={index}>
                    <td className="py-1 text-right">
                      <div className="font-medium">{itemNameAr}</div>
                      {itemNameEn && itemNameEn !== itemNameAr && (
                        <div className="text-[9px] text-gray-400 mt-0.5 ltr text-right">{itemNameEn}</div>
                      )}
                      {inlineAddons.length > 0 && (
                        <div className="text-[9px] text-gray-500 mt-0.5">
                          + {inlineAddons.map((a: any) => a.nameAr).join('، ')}
                        </div>
                      )}
                    </td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-left font-medium">
                      {(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-black pt-1.5 space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span>المجموع الفرعي:</span>
            <span>{(Number(order.totalAmount) / 1.15).toFixed(2)} <SarIcon /></span>
          </div>
          <div className="flex justify-between">
            <span>الضريبة (15%):</span>
            <span>{(Number(order.totalAmount) - (Number(order.totalAmount) / 1.15)).toFixed(2)} <SarIcon /></span>
          </div>
          <div className="flex justify-between text-sm font-black border-t border-black mt-1 pt-1">
            <span>الإجمالي:</span>
            <span>{Number(order.totalAmount).toFixed(2)} <SarIcon /></span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 pt-2 border-t border-black text-[9px]">
          <p className="font-bold">شكراً لزيارتكم</p>
          <p>الرقم الضريبي: 312718675800003</p>
          <p>السجل التجاري: 1163184110</p>
          <p className="font-bold mt-1 tracking-tight">www.blackrose.com.sa</p>
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
