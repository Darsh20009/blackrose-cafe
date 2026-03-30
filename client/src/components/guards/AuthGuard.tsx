import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LoadingState } from "@/components/ui/states";

type UserType = "customer" | "employee" | "manager" | "admin";

interface AuthGuardProps {
  children: ReactNode;
  userType: UserType;
  allowedRoles?: string[];
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  userType, 
  allowedRoles = [],
  redirectTo 
}: AuthGuardProps) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true);

      try {
        let isAuthenticated = false;
        let userRole = "";
        let allowedPages: string[] = [];

        switch (userType) {
          case "customer": {
            // Check both storage keys for customer authentication
            const customer = localStorage.getItem("qahwa-customer") || localStorage.getItem("currentCustomer");
            if (customer) {
              isAuthenticated = true;
            } else {
              // Allow guest mode users (entered name + phone) to proceed
              const isGuest = localStorage.getItem("qahwa-guest-mode") === 'true';
              const guestInfo = localStorage.getItem("qahwa-guest-info");
              if (isGuest && guestInfo) {
                isAuthenticated = true;
              }
            }
            break;
          }
          case "employee": {
            // Roles that belong ONLY to the manager portal
            const managerOnlyRoles = ["manager", "branch_manager", "admin", "owner"];
            const employee = localStorage.getItem("currentEmployee");
            if (employee) {
              const parsed = JSON.parse(employee);
              const role = parsed.role || "";
              // If this is a manager-level account, kick them to the manager portal
              if (managerOnlyRoles.includes(role)) {
                setLocation("/manager/dashboard");
                return;
              }
              isAuthenticated = true;
              userRole = role;
              allowedPages = parsed.allowedPages || [];
            } else {
              // Final fallback check session
              const response = await fetch("/api/user", { credentials: 'include' });
              if (response.ok) {
                const user = await response.json();
                if (user.type === 'employee') {
                  const role = user.role || "";
                  if (!managerOnlyRoles.includes(role)) {
                    localStorage.setItem("currentEmployee", JSON.stringify(user));
                    isAuthenticated = true;
                    userRole = role;
                  } else {
                    setLocation("/manager/dashboard");
                    return;
                  }
                }
              }
            }
            break;
          }
          case "manager": {
            // Roles that belong ONLY to the employee portal (cannot access manager routes)
            const employeeOnlyRoles = ["cashier", "barista", "waiter", "cook"];
            const manager = localStorage.getItem("currentEmployee") || localStorage.getItem("currentManager");
            if (manager) {
              const parsed = JSON.parse(manager);
              const role = parsed.role || "";
              // If this is a pure employee role, redirect to employee portal
              if (employeeOnlyRoles.includes(role)) {
                setLocation("/employee/dashboard");
                return;
              }
              const allowedManagerRoles = ["manager", "admin", "owner", "branch_manager", "supervisor"];
              if (allowedManagerRoles.includes(role)) {
                isAuthenticated = true;
                userRole = role;
                allowedPages = parsed.allowedPages || [];
              }
            }
            break;
          }
          case "admin": {
            const admin = localStorage.getItem("currentAdmin");
            if (admin) {
              isAuthenticated = true;
              userRole = "admin";
            }
            break;
          }
        }

        if (!isAuthenticated) {
          const defaultRedirects: Record<UserType, string> = {
            customer: "/auth",
            employee: "/employee/login",
            manager: "/manager/login",
            admin: "/admin/login",
          };
          setLocation(redirectTo || defaultRedirects[userType]);
          return;
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
          setLocation("/unauthorized");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        setLocation("/unauthorized");
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [userType, allowedRoles, redirectTo, setLocation]);

  if (isChecking) {
    return <LoadingState message="جاري التحقق من الصلاحيات..." />;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

interface BranchGuardProps {
  children: ReactNode;
  userType: "employee" | "manager";
  requiredBranchId?: string;
}

export function BranchGuard({ children, userType, requiredBranchId }: BranchGuardProps) {
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Both employees and managers use currentEmployee storage key
    const stored = localStorage.getItem("currentEmployee");
    
    if (!stored) {
      setLocation("/unauthorized");
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      
      if (parsed.role === "admin" || parsed.role === "owner") {
        setIsAuthorized(true);
        return;
      }

      if (requiredBranchId && parsed.branchId !== requiredBranchId) {
        setLocation("/unauthorized");
        return;
      }

      setIsAuthorized(true);
    } catch {
      setLocation("/unauthorized");
    }
  }, [userType, requiredBranchId, setLocation]);

  if (!isAuthorized) {
    return <LoadingState message="جاري التحقق..." />;
  }

  return <>{children}</>;
}
