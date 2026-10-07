const EMPLOYEE_PORTAL_KEYS = [
  "qirox-restore-key",
  "restoreKey",
  "currentEmployee",
  "currentManager",
] as const;

export async function logoutEmployeePortal(redirectPath: string): Promise<void> {
  let response: Response;

  try {
    response = await fetch("/api/employees/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    showLogoutError();
    return;
  }

  if (!response.ok) {
    showLogoutError();
    return;
  }

  try {
    for (const key of EMPLOYEE_PORTAL_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // The server session is already destroyed; storage may be unavailable in private mode.
  }

  window.location.replace(redirectPath);
}

function showLogoutError(): void {
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");
  window.alert(
    isEnglish
      ? "Could not reach the server to sign out. Check your connection and try again."
      : "تعذر الاتصال بالخادم لتسجيل الخروج. تحقق من الاتصال ثم حاول مرة أخرى.",
  );
}
