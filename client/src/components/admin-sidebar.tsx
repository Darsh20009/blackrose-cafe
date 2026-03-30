import { useState } from 'react';
import { useLocation } from 'wouter';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Bell, FlaskConical, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import qiroxLogoStaff from "@assets/qirox-logo-staff.png";
import { brand } from "@/lib/brand";
import { DemoDataManager } from './demo-data-manager';

export function AdminSidebar() {
  const [location, navigate] = useLocation();
  const [demoOpen, setDemoOpen] = useState(false);

  const menuItems = [
    { label: 'لوحة التحكم', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'الموظفون', icon: Users, path: '/admin/employees' },
    { label: 'التقارير', icon: FileText, path: '/admin/reports' },
    { label: 'إرسال الإشعارات', icon: Bell, path: '/admin/notifications' },
    { label: 'الإعدادات', icon: Settings, path: '/admin/settings' },
    { label: 'إدارة API', icon: Code2, path: '/admin/api' },
  ];

  const handleLogout = async () => {
    await fetch('/api/employees/logout', { method: 'POST' });
    localStorage.removeItem("qirox-restore-key");
    navigate('/employee/login');
  };

  return (
    <>
      <div className="w-64 bg-background border-l border-border flex flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <img
              src={qiroxLogoStaff}
              alt={brand.platformNameEn}
              className="w-10 h-10 object-contain rounded-lg"
            />
            <div>
              <h2 className="text-lg font-bold text-foreground">{brand.platformNameAr}</h2>
              <p className="text-xs text-muted-foreground">لوحة التحكم الإدارية</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-primary/10'
                }`}
                data-testid={`sidebar-link-${item.label}`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-border space-y-2">
          <Button
            onClick={() => setDemoOpen(true)}
            variant="outline"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            data-testid="button-demo-manager"
          >
            <FlaskConical className="w-4 h-4 ml-2" />
            البيانات التجريبية
          </Button>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </div>

      <DemoDataManager open={demoOpen} onOpenChange={setDemoOpen} />
    </>
  );
}
