/**
 * Error Logger — يسجل كل خطأ تلقائياً مع كامل التفاصيل
 * يلتقط: JS errors, Promise rejections, API errors, manual logs
 */

interface ErrorLogPayload {
  type: 'js_error' | 'promise_rejection' | 'api_error' | 'manual' | 'performance';
  message: string;
  stack?: string;
  page: string;
  lastButton?: string;
  lastApiCall?: string;
  lastApiStatus?: number;
  username?: string;
  userId?: string;
  storeName?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  screenSize: string;
  timestamp: string;
  screenshot?: string;
  extra?: Record<string, any>;
}

class ErrorLoggerService {
  private lastButton = '';
  private lastApiCall = '';
  private lastApiStatus = 0;
  private initialized = false;
  private queue: ErrorLogPayload[] = [];
  private flushing = false;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Track last clicked button/element
    document.addEventListener('click', (e) => {
      const el = e.target as HTMLElement;
      const btn = el.closest('button, a, [role="button"]') as HTMLElement | null;
      if (btn) {
        const label = btn.textContent?.trim().slice(0, 60)
          || btn.getAttribute('aria-label')
          || btn.getAttribute('data-testid')
          || btn.tagName;
        this.lastButton = label || '';
      }
    }, { capture: true, passive: true });

    // Intercept fetch to track last API call
    const origFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url || String(input);
      if (url.includes('/api/')) {
        this.lastApiCall = url.replace(window.location.origin, '');
      }
      try {
        const resp = await origFetch(input, init);
        if (url.includes('/api/')) this.lastApiStatus = resp.status;
        return resp;
      } catch (err) {
        if (url.includes('/api/')) this.lastApiStatus = 0;
        throw err;
      }
    };

    // Global JS errors
    window.addEventListener('error', (e) => {
      if (e.error?.stack?.includes('error-logger')) return;
      this.log({
        type: 'js_error',
        message: e.message || 'Unknown error',
        stack: e.error?.stack,
        extra: { filename: e.filename, lineno: e.lineno, colno: e.colno },
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      const msg = e.reason?.message || String(e.reason) || 'Unhandled rejection';
      const stack = e.reason?.stack;
      this.log({ type: 'promise_rejection', message: msg, stack });
    });

    console.log('[ErrorLogger] Initialized ✅');
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    return 'Other';
  }

  private getOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown';
  }

  private getUserContext() {
    try {
      const emp = localStorage.getItem('employee') || sessionStorage.getItem('employee');
      if (emp) {
        const parsed = JSON.parse(emp);
        return { username: parsed.username || parsed.fullName, userId: parsed.id };
      }
    } catch {}
    return {};
  }

  async log(opts: Partial<ErrorLogPayload> & { type: ErrorLogPayload['type']; message: string }) {
    try {
      const user = this.getUserContext();
      const payload: ErrorLogPayload = {
        type: opts.type,
        message: opts.message,
        stack: opts.stack,
        page: window.location.pathname,
        lastButton: this.lastButton || undefined,
        lastApiCall: this.lastApiCall || undefined,
        lastApiStatus: this.lastApiStatus || undefined,
        username: user.username,
        userId: user.userId,
        deviceType: this.getDeviceType(),
        browser: this.getBrowser(),
        os: this.getOS(),
        screenSize: `${window.screen.width}x${window.screen.height}`,
        timestamp: new Date().toISOString(),
        extra: opts.extra,
      };

      // Try screenshot (best effort, don't block logging)
      try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await Promise.race([
          html2canvas(document.body, { scale: 0.3, useCORS: true, logging: false }),
          new Promise<null>((_, r) => setTimeout(() => r(null), 2000)),
        ]);
        if (canvas && canvas instanceof HTMLCanvasElement) {
          payload.screenshot = canvas.toDataURL('image/jpeg', 0.4);
        }
      } catch {}

      this.queue.push(payload);
      this.flush();
    } catch {}
  }

  private async flush() {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;
    const batch = this.queue.splice(0, 10);
    try {
      await fetch('/api/error-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: batch }),
      });
    } catch {}
    this.flushing = false;
    if (this.queue.length > 0) this.flush();
  }

  // Manual error logging for API errors
  logApiError(url: string, status: number, message: string) {
    this.log({
      type: 'api_error',
      message: `API Error ${status}: ${message}`,
      extra: { url, status },
    });
  }

  // Manual log for custom events
  logManual(message: string, extra?: Record<string, any>) {
    this.log({ type: 'manual', message, extra });
  }
}

export const errorLogger = new ErrorLoggerService();
