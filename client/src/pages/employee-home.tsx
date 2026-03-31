import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coffee, LogOut, ShoppingCart, ClipboardList, User, ChefHat, Warehouse, Eye, Calendar, FileText, BarChart3, Lock, Utensils } from "lucide-react";
import type { Employee } from "@shared/schema";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useTranslate } from "@/lib/useTranslate";
import blackroseLogo from "@assets/blackrose-logo.png";

export default function EmployeeHome() {
  const [, setLocation] = useLocation();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const tc = useTranslate();

  useEffect(() => {
    const storedEmployee = localStorage.getItem("currentEmployee");
    if (storedEmployee) {
      const emp = JSON.parse(storedEmployee);
      if (emp.role === "owner" || emp.role === "admin") {
        window.location.href = "/admin/dashboard";
        return;
      }
      if (emp.role === "manager") {
        window.location.href = "/manager/dashboard";
        return;
      }
      setEmployee(emp);
    } else {
      window.location.href = "/employee/gateway";
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("currentEmployee");
    setLocation("/employee/gateway");
  };

  if (!employee) return null;

  const isManager = employee.role === "manager" || employee.role === "admin";

  const employeeQuickAccess = [
    { title: tc("نقطة البيع", "POS"), description: tc("إدارة الطلبات", "Manage orders"), icon: ShoppingCart, path: "/employee/pos", color: "from-green-500 to-green-600", testId: "button-pos" },
    { title: tc("الطلبات", "Orders"), description: tc("عرض وإدارة الطلبات", "View and manage orders"), icon: ClipboardList, path: "/employee/orders", color: "from-blue-500 to-blue-600", testId: "button-orders" },
    { title: tc("الحضور", "Attendance"), description: tc("تسجيل الحضور والانصراف", "Record attendance"), icon: Calendar, path: "/employee/attendance", color: "from-purple-500 to-purple-600", testId: "button-attendance" },
    { title: tc("طلب إجازة", "Leave Request"), description: tc("تقديم طلب إجازة", "Submit a leave request"), icon: FileText, path: "/employee/leave-request", color: "from-primary to-primary/80", testId: "button-leave" },
    { title: tc("المطبخ", "Kitchen"), description: tc("إدارة طلبات المطبخ", "Manage kitchen orders"), icon: ChefHat, path: "/employee/kitchen", color: "from-red-500 to-red-600", testId: "button-kitchen" },
    { title: tc("الموارد البشرية", "HR"), description: tc("معلومات الموظف", "Employee information"), icon: User, path: "/employee/dashboard", color: "from-indigo-500 to-indigo-600", testId: "button-hr" },
  ];

  const managerAccess = [
    { title: tc("إدارة المشروبات", "Drinks Management"), description: tc("إضافة وتعديل قائمة المشروبات", "Add and edit drinks menu"), icon: Coffee, path: "/employee/menu-management", color: "from-primary to-primary/80", testId: "button-menu-mgmt" },
    { title: tc("إدارة الطعام", "Food Management"), description: tc("إضافة وتعديل قائمة الطعام", "Add and edit food menu"), icon: Utensils, path: "/employee/menu-management?type=food", color: "from-primary to-primary/80", testId: "button-food-mgmt" },
    { title: tc("المواد الخام", "Ingredients"), description: tc("إدارة المواد الخام والمخزون", "Manage raw materials and inventory"), icon: Warehouse, path: "/employee/ingredients", color: "from-cyan-500 to-cyan-600", testId: "button-ingredients-mgmt" },
    { title: tc("لوحة التحكم", "Dashboard"), description: tc("إحصائيات وتقارير", "Stats and reports"), icon: BarChart3, path: "/employee/dashboard", color: "from-teal-500 to-teal-600", testId: "button-dashboard" },
    { title: tc("إدارة الموظفين", "Employees"), description: tc("إضافة وتعديل الموظفين", "Add and edit employees"), icon: Lock, path: "/manager/employees", color: "from-pink-500 to-pink-600", testId: "button-employees" },
    { title: tc("الطاولات والحجوزات", "Tables & Reservations"), description: tc("إدارة الطاولات", "Manage tables"), icon: Eye, path: "/employee/tables", color: "from-lime-500 to-lime-600", testId: "button-tables" },
  ];

  return (
    <div className="min-h-screen pb-16 sm:pb-0 bg-gray-50" dir="rtl">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-5">
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0">
                <img src={blackroseLogo} alt="BLACK ROSE" className="w-full h-full object-contain rounded-xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div>
                <h1 className="text-base sm:text-2xl font-bold text-primary">{tc("لوحة التحكم", "Control Panel")}</h1>
                <p className="text-gray-500 text-xs sm:text-sm">{tc("مرحباً", "Welcome")}, {employee.fullName}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-red-400 text-red-500 hover:bg-red-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:ml-2" />
              <span className="hidden sm:inline">{tc("تسجيل الخروج", "Sign Out")}</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-3 pb-3 px-3 sm:pt-5 sm:pb-4 sm:px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs">{tc("المسمى الوظيفي", "Job Title")}</p>
                    <p className="text-gray-900 font-bold text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">{employee.jobTitle || employee.role}</p>
                  </div>
                  <Badge className="bg-primary/20 text-primary text-xs">
                    {employee.role === "manager" ? tc("مدير", "Manager") : tc("موظف", "Employee")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-3 pb-3 px-3 sm:pt-5 sm:pb-4 sm:px-4">
                <div>
                  <p className="text-gray-500 text-xs">{tc("الفرع", "Branch")}</p>
                  <p className="text-gray-900 font-bold text-sm sm:text-base truncate">{employee.branchId || tc("جميع الفروع", "All Branches")}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200 hidden md:block">
              <CardContent className="pt-3 pb-3 px-3 sm:pt-5 sm:pb-4 sm:px-4">
                <div>
                  <p className="text-gray-500 text-xs">{tc("رقم الموظف", "Employee ID")}</p>
                  <p className="text-gray-900 font-bold text-sm sm:text-base">{employee.id?.slice(0, 8)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h2 className="text-base sm:text-xl font-bold text-primary mb-3 sm:mb-4">{tc("الوصول السريع", "Quick Access")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {employeeQuickAccess.map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.path} onClick={() => setLocation(item.path)}
                  className={`bg-gradient-to-br ${item.color} hover:opacity-90 h-auto p-3 sm:p-5 text-right justify-start rounded-xl`}
                  data-testid={item.testId}
                >
                  <div className="text-right w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="font-bold text-sm sm:text-base leading-tight">{item.title}</span>
                    </div>
                    <p className="text-white/70 text-xs hidden sm:block">{item.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {isManager && (
          <div>
            <h2 className="text-base sm:text-xl font-bold text-primary mb-3 sm:mb-4">{tc("صلاحيات المدير", "Manager Permissions")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
              {managerAccess.map((item) => {
                const Icon = item.icon;
                return (
                  <Button key={item.path} onClick={() => setLocation(item.path)}
                    className={`bg-gradient-to-br ${item.color} hover:opacity-90 h-auto p-3 sm:p-5 text-right justify-start rounded-xl`}
                    data-testid={item.testId}
                  >
                    <div className="text-right w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="font-bold text-sm sm:text-base leading-tight">{item.title}</span>
                      </div>
                      <p className="text-white/70 text-xs hidden sm:block">{item.description}</p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <MobileBottomNav employeeRole={employee?.role} onLogout={handleLogout} />
    </div>
  );
}
