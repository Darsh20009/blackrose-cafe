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
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-16 sm:h-16 flex-shrink-0">
                <img src={blackroseLogo} alt="BLACK ROSE" className="w-full h-full object-contain rounded-2xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-primary">{tc("لوحة التحكم", "Control Panel")}</h1>
                <p className="text-gray-500 text-sm">{tc("مرحباً", "Welcome")}, {employee.fullName}</p>
              </div>
            </div>
            <Button variant="outline" className="border-red-400 text-red-500 hover:bg-red-50" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4 sm:ml-2" />
              <span className="hidden sm:inline">{tc("تسجيل الخروج", "Sign Out")}</span>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">{tc("المسمى الوظيفي", "Job Title")}</p>
                    <p className="text-gray-900 font-bold text-lg">{employee.jobTitle || employee.role}</p>
                  </div>
                  <Badge className="bg-primary/20 text-primary">
                    {employee.role === "manager" ? tc("مدير", "Manager") : tc("موظف", "Employee")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div>
                  <p className="text-gray-500 text-sm">{tc("الفرع", "Branch")}</p>
                  <p className="text-gray-900 font-bold text-lg">{employee.branchId || tc("جميع الفروع", "All Branches")}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div>
                  <p className="text-gray-500 text-sm">{tc("رقم الموظف", "Employee ID")}</p>
                  <p className="text-gray-900 font-bold text-lg">{employee.id?.slice(0, 8)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-primary mb-6">{tc("الوصول السريع", "Quick Access")}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeeQuickAccess.map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.path} onClick={() => setLocation(item.path)}
                  className={`bg-gradient-to-br ${item.color} hover:opacity-90 h-auto p-6 text-left justify-start rounded-xl`}
                  data-testid={item.testId}
                >
                  <div className="text-left w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5" />
                      <span className="font-bold text-base">{item.title}</span>
                    </div>
                    <p className="text-gray-600 text-xs ml-8">{item.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {isManager && (
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6">{tc("صلاحيات المدير", "Manager Permissions")}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {managerAccess.map((item) => {
                const Icon = item.icon;
                return (
                  <Button key={item.path} onClick={() => setLocation(item.path)}
                    className={`bg-gradient-to-br ${item.color} hover:opacity-90 h-auto p-6 text-left justify-start rounded-xl`}
                    data-testid={item.testId}
                  >
                    <div className="text-left w-full">
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className="w-5 h-5" />
                        <span className="font-bold text-base">{item.title}</span>
                      </div>
                      <p className="text-gray-600 text-xs ml-8">{item.description}</p>
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
