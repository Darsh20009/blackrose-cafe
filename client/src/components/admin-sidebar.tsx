import { useState } from 'react';
import { useLocation } from 'wouter';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Bell, Code2, GitBranch, Mail, Coffee, BookOpen, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import blackroseLogoStaff from "@assets/blackrose-logo.png";
import { brand } from "@/lib/brand";


export function AdminSidebar() {
  const [location, navigate] = useLocation();

  const groups = [
    {
      label: "الرئيسية",
      items: [
        { label: 'لوحة التحكم', icon: LayoutDashboard, path: '/admin/dashboard' },
      ]
    },
    {
      label: "العمليات",
      items: [
        { label: 'إدارة المأكولات والمشروبات', icon: Coffee, path: '/employee/menu-management' },
        { label: 'حجوزات الطاولات', icon: BookOpen, path: '/employee/reservations' },
        { label: 'حجوزات المنتجات', icon: Star, path: '/employee/product-reservations' },
      ]
    },
    {
      label: "الإدارة",
      items: [
        { label: 'الموظفون', icon: Users, path: '/admin/employees' },
        { label: 'الفروع', icon: GitBranch, path: '/admin/branches' },
        { label: 'التقارير', icon: FileText, path: '/admin/reports' },
      ]
    },
    {
      label: "التواصل",
      items: [
        { label: 'إرسال الإشعارات', icon: Bell, path: '/admin/notifications' },
        { label: 'التسويق البريدي', icon: Mail, path: '/admin/email' },
      ]
    },
    {
      label: "الإعدادات",
      items: [
        { label: 'الإعدادات', icon: Settings, path: '/admin/settings' },
        { label: 'إدارة API', icon: Code2, path: '/admin/api' },
      ]
    },
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
              src={blackroseLogoStaff}
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
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-right ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground hover:bg-primary/10'
                      }`}
                      data-testid={`sidebar-link-${item.label}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-border space-y-2">
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
    </>
  );
}
