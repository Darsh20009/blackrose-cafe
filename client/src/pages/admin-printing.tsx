import { AdminLayout } from "@/components/admin-layout";
import PrinterSettingsPanel from "@/components/printer-settings-panel";

export default function AdminPrintingPage() {
  return (
    <AdminLayout title="إعدادات الطباعة">
      <div className="p-6 max-w-3xl mx-auto" dir="rtl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">إعدادات الطباعة</h1>
          <p className="text-sm text-gray-500 mt-0.5">تهيئة الطابعات — بلوتوث وسلكي (USB) فقط</p>
        </div>
        <PrinterSettingsPanel />
      </div>
    </AdminLayout>
  );
}
