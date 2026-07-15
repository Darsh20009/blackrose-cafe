import nodemailer from "nodemailer";

let transporter: any = null;
let transporterInitialized = false;

// ─── Brand helpers ────────────────────────────────────────────────────────────
const BRAND_NAME = "BLACK ROSE CAFE";
const BRAND_COLOR = "#BE1845";
const BRAND_SECONDARY = "#1a1a1a";
const LOGO_URL = "https://raw.githubusercontent.com/Darsh20009/blackrose-cafe/main/client/public/logo.png";
const from = () => `"${BRAND_NAME}" <${process.env.SMTP_FROM || "info@qirox.online"}>`;

// ─── Email base template ──────────────────────────────────────────────────────
function baseTemplate(content: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${BRAND_NAME}</title>
<style>
  body{margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;}
  .wrap{max-width:580px;margin:0 auto;background:#fff;}
  .header{background:${BRAND_SECONDARY};padding:28px 32px;text-align:center;}
  .header img{width:110px;height:auto;}
  .header h1{color:#fff;margin:10px 0 2px;font-size:22px;letter-spacing:1px;}
  .header p{color:#aaa;margin:0;font-size:12px;}
  .body{padding:32px;}
  .footer{background:#f9f9f9;border-top:1px solid #eee;padding:20px 32px;text-align:center;font-size:11px;color:#999;}
  .btn{display:inline-block;background:${BRAND_COLOR};color:#fff!important;padding:13px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;margin:20px 0;}
  .badge{display:inline-block;padding:8px 20px;border-radius:20px;font-weight:bold;font-size:18px;}
  .card{background:#f9f9f9;border-right:4px solid ${BRAND_COLOR};border-radius:6px;padding:18px 20px;margin:16px 0;}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:14px;}
  .row:last-child{border-bottom:none;}
  .label{color:#888;}
  .value{color:#222;font-weight:600;}
  table{width:100%;border-collapse:collapse;}
  th{background:${BRAND_SECONDARY};color:#fff;padding:10px 14px;text-align:right;font-size:13px;}
  td{padding:9px 14px;font-size:13px;border-bottom:1px solid #eee;color:#333;}
  tr:nth-child(even) td{background:#fafafa;}
  h2{color:${BRAND_SECONDARY};margin-top:0;}
</style>
</head>
<body>
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
<div class="wrap">
  <div class="header">
    <img src="${LOGO_URL}" alt="${BRAND_NAME}" />
    <h1>${BRAND_NAME}</h1>
    <p>تجربة القهوة الفاخرة</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ${BRAND_NAME} — جميع الحقوق محفوظة</p>
    <p>هذا البريد مرسل تلقائياً من نظام QIROX، يرجى عدم الرد عليه.</p>
  </div>
</div>
</body></html>`;
}

// ─── SMTP transporter (cPanel) ────────────────────────────────────────────────
async function getTransporter() {
  if (transporterInitialized) return transporter;

  const host = process.env.CPANEL_SMTP_HOST || process.env.SMTP_HOST || "server222.web-hosting.com";
  const port = parseInt(process.env.CPANEL_SMTP_PORT || process.env.SMTP_PORT || "465");
  const user = process.env.CPANEL_SMTP_USER || process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`📧 Mail service (cPanel) — host: ${host}:${port} user: ${user ? "✅" : "❌"} pass: ${pass ? "✅" : "❌"}`);

  if (!user || !pass) {
    console.warn("⚠️  SMTP credentials missing — email disabled.");
    transporterInitialized = true;
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 30_000,
      socketTimeout: 60_000,
      pool: true,
      maxConnections: 3,
    });
    transporterInitialized = true;
    transporter.verify().then(() => console.log("✅ SMTP cPanel verified")).catch((e: any) => console.warn("⚠️  SMTP verify:", e.message));
  } catch (e: any) {
    console.error("❌ SMTP init error:", e.message);
    transporterInitialized = true;
  }
  return transporter;
}

// ─── Core send ────────────────────────────────────────────────────────────────
export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const transport = await getTransporter();
  if (!transport) { console.warn("⚠️  No mail transport — skip."); return false; }
  try {
    const toAddr = Array.isArray(opts.to) ? opts.to.join(",") : opts.to;
    const { to: _ignoredTo, ...restOpts } = opts as any;
    const info = await transport.sendMail({ from: from(), to: toAddr, ...restOpts });
    console.log(`✅ Mail sent → ${toAddr} | ${info.messageId}`);
    return true;
  } catch (e: any) {
    console.error("❌ Mail send error:", e.message);
    return false;
  }
}

// ─── Health check ─────────────────────────────────────────────────────────────
export async function checkMailServiceHealth(): Promise<{ healthy: boolean; message: string }> {
  try {
    const t = await getTransporter();
    if (!t) return { healthy: false, message: "SMTP credentials not configured" };
    await t.verify();
    return { healthy: true, message: "cPanel SMTP connection verified" };
  } catch (e: any) {
    return { healthy: false, message: `SMTP error: ${e.message}` };
  }
}

export async function testEmailConnection(): Promise<boolean> {
  const r = await checkMailServiceHealth();
  return r.healthy;
}

// ════════════════════════════════════════════════════════════════
//  CUSTOMER EMAILS
// ════════════════════════════════════════════════════════════════

// ─── Order status notification ────────────────────────────────────────────────
export async function sendOrderNotificationEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  orderStatus: string,
  orderTotal: number,
  originalOrder?: any
) {
  const statusMap: Record<string, { ar: string; color: string; icon: string; msg: string }> = {
    pending:          { ar: "قيد المعالجة",  color: "#9C27B0", icon: "⏳", msg: "استلمنا طلبك وجاري معالجته." },
    payment_confirmed:{ ar: "تم تأكيد الدفع", color: "#2196F3", icon: "💳", msg: "تم تأكيد دفعك وطلبك في الطابور." },
    confirmed:        { ar: "مؤكد",           color: "#2196F3", icon: "✅", msg: "تم تأكيد طلبك." },
    in_progress:      { ar: "قيد التحضير",   color: "#FF9800", icon: "👨‍🍳", msg: "فريقنا يحضّر طلبك الآن بعناية واهتمام." },
    preparing:        { ar: "قيد التحضير",   color: "#FF9800", icon: "👨‍🍳", msg: "فريقنا يحضّر طلبك الآن بعناية واهتمام." },
    ready:            { ar: "جاهز للاستلام", color: "#4CAF50", icon: "🎉", msg: "طلبك جاهز! تفضّل للاستلام." },
    completed:        { ar: "مكتمل",          color: "#4CAF50", icon: "☕", msg: "شكراً لك! نتمنى أن تستمتع بطلبك." },
    cancelled:        { ar: "ملغي",           color: "#f44336", icon: "❌", msg: "تم إلغاء طلبك. للاستفسار تواصل معنا." },
  };
  const s = statusMap[orderStatus] || { ar: orderStatus, color: "#607D8B", icon: "📋", msg: "" };

  const itemsHtml = originalOrder?.items?.length
    ? `<table style="width:100%;margin:16px 0;border-collapse:collapse;">
        <tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr>
        ${originalOrder.items.map((i: any) => `<tr><td>${i.nameAr || i.name}</td><td style="text-align:center;">${i.quantity}</td><td>${((i.price || 0) * (i.quantity || 1)).toFixed(2)} ر.س</td></tr>`).join("")}
      </table>` : "";

  return sendMail({
    to: customerEmail,
    subject: `${s.icon} تحديث طلبك #${orderId} — ${s.ar}`,
    html: baseTemplate(`
      <h2>مرحباً ${customerName}! 👋</h2>
      <p style="color:#555;font-size:15px;">تم تحديث حالة طلبك:</p>
      <div style="text-align:center;margin:24px 0;">
        <span class="badge" style="background:${s.color};color:#fff;font-size:22px;">
          ${s.icon} ${s.ar}
        </span>
      </div>
      <div class="card">
        <div class="row"><span class="label">رقم الطلب</span><span class="value">#${orderId}</span></div>
        <div class="row"><span class="label">الإجمالي</span><span class="value">${orderTotal.toFixed(2)} ريال سعودي</span></div>
      </div>
      ${itemsHtml}
      <p style="background:#f0f9f0;border-right:4px solid ${s.color};padding:14px;border-radius:4px;color:#333;">${s.msg}</p>
      <div style="text-align:center;"><a class="btn" href="https://blackrose.com.sa/track">تتبع طلبك</a></div>
    `, `حالة طلبك: ${s.ar}`),
  });
}

// ─── Welcome email ─────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(customerEmail: string, customerName: string) {
  return sendMail({
    to: customerEmail,
    subject: `أهلاً بك في ${BRAND_NAME}! ☕`,
    html: baseTemplate(`
      <h2>أهلاً وسهلاً ${customerName}! 🎉</h2>
      <p>يسعدنا انضمامك إلى عائلة ${BRAND_NAME}. الآن يمكنك:</p>
      <ul style="color:#555;line-height:2;font-size:14px;">
        <li>☕ طلب مشروبك المفضل من أي مكان</li>
        <li>⭐ جمع النقاط والحصول على مكافآت</li>
        <li>📍 تتبع طلبك لحظة بلحظة</li>
        <li>🎁 الاستفادة من العروض الخاصة</li>
      </ul>
      <div style="text-align:center;"><a class="btn" href="https://blackrose.com.sa/menu">ابدأ طلبك الآن</a></div>
    `, "مرحباً بك في عائلتنا!"),
  });
}

// ─── Password reset (customer) ─────────────────────────────────────────────────
export async function sendPasswordResetEmail(
  customerEmail: string,
  customerName: string,
  token: string,
  resetUrl: string
) {
  return sendMail({
    to: customerEmail,
    subject: "إعادة تعيين كلمة المرور",
    html: baseTemplate(`
      <h2>طلب إعادة تعيين كلمة المرور 🔐</h2>
      <p>مرحباً ${customerName}،</p>
      <p>تلقّينا طلبًا لإعادة تعيين كلمة مرور حسابك. انقر على الزر أدناه:</p>
      <div style="text-align:center;"><a class="btn" href="${resetUrl}">إعادة تعيين كلمة المرور</a></div>
      <p style="color:#888;font-size:13px;">⏱️ هذا الرابط صالح لمدة <strong>ساعة واحدة</strong> فقط.</p>
      <p style="color:#888;font-size:13px;">إذا لم تطلب هذا، تجاهل هذا البريد بأمان.</p>
    `, "إعادة تعيين كلمة المرور"),
  });
}

// ─── OTP email ────────────────────────────────────────────────────────────────
export async function sendOTPEmail(customerEmail: string, customerName: string, otp: string) {
  return sendMail({
    to: customerEmail,
    subject: "رمز التحقق OTP",
    html: baseTemplate(`
      <h2>رمز التحقق الخاص بك 🔑</h2>
      <p>مرحباً ${customerName}،</p>
      <div style="text-align:center;margin:28px 0;">
        <div style="background:${BRAND_SECONDARY};color:#fff;display:inline-block;padding:20px 48px;border-radius:10px;">
          <p style="margin:0;font-size:12px;opacity:.7;">رمز OTP</p>
          <p style="margin:8px 0 0;font-size:44px;font-weight:bold;letter-spacing:12px;">${otp}</p>
          <p style="margin:8px 0 0;font-size:12px;opacity:.6;">صالح لمدة 10 دقائق</p>
        </div>
      </div>
      <p style="color:#888;font-size:13px;text-align:center;">إذا لم تطلب هذا الرمز، تجاهل هذا البريد.</p>
    `, `رمز OTP: ${otp}`),
  });
}

// ─── Points verification ──────────────────────────────────────────────────────
export async function sendPointsVerificationEmail(
  customerEmail: string, customerName: string,
  code: string, points: number, valueSAR: number
) {
  return sendMail({
    to: customerEmail,
    subject: "رمز التحقق لاستبدال نقاطك",
    html: baseTemplate(`
      <h2>استبدال النقاط ⭐</h2>
      <p>مرحباً ${customerName}، طلبت استبدال <strong>${points} نقطة</strong> بقيمة <strong>${valueSAR.toFixed(2)} ريال</strong>.</p>
      <div style="text-align:center;margin:24px 0;">
        <div style="background:#1a1a1a;color:#fff;display:inline-block;padding:16px 40px;border-radius:8px;">
          <p style="margin:0;font-size:12px;opacity:.7;">رمز التحقق</p>
          <p style="margin:8px 0 0;font-size:40px;font-weight:bold;letter-spacing:10px;">${code}</p>
          <p style="margin:8px 0 0;font-size:11px;opacity:.6;">صالح لمدة 5 دقائق</p>
        </div>
      </div>
    `),
  });
}

// ─── Loyalty points earned ────────────────────────────────────────────────────
export async function sendLoyaltyPointsEmail(
  customerEmail: string, customerName: string,
  pointsEarned: number, totalPoints: number
) {
  return sendMail({
    to: customerEmail,
    subject: "🌟 حصلت على نقاط جديدة!",
    html: baseTemplate(`
      <h2>مبروك ${customerName}! 🎉</h2>
      <p>تم إضافة نقاط جديدة لرصيدك:</p>
      <div class="card" style="text-align:center;">
        <p style="font-size:36px;font-weight:bold;color:${BRAND_COLOR};margin:0;">+${pointsEarned}</p>
        <p style="color:#888;margin:4px 0;">نقطة مكتسبة</p>
        <p style="font-size:20px;font-weight:bold;color:#333;margin:12px 0 0;">${totalPoints} نقطة</p>
        <p style="color:#888;margin:4px 0;">إجمالي رصيدك</p>
      </div>
      <div style="text-align:center;"><a class="btn" href="https://blackrose.com.sa/loyalty">عرض بطاقتي</a></div>
    `),
  });
}

// ─── Referral email ────────────────────────────────────────────────────────────
export async function sendReferralEmail(customerEmail: string, customerName: string, referralCode: string) {
  return sendMail({
    to: customerEmail,
    subject: "شارك وربح نقاط مع برنامج الإحالة! 🎁",
    html: baseTemplate(`
      <h2>شارك وربح ${customerName}! 🎁</h2>
      <p>شارك رمز الإحالة الخاص بك مع أصدقائك واحصل على <strong>50 نقطة</strong> لكل صديق ينضم!</p>
      <div style="text-align:center;margin:24px 0;">
        <div style="background:#f5f5f5;border:2px dashed ${BRAND_COLOR};padding:20px;border-radius:8px;display:inline-block;">
          <p style="margin:0;font-size:13px;color:#888;">رمز الإحالة</p>
          <p style="margin:8px 0;font-size:32px;font-weight:bold;color:${BRAND_COLOR};">${referralCode}</p>
        </div>
      </div>
    `),
  });
}

// ─── Promotion email ──────────────────────────────────────────────────────────
export async function sendPromotionEmail(
  customerEmail: string, customerName: string,
  subject: string, promotionDescription: string, discountCode?: string
) {
  return sendMail({
    to: customerEmail,
    subject,
    html: baseTemplate(`
      <h2>عرض خاص لك ${customerName}! 🎉</h2>
      <p style="font-size:15px;color:#444;">${promotionDescription}</p>
      ${discountCode ? `
        <div style="text-align:center;margin:24px 0;">
          <div style="background:#f5f5f5;border:2px dashed ${BRAND_COLOR};padding:16px 32px;border-radius:8px;display:inline-block;">
            <p style="margin:0;font-size:13px;color:#888;">رمز الخصم</p>
            <p style="margin:8px 0;font-size:28px;font-weight:bold;color:${BRAND_COLOR};">${discountCode}</p>
          </div>
        </div>` : ""}
      <div style="text-align:center;"><a class="btn" href="https://blackrose.com.sa/menu">تسوق الآن</a></div>
    `),
  });
}

// ─── Reservation confirmation ─────────────────────────────────────────────────
export async function sendReservationConfirmationEmail(
  customerEmail: string, customerName: string,
  tableNumber: string, reservationDate: string,
  reservationTime: string, numberOfGuests: number, expiryTime: string
) {
  const formattedDate = new Date(reservationDate).toLocaleDateString("ar-SA");
  const formattedExpiry = new Date(expiryTime).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  return sendMail({
    to: customerEmail,
    subject: `✅ تأكيد حجز الطاولة ${tableNumber}`,
    html: baseTemplate(`
      <h2>تم تأكيد حجزك! 🎉</h2>
      <p>مرحباً ${customerName}،</p>
      <div class="card">
        <div class="row"><span class="label">رقم الطاولة</span><span class="value">${tableNumber}</span></div>
        <div class="row"><span class="label">التاريخ</span><span class="value">${formattedDate}</span></div>
        <div class="row"><span class="label">الوقت</span><span class="value">${reservationTime}</span></div>
        <div class="row"><span class="label">عدد الضيوف</span><span class="value">${numberOfGuests}</span></div>
        <div class="row"><span class="label" style="color:#e53e3e;">ينتهي الحجز في</span><span class="value" style="color:#e53e3e;">${formattedExpiry}</span></div>
      </div>
      <p style="color:#888;font-size:13px;">⚠️ الطاولة محجوزة لمدة ساعة واحدة. يُرجى الحضور في الموعد.</p>
    `),
  });
}

// ─── Reservation expiry warning ───────────────────────────────────────────────
export async function sendReservationExpiryWarningEmail(
  customerEmail: string, customerName: string,
  tableNumber: string, expiryTime: string
) {
  const formatted = new Date(expiryTime).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  return sendMail({
    to: customerEmail,
    subject: "⏰ تذكير: حجزك سينتهي بعد 15 دقيقة",
    html: baseTemplate(`
      <h2 style="color:#e53e3e;">تنبيه! ⏰</h2>
      <p>مرحباً ${customerName}،</p>
      <p>حجزك في الطاولة رقم <strong>${tableNumber}</strong> سينتهي عند:</p>
      <div style="text-align:center;margin:20px 0;">
        <span style="background:#e53e3e;color:#fff;padding:12px 32px;border-radius:6px;font-size:24px;font-weight:bold;">${formatted}</span>
      </div>
      <p>يمكنك تمديد الحجز من التطبيق الآن.</p>
    `),
  });
}

// ─── Abandoned cart ────────────────────────────────────────────────────────────
export async function sendAbandonedCartEmail(customerEmail: string, customerName: string) {
  return sendMail({
    to: customerEmail,
    subject: "نسيت شيئاً في عربتك؟ 🛒",
    html: baseTemplate(`
      <h2>عربتك في انتظارك! 🛒</h2>
      <p>مرحباً ${customerName}،</p>
      <p>لاحظنا أنك أضفت أصنافاً لعربتك ولم تكمل الطلب. لا تدع قهوتك تبرد!</p>
      <div style="text-align:center;"><a class="btn" href="https://blackrose.com.sa/menu">أكمل طلبك الآن</a></div>
    `),
  });
}

// ─── DB storage alert ─────────────────────────────────────────────────────────
export async function sendDbStorageAlertEmail(dbLabel: string, usedMb: number, limitMb: number) {
  const to = process.env.ADMIN_EMAIL || process.env.NOTIFICATION_EMAIL || process.env.SMTP_FROM;
  if (!to) return false;
  const pct = Math.round((usedMb / limitMb) * 100);
  return sendMail({
    to,
    subject: `⚠️ تنبيه: قاعدة البيانات ${dbLabel} وصلت ${pct}%`,
    html: baseTemplate(`
      <h2 style="color:#e53e3e;">⚠️ تنبيه تخزين قاعدة البيانات</h2>
      <div class="card">
        <div class="row"><span class="label">قاعدة البيانات</span><span class="value">${dbLabel}</span></div>
        <div class="row"><span class="label">المستخدم</span><span class="value" style="color:#e53e3e;">${usedMb.toFixed(1)} MB</span></div>
        <div class="row"><span class="label">الحد الأقصى</span><span class="value">${limitMb} MB</span></div>
        <div class="row"><span class="label">نسبة الاستخدام</span><span class="value" style="color:#e53e3e;">${pct}%</span></div>
      </div>
    `),
  });
}

// ════════════════════════════════════════════════════════════════
//  EMPLOYEE EMAILS
// ════════════════════════════════════════════════════════════════

// ─── New employee welcome + credentials ──────────────────────────────────────
export async function sendEmployeeWelcomeEmail(
  employeeEmail: string,
  employeeName: string,
  username: string,
  tempPassword: string,
  role: string
) {
  const roleMap: Record<string, string> = {
    cashier: "كاشير", barista: "باريستا", supervisor: "مشرف",
    branch_manager: "مدير فرع", owner: "مالك", admin: "مدير نظام",
    cleaner: "نظافة", driver: "سائق", accountant: "محاسب",
  };
  const roleAr = roleMap[role] || role;
  return sendMail({
    to: employeeEmail,
    subject: `🎉 أهلاً بك في فريق ${BRAND_NAME}`,
    html: baseTemplate(`
      <h2>أهلاً ${employeeName}! 👋</h2>
      <p>يسعدنا انضمامك لفريق ${BRAND_NAME} بوظيفة <strong>${roleAr}</strong>.</p>
      <p>فيما يلي بيانات الدخول إلى بوابة الموظفين:</p>
      <div class="card">
        <div class="row"><span class="label">رابط البوابة</span><span class="value"><a href="https://blackrose.com.sa/employee">blackrose.com.sa/employee</a></span></div>
        <div class="row"><span class="label">اسم المستخدم</span><span class="value" style="font-family:monospace;font-size:16px;">${username}</span></div>
        <div class="row"><span class="label">كلمة المرور المؤقتة</span><span class="value" style="font-family:monospace;font-size:16px;">${tempPassword}</span></div>
      </div>
      <p style="background:#fff3cd;border-right:4px solid #ffc107;padding:12px;border-radius:4px;color:#856404;">
        ⚠️ يُرجى تغيير كلمة المرور فور تسجيل دخولك لأول مرة.
      </p>
      <div style="text-align:center;"><a class="btn" href="https://blackrose.com.sa/employee">سجّل دخولك الآن</a></div>
    `),
  });
}

// ─── Employee password reset (OTP code) ───────────────────────────────────────
export async function sendEmployeePasswordResetEmail(
  employeeEmail: string,
  employeeName: string,
  resetCode: string
) {
  return sendMail({
    to: employeeEmail,
    subject: "🔐 رمز إعادة تعيين كلمة المرور — بوابة الموظفين",
    html: baseTemplate(`
      <h2>إعادة تعيين كلمة المرور 🔐</h2>
      <p>مرحباً ${employeeName}،</p>
      <p>تلقّينا طلبًا لإعادة تعيين كلمة مرورك في بوابة الموظفين. استخدم الرمز أدناه:</p>
      <div style="text-align:center;margin:28px 0;">
        <div style="background:${BRAND_SECONDARY};color:#fff;display:inline-block;padding:20px 48px;border-radius:10px;">
          <p style="margin:0;font-size:12px;opacity:.7;">رمز التحقق</p>
          <p style="margin:8px 0 0;font-size:42px;font-weight:bold;letter-spacing:12px;">${resetCode}</p>
          <p style="margin:8px 0 0;font-size:12px;opacity:.6;">صالح لمدة 15 دقيقة</p>
        </div>
      </div>
      <p style="color:#888;font-size:13px;text-align:center;">إذا لم تطلب هذا، تجاهل هذا البريد وتواصل مع المدير فوراً.</p>
    `, `رمز إعادة تعيين كلمة المرور: ${resetCode}`),
  });
}

// ════════════════════════════════════════════════════════════════
//  ADMIN REPORTS (email to admin)
// ════════════════════════════════════════════════════════════════

// ─── Daily report email ───────────────────────────────────────────────────────
export async function sendAdminDailyReportEmail(report: {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  topItems: Array<{ name: string; count: number }>;
  paymentBreakdown: { cash: number; card: number; loyalty: number };
  newCustomers: number;
  cancelledOrders: number;
  lowStockItems: Array<{ name: string; current: number; min: number }>;
}) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.NOTIFICATION_EMAIL;
  if (!adminEmail) return false;

  const topItemsHtml = report.topItems.slice(0, 5).map((item, i) =>
    `<tr><td>${["🥇","🥈","🥉","4️⃣","5️⃣"][i]} ${item.name}</td><td style="text-align:center;font-weight:bold;">${item.count}</td></tr>`
  ).join("");

  const lowStockHtml = report.lowStockItems.length
    ? `<h3 style="color:#e53e3e;">⚠️ مخزون منخفض (${report.lowStockItems.length} صنف)</h3>
       <table><tr><th>الصنف</th><th>الحالي</th><th>الحد الأدنى</th></tr>
       ${report.lowStockItems.slice(0,8).map(i=>`<tr><td>${i.name}</td><td style="color:#e53e3e;">${i.current}</td><td>${i.min}</td></tr>`).join("")}
       </table>` : "";

  return sendMail({
    to: adminEmail,
    subject: `📊 التقرير اليومي — ${report.date}`,
    html: baseTemplate(`
      <h2>📊 التقرير اليومي</h2>
      <p style="color:#888;">${report.date}</p>

      <h3>ملخص اليوم</h3>
      <table>
        <tr><th>المؤشر</th><th>القيمة</th></tr>
        <tr><td>📦 إجمالي الطلبات</td><td><strong>${report.totalOrders}</strong></td></tr>
        <tr><td>💰 إجمالي الإيرادات</td><td><strong>${report.totalRevenue.toFixed(2)} ر.س</strong></td></tr>
        <tr><td>📈 متوسط قيمة الطلب</td><td>${report.avgOrderValue.toFixed(2)} ر.س</td></tr>
        <tr><td>👤 عملاء جدد</td><td>${report.newCustomers}</td></tr>
        <tr><td>❌ طلبات ملغاة</td><td style="color:#e53e3e;">${report.cancelledOrders}</td></tr>
      </table>

      <h3>طرق الدفع</h3>
      <table>
        <tr><th>الطريقة</th><th>المبلغ</th></tr>
        <tr><td>💵 نقدي</td><td>${report.paymentBreakdown.cash.toFixed(2)} ر.س</td></tr>
        <tr><td>💳 شبكة</td><td>${report.paymentBreakdown.card.toFixed(2)} ر.س</td></tr>
        <tr><td>⭐ بطاقة ولاء</td><td>${report.paymentBreakdown.loyalty.toFixed(2)} ر.س</td></tr>
      </table>

      ${report.topItems.length ? `<h3>🏆 أكثر الأصناف طلباً</h3>
      <table><tr><th>الصنف</th><th>عدد الطلبات</th></tr>${topItemsHtml}</table>` : ""}

      ${lowStockHtml}

      <div style="text-align:center;margin-top:24px;">
        <a class="btn" href="https://blackrose.com.sa/manager/dashboard">فتح لوحة التحكم</a>
      </div>
    `, `الإيرادات: ${report.totalRevenue.toFixed(2)} ر.س | الطلبات: ${report.totalOrders}`),
  });
}

// ─── Weekly report email ──────────────────────────────────────────────────────
export async function sendAdminWeeklyReportEmail(report: {
  weekLabel: string;
  totalOrders: number;
  totalRevenue: number;
  avgDailyRevenue: number;
  bestDay: string;
  bestDayRevenue: number;
  topItems: Array<{ name: string; count: number }>;
  newCustomers: number;
  returningCustomers: number;
  cancelledOrders: number;
  compareLastWeek?: { revenue: number; orders: number };
}) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.NOTIFICATION_EMAIL;
  if (!adminEmail) return false;

  const revChange = report.compareLastWeek
    ? ((report.totalRevenue - report.compareLastWeek.revenue) / (report.compareLastWeek.revenue || 1) * 100).toFixed(1)
    : null;
  const revChangeHtml = revChange
    ? `<tr><td>📊 التغير مقارنة بالأسبوع الماضي</td><td style="color:${Number(revChange)>=0?"#4CAF50":"#e53e3e"};font-weight:bold;">${Number(revChange)>=0?"▲":"▼"} ${Math.abs(Number(revChange))}%</td></tr>`
    : "";

  const topItemsHtml = report.topItems.slice(0, 5).map((item, i) =>
    `<tr><td>${["🥇","🥈","🥉","4️⃣","5️⃣"][i]} ${item.name}</td><td style="text-align:center;font-weight:bold;">${item.count}</td></tr>`
  ).join("");

  return sendMail({
    to: adminEmail,
    subject: `📈 التقرير الأسبوعي — ${report.weekLabel}`,
    html: baseTemplate(`
      <h2>📈 التقرير الأسبوعي</h2>
      <p style="color:#888;">${report.weekLabel}</p>

      <h3>ملخص الأسبوع</h3>
      <table>
        <tr><th>المؤشر</th><th>القيمة</th></tr>
        <tr><td>📦 إجمالي الطلبات</td><td><strong>${report.totalOrders}</strong></td></tr>
        <tr><td>💰 إجمالي الإيرادات</td><td><strong>${report.totalRevenue.toFixed(2)} ر.س</strong></td></tr>
        <tr><td>📅 متوسط الإيرادات اليومي</td><td>${report.avgDailyRevenue.toFixed(2)} ر.س</td></tr>
        <tr><td>🏆 أفضل يوم</td><td>${report.bestDay} (${report.bestDayRevenue.toFixed(2)} ر.س)</td></tr>
        <tr><td>👤 عملاء جدد</td><td>${report.newCustomers}</td></tr>
        <tr><td>🔄 عملاء عائدون</td><td>${report.returningCustomers}</td></tr>
        <tr><td>❌ طلبات ملغاة</td><td style="color:#e53e3e;">${report.cancelledOrders}</td></tr>
        ${revChangeHtml}
      </table>

      ${report.topItems.length ? `<h3>🏆 أكثر الأصناف طلباً هذا الأسبوع</h3>
      <table><tr><th>الصنف</th><th>عدد الطلبات</th></tr>${topItemsHtml}</table>` : ""}

      <div style="text-align:center;margin-top:24px;">
        <a class="btn" href="https://blackrose.com.sa/manager/analytics">عرض التحليلات الكاملة</a>
      </div>
    `, `الإيرادات الأسبوعية: ${report.totalRevenue.toFixed(2)} ر.س`),
  });
}
