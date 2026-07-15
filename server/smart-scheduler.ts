/**
 * BLACK ROSE CAFE — Smart Notification Scheduler
 * نظام الإشعارات الذكي والتروجي
 *
 * يعمل كل دقيقة ويتحقق من الوقت السعودي (UTC+3)
 * يرسل إشعارات مخصصة ومبدعة للعملاء والإدارة
 */

import mongoose from "mongoose";
import { PushSubscriptionModel, sendPushBySubscriptions, PushPayload } from "./push-service";
import { fireNotifyAdmins } from "./notification-engine";
import { wsManager } from "./websocket";

// ───────────────────────────────────────────────
// Helpers: Saudi time & Hijri calendar
// ───────────────────────────────────────────────

function getSaudiTime(): { hour: number; minute: number; dayOfWeek: number; dateKey: string } {
  const now = new Date();
  const saudi = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  return {
    hour: saudi.getHours(),
    minute: saudi.getMinutes(),
    dayOfWeek: saudi.getDay(), // 0=Sun, 5=Fri, 6=Sat
    dateKey: `${saudi.getFullYear()}-${saudi.getMonth()}-${saudi.getDate()}`,
  };
}

function isRamadan(): boolean {
  try {
    const parts = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      month: "numeric",
    }).formatToParts(new Date());
    const month = parts.find((p) => p.type === "month")?.value;
    return month === "9";
  } catch {
    return false;
  }
}

function getHijriDay(): number {
  try {
    const parts = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
    }).formatToParts(new Date());
    return parseInt(parts.find((p) => p.type === "day")?.value || "0");
  } catch {
    return 0;
  }
}

function getHijriMonth(): number {
  try {
    const parts = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      month: "numeric",
    }).formatToParts(new Date());
    return parseInt(parts.find((p) => p.type === "month")?.value || "0");
  } catch {
    return 0;
  }
}

// ───────────────────────────────────────────────
// Occasion Detection
// ───────────────────────────────────────────────

interface Occasion {
  name: string;
  emoji: string;
  morningMsg: string;
  eveningMsg: string;
}

function detectOccasion(): Occasion | null {
  const now = new Date();
  const saudi = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  const month = saudi.getMonth() + 1; // 1-12
  const day = saudi.getDate();

  // Saudi National Day: Sep 23
  if (month === 9 && day === 23) {
    return {
      name: "اليوم الوطني السعودي",
      emoji: "🇸🇦",
      morningMsg: "كل عام وأنتم بخير بمناسبة اليوم الوطني! 🇸🇦 احتفل بيوم وطنك مع كوب قهوة دافئ من بلاك روز",
      eveningMsg: "ليلة وطنية سعيدة! 🎆 سهرتك في ليلة اليوم الوطني ما تكتمل إلا بمشروبك المفضل من بلاك روز",
    };
  }

  // Saudi Founding Day: Feb 22
  if (month === 2 && day === 22) {
    return {
      name: "يوم التأسيس",
      emoji: "🌟",
      morningMsg: "يوم التأسيس مبارك! 🌟 اشرب قهوتك مع فخر الانتماء لهذه الأرض الطيبة ☕",
      eveningMsg: "تمسّك بجذورك وتذكّر عراقة هذه الأرض 🌿 وسهرتك ما تكتمل إلا بكوب دافئ من بلاك روز",
    };
  }

  // Hijri occasions
  const hijriMonth = getHijriMonth();
  const hijriDay = getHijriDay();

  // Eid Al-Fitr: 1 Shawwal = month 10
  if (hijriMonth === 10 && hijriDay >= 1 && hijriDay <= 3) {
    return {
      name: "عيد الفطر المبارك",
      emoji: "🌙",
      morningMsg: "عيد فطر مبارك! 🌙✨ كل عام وأنتم بأتم الصحة والسعادة، زورونا واحتفلوا معنا بأجمل المشروبات",
      eveningMsg: "مساء العيد فرحة ومسرة ✨ لا تنسوا زيارتنا وتحلية سهرتكم بكوب رائع من بلاك روز 🥤",
    };
  }

  // Eid Al-Adha: 10 Dhu al-Hijjah = month 12
  if (hijriMonth === 12 && hijriDay >= 10 && hijriDay <= 13) {
    return {
      name: "عيد الأضحى المبارك",
      emoji: "🐑",
      morningMsg: "عيد أضحى مبارك! 🐑 كل عام وأنتم بخير، استقبلوا يوم العيد بقهوة صافية من بلاك روز ☕",
      eveningMsg: "سهرة العيد أجمل مع العيلة والأهل 💛 ومشروبكم المفضل من بلاك روز في انتظاركم 🥤",
    };
  }

  return null;
}

// ───────────────────────────────────────────────
// Message Pools (random selection for variety)
// ───────────────────────────────────────────────

const MORNING_MESSAGES = [
  { title: "☀️ صباح أحلى", body: "صباح الخير! يومك يبدأ بشكل أفضل مع قهوتك المفضلة ☕ — بلاك روز في انتظارك" },
  { title: "🌅 صباح النور", body: "صباحك نور وقهوتك أنور 🌟 ابدأ يومك بنشاط مع كوب مميز من بلاك روز" },
  { title: "☕ وقت القهوة", body: "لا تبدأ يومك بدون قهوتك! ☕ بلاك روز حاضر لك بأشهى المشروبات" },
  { title: "🌸 صباح السعادة", body: "كل صباح جديد فرصة جديدة 💛 وقهوة من بلاك روز تجعله أجمل" },
  { title: "✨ صباح مميز", body: "صباحك ما يكتمل إلا بكوب قهوة مصنوع بحب من بلاك روز ☕" },
];

const RAMADAN_SUHOOR_MESSAGES = [
  { title: "🌙 وقت السحور", body: "لا تفوّت السحور! 🌙 بلاك روز يرحب بك في وقت السحور بمشروباتنا الدافئة" },
  { title: "⭐ تسحّر معنا", body: "السحور بركة ومشروب من بلاك روز يجعله أحلى 🌟 تعال تسحّر معنا" },
];

const RAMADAN_IFTAR_MESSAGES = [
  { title: "🌙 قرب وقت الإفطار", body: "بعد لحظات ينادي المؤذن 🌙 وبلاك روز جاهز بأجمل المشروبات لإفطارك" },
  { title: "🌅 استعد للإفطار", body: "على مائدة الإفطار، لا ينقصها إلا مشروبك المفضل من بلاك روز ✨" },
];

const EVENING_MESSAGES = [
  { title: "🌙 مساء الخير", body: "ما جاك نوم؟ 😄 سهرتك ما تحلى إلا بمشروبك المفضل من عندنا في بلاك روز 🥤" },
  { title: "✨ سهرة حلوة", body: "الليل طويل والسهرة أحلى بكوب مميز من بلاك روز ☕ نحن في انتظارك" },
  { title: "🌟 سهرتك ناقصة", body: "شعورك إن سهرتك ناقص شي؟ 😊 الجواب عندنا في بلاك روز — مشروبك المفضل جاهز" },
  { title: "🌙 الليل دا لك", body: "بعد يوم طويل، كافئ نفسك بمشروبك المفضل 🥤 بلاك روز مفتوح لك الآن" },
];

const WEEKEND_MESSAGES = [
  { title: "🎉 نهاية الأسبوع", body: "ويك إند سعيد! 🎉 زُر بلاك روز مع أهلك وأصحابك واستمتعوا بأجمل المشروبات" },
  { title: "☕ يوم عطلة", body: "يوم إجازة ما يكتمل إلا بقهوة هادئة من بلاك روز ☕ — تعال وخذ وقتك" },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ───────────────────────────────────────────────
// Personalized message using customer favorite
// ───────────────────────────────────────────────

async function buildPersonalizedMessage(
  customerId: string,
  baseTitle: string,
  baseBody: string
): Promise<{ title: string; body: string }> {
  try {
    const OrderCollection = mongoose.connection.collection("orders");
    const result = await OrderCollection.aggregate([
      { $match: { customerId } },
      { $unwind: "$items" },
      { $group: { _id: "$items.nameAr", count: { $sum: "$items.quantity" } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]).toArray();

    if (result.length > 0 && result[0]._id) {
      const favDrink = result[0]._id as string;
      return {
        title: baseTitle,
        body: baseBody.replace("مشروبك المفضل", `${favDrink} المميز`) + ` 🎯`,
      };
    }
  } catch {
    // fallback to generic
  }
  return { title: baseTitle, body: baseBody };
}

// ───────────────────────────────────────────────
// Broadcast to all customer subscribers
// ───────────────────────────────────────────────

async function broadcastToCustomers(payload: PushPayload, personalizeForCustomer = false) {
  try {
    const subs = await PushSubscriptionModel.find({ userType: "customer" }).lean();
    if (subs.length === 0) return;

    if (personalizeForCustomer) {
      // Group by userId for personalization
      const grouped: Record<string, any[]> = {};
      for (const sub of subs) {
        const uid = sub.userId || "anonymous";
        if (!grouped[uid]) grouped[uid] = [];
        grouped[uid].push(sub);
      }

      for (const [userId, userSubs] of Object.entries(grouped)) {
        const personalized = await buildPersonalizedMessage(userId, payload.title, payload.body);
        await sendPushBySubscriptions(userSubs, { ...payload, ...personalized });
      }
    } else {
      await sendPushBySubscriptions(subs, payload);
    }

    console.log(`[SCHEDULER] 📤 Sent to ${subs.length} customer subscriptions`);
  } catch (err) {
    console.error("[SCHEDULER] broadcastToCustomers error:", err);
  }
}

// ───────────────────────────────────────────────
// Admin Daily Summary
// ───────────────────────────────────────────────

async function buildDailyReportData() {
  const OrderCollection = mongoose.connection.collection("orders");
  const RawItemCollection = mongoose.connection.collection("rawitems");
  const CustomerCollection = mongoose.connection.collection("customers");

  const now = new Date();
  const saudi = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  const startOfDay = new Date(saudi);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(saudi);
  endOfDay.setHours(23, 59, 59, 999);

  const allOrders = await OrderCollection.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } }).toArray();
  const activeOrders = allOrders.filter((o: any) => o.status !== "cancelled");
  const cancelledOrders = allOrders.filter((o: any) => o.status === "cancelled");

  const totalRevenue = activeOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
  const paymentBreakdown = { cash: 0, card: 0, loyalty: 0 };
  for (const o of activeOrders as any[]) {
    const m = (o.paymentMethod || "").toLowerCase();
    if (m.includes("cash") || m === "نقدي") paymentBreakdown.cash += o.totalAmount || 0;
    else if (m.includes("card") || m.includes("شبكة") || m.includes("mada")) paymentBreakdown.card += o.totalAmount || 0;
    else if (m.includes("loyalty") || m.includes("قيروكس") || m.includes("بطاقة")) paymentBreakdown.loyalty += o.totalAmount || 0;
    else paymentBreakdown.cash += o.totalAmount || 0;
  }

  const itemCounts: Record<string, number> = {};
  for (const o of activeOrders as any[]) {
    for (const item of (o.items || [])) {
      const name = item.nameAr || item.name || "غير معروف";
      itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 1);
    }
  }
  const topItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

  const lowStockRaw = await RawItemCollection.find({ $expr: { $lte: ["$currentQuantity", "$minimumQuantity"] } }).toArray();
  const lowStockItems = lowStockRaw.map((i: any) => ({ name: i.nameAr || i.name, current: i.currentQuantity || 0, min: i.minimumQuantity || 0 }));

  const newCustomers = await CustomerCollection.countDocuments({ createdAt: { $gte: startOfDay } });

  const dateLabel = saudi.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return {
    date: dateLabel,
    totalOrders: activeOrders.length,
    totalRevenue,
    avgOrderValue: activeOrders.length ? totalRevenue / activeOrders.length : 0,
    topItems,
    paymentBreakdown,
    newCustomers,
    cancelledOrders: cancelledOrders.length,
    lowStockItems,
  };
}

async function sendAdminDailySummary() {
  try {
    const report = await buildDailyReportData();

    // 1. Push notification (in-app)
    let summaryBody = `📦 الطلبات: ${report.totalOrders} طلب\n💰 الإيرادات: ${report.totalRevenue.toFixed(2)} ر.س`;
    if (report.topItems[0]) summaryBody += `\n🏆 الأكثر طلباً: ${report.topItems[0].name} (${report.topItems[0].count} مرة)`;
    if (report.lowStockItems.length > 0) summaryBody += `\n⚠️ مخزون منخفض: ${report.lowStockItems.length} صنف`;

    await fireNotifyAdmins("📊 تقرير اليوم — بلاك روز", summaryBody, {
      type: "info", icon: "📊", link: "/manager/dashboard", tenantId: "demo-tenant",
    });

    // 2. Email report
    const { sendAdminDailyReportEmail } = await import("./mail-service");
    await sendAdminDailyReportEmail(report);

    // 3. Low stock push alert
    if (report.lowStockItems.length > 0) {
      const itemNames = report.lowStockItems.slice(0, 5).map(i => i.name).join("، ");
      await fireNotifyAdmins("⚠️ تنبيه مخزون منخفض", `الأصناف التالية تحتاج تجديد: ${itemNames}`, {
        type: "warning", icon: "⚠️", link: "/manager/inventory", tenantId: "demo-tenant",
      });
    }

    console.log(`[SCHEDULER] 📊 Daily report sent (push+email) — ${report.totalOrders} orders, ${report.totalRevenue.toFixed(2)} SAR`);
  } catch (err) {
    console.error("[SCHEDULER] sendAdminDailySummary error:", err);
  }
}

async function sendAdminWeeklySummary() {
  try {
    const OrderCollection = mongoose.connection.collection("orders");
    const CustomerCollection = mongoose.connection.collection("customers");

    const now = new Date();
    const saudi = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
    const startOfWeek = new Date(saudi);
    startOfWeek.setDate(saudi.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const allOrders = await OrderCollection.find({ createdAt: { $gte: startOfWeek } }).toArray();
    const active = allOrders.filter((o: any) => o.status !== "cancelled");
    const cancelled = allOrders.filter((o: any) => o.status === "cancelled");
    const totalRevenue = active.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);

    // Daily breakdown to find best day
    const dayRevenue: Record<string, number> = {};
    const dayNames = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
    for (const o of active as any[]) {
      const d = new Date(o.createdAt).toLocaleDateString("en-US", { timeZone: "Asia/Riyadh", weekday: "long" });
      dayRevenue[d] = (dayRevenue[d] || 0) + (o.totalAmount || 0);
    }
    const bestDayEntry = Object.entries(dayRevenue).sort((a, b) => b[1] - a[1])[0];
    const dayMap: Record<string,string> = { Sunday:"الأحد", Monday:"الاثنين", Tuesday:"الثلاثاء", Wednesday:"الأربعاء", Thursday:"الخميس", Friday:"الجمعة", Saturday:"السبت" };
    const bestDay = bestDayEntry ? (dayMap[bestDayEntry[0]] || bestDayEntry[0]) : "-";
    const bestDayRevenue = bestDayEntry ? bestDayEntry[1] : 0;

    // Top items
    const itemCounts: Record<string, number> = {};
    for (const o of active as any[]) {
      for (const item of (o.items || [])) {
        const name = item.nameAr || item.name || "غير معروف";
        itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 1);
      }
    }
    const topItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

    // Customers
    const newCustomers = await CustomerCollection.countDocuments({ createdAt: { $gte: startOfWeek } });

    // Last week comparison
    const prevStart = new Date(startOfWeek); prevStart.setDate(prevStart.getDate() - 7);
    const prevOrders = await OrderCollection.find({ createdAt: { $gte: prevStart, $lt: startOfWeek }, status: { $ne: "cancelled" } }).toArray();
    const prevRevenue = prevOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);

    const startLabel = startOfWeek.toLocaleDateString("ar-SA", { day: "numeric", month: "long" });
    const endLabel = saudi.toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" });

    const { sendAdminWeeklyReportEmail } = await import("./mail-service");
    await sendAdminWeeklyReportEmail({
      weekLabel: `${startLabel} – ${endLabel}`,
      totalOrders: active.length,
      totalRevenue,
      avgDailyRevenue: totalRevenue / 7,
      bestDay,
      bestDayRevenue,
      topItems,
      newCustomers,
      returningCustomers: Math.max(0, active.length - newCustomers),
      cancelledOrders: cancelled.length,
      compareLastWeek: { revenue: prevRevenue, orders: prevOrders.length },
    });

    console.log(`[SCHEDULER] 📈 Weekly report emailed — ${active.length} orders, ${totalRevenue.toFixed(2)} SAR`);
  } catch (err) {
    console.error("[SCHEDULER] sendAdminWeeklySummary error:", err);
  }
}

// ───────────────────────────────────────────────
// Smart Stock Alert (sent throughout the day)
// ───────────────────────────────────────────────

async function checkAndAlertLowStock() {
  try {
    const RawItemCollection = mongoose.connection.collection("rawitems");
    const criticalItems = await RawItemCollection.find({
      $expr: { $lte: ["$currentQuantity", { $multiply: ["$minimumQuantity", 0.5] }] },
    }).toArray();

    if (criticalItems.length === 0) return;

    const itemNames = criticalItems.slice(0, 3).map((i: any) => i.nameAr || i.name).join("، ");
    const moreCount = criticalItems.length > 3 ? ` و${criticalItems.length - 3} أخرى` : "";

    await fireNotifyAdmins(
      "🚨 تحذير: مخزون حرج!",
      `${itemNames}${moreCount} — الكمية وصلت لمستوى حرج، يجب الطلب فوراً`,
      {
        type: "warning",
        icon: "🚨",
        link: "/employee/admin/inventory",
        tenantId: "demo-tenant",
      }
    );
    console.log(`[SCHEDULER] 🚨 Critical stock alert sent for ${criticalItems.length} items`);
  } catch (err) {
    console.error("[SCHEDULER] checkAndAlertLowStock error:", err);
  }
}

// ───────────────────────────────────────────────
// Daily tracking — what was sent today
// ───────────────────────────────────────────────

const sentToday = new Set<string>();
let lastDateKey = "";

function resetDailyTrackerIfNewDay(dateKey: string) {
  if (dateKey !== lastDateKey) {
    sentToday.clear();
    lastDateKey = dateKey;
    console.log("[SCHEDULER] 🗓️ New day detected — daily tracker reset");
  }
}

function alreadySent(key: string): boolean {
  return sentToday.has(key);
}

function markSent(key: string) {
  sentToday.add(key);
}

// ───────────────────────────────────────────────
// Main Scheduler — runs every minute
// ───────────────────────────────────────────────

// Export for manual triggering via API
export async function sendAdminDailySummaryNow() {
  await sendAdminDailySummary();
}

export function startSmartScheduler() {
  console.log("[SCHEDULER] 🚀 Smart Notification Scheduler started");

  setInterval(async () => {
    try {
      const { hour, minute, dayOfWeek, dateKey } = getSaudiTime();
      resetDailyTrackerIfNewDay(dateKey);

      const ramadan = isRamadan();
      const occasion = detectOccasion();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Fri/Sat

      // ─── SPECIAL OCCASION morning (8:00 AM) ───
      if (hour === 8 && minute === 0 && occasion && !alreadySent("occasion-morning")) {
        markSent("occasion-morning");
        await broadcastToCustomers({
          title: `${occasion.emoji} ${occasion.name}`,
          body: occasion.morningMsg,
          url: "/menu",
          tag: "occasion-morning",
          type: "promo",
        });
      }

      // ─── RAMADAN: Suhoor reminder (3:30 AM) ───
      else if (hour === 3 && minute === 30 && ramadan && !alreadySent("suhoor")) {
        markSent("suhoor");
        const msg = pickRandom(RAMADAN_SUHOOR_MESSAGES);
        await broadcastToCustomers({
          ...msg,
          url: "/menu",
          tag: "suhoor",
          type: "promo",
        });
      }

      // ─── MORNING GREETING (8:00 AM) ───
      else if (hour === 8 && minute === 0 && !alreadySent("morning") && !occasion) {
        markSent("morning");
        let msg: { title: string; body: string };
        if (isWeekend) {
          msg = pickRandom(WEEKEND_MESSAGES);
        } else if (ramadan) {
          msg = { title: "🌙 صباح رمضان المبارك", body: "رمضان كريم! صباحك مبارك 🌙 بلاك روز يرحب بك بمشروبات رمضانية مميزة" };
        } else {
          msg = pickRandom(MORNING_MESSAGES);
        }
        await broadcastToCustomers({ ...msg, url: "/menu", tag: "morning-greeting", type: "promo" }, true);
      }

      // ─── MID-MORNING personalized drink nudge (10:30 AM) ───
      else if (hour === 10 && minute === 30 && !alreadySent("midmorning") && !ramadan) {
        markSent("midmorning");
        // Only send on non-weekend days to avoid over-notification
        if (!isWeekend) {
          await broadcastToCustomers({
            title: "☕ وقتك الآن!",
            body: "الساعة العاشرة والنص — وقت مثالي لمشروبك المفضل من بلاك روز ☕",
            url: "/menu",
            tag: "midmorning-nudge",
            type: "promo",
          }, true);
        }
      }

      // ─── RAMADAN: Pre-Iftar reminder (30 min before) — ~5:30 PM in Ramadan (varies by season) ───
      else if (hour === 17 && minute === 30 && ramadan && !alreadySent("iftar-reminder")) {
        markSent("iftar-reminder");
        const msg = pickRandom(RAMADAN_IFTAR_MESSAGES);
        await broadcastToCustomers({ ...msg, url: "/menu", tag: "iftar-reminder", type: "promo" });
      }

      // ─── SPECIAL OCCASION evening (9:00 PM) ───
      else if (hour === 21 && minute === 0 && occasion && !alreadySent("occasion-evening")) {
        markSent("occasion-evening");
        await broadcastToCustomers({
          title: `${occasion.emoji} ${occasion.name}`,
          body: occasion.eveningMsg,
          url: "/menu",
          tag: "occasion-evening",
          type: "promo",
        });
      }

      // ─── EVENING / NIGHT (9:00 PM) ───
      else if (hour === 21 && minute === 0 && !alreadySent("evening") && !occasion) {
        markSent("evening");
        const msg = ramadan
          ? { title: "🌙 ليلة رمضانية", body: "ليلة رمضان تستحق مشروباً مميزاً ✨ زُر بلاك روز واستمتع بأجواء رمضان" }
          : pickRandom(EVENING_MESSAGES);
        await broadcastToCustomers({ ...msg, url: "/menu", tag: "evening-greeting", type: "promo" }, true);
      }

      // ─── ADMIN DAILY SUMMARY (11:00 PM) ───
      else if (hour === 23 && minute === 0 && !alreadySent("admin-summary")) {
        markSent("admin-summary");
        await sendAdminDailySummary();
      }

      // ─── ADMIN WEEKLY REPORT (Sunday 11:30 PM) ───
      else if (dayOfWeek === 0 && hour === 23 && minute === 30 && !alreadySent("admin-weekly")) {
        markSent("admin-weekly");
        await sendAdminWeeklySummary();
      }

      // ─── CRITICAL STOCK CHECK (every 4 hours: 8 AM, 12 PM, 4 PM, 8 PM) ───
      if ([8, 12, 16, 20].includes(hour) && minute === 0 && !alreadySent(`stock-check-${hour}`)) {
        markSent(`stock-check-${hour}`);
        await checkAndAlertLowStock();
      }

      // ─── CAR ORDER PREPARATION ALERT (every minute) ───────────────────────
      await checkCarOrderPreparationAlerts();

    } catch (err) {
      console.error("[SCHEDULER] Tick error:", err);
    }
  }, 60_000); // every minute
}

// ── Car Order 10-Minute Preparation Alert ────────────────────────────────────
async function checkCarOrderPreparationAlerts() {
  try {
    const OrderModel = mongoose.models["Order"] || mongoose.model("Order", new mongoose.Schema({}, { strict: false }));
    const now = new Date();
    const nowSaudi = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
    const currentHHMM = `${nowSaudi.getHours().toString().padStart(2, "0")}:${nowSaudi.getMinutes().toString().padStart(2, "0")}`;

    // Find car_pickup orders with an arrivalTime set, not yet alerted, still active
    const pendingCarOrders = await OrderModel.find({
      $or: [{ orderType: "car_pickup" }, { orderType: "car-pickup" }, { carPickup: true }],
      arrivalTime: { $exists: true, $nin: [null, ""] },
      preparationAlertSent: { $ne: true },
      status: { $in: ["pending", "payment_confirmed", "confirmed", "in_progress"] },
    }).lean();

    for (const order of pendingCarOrders) {
      const arrivalTime = (order as any).arrivalTime as string;
      if (!arrivalTime || !/^\d{2}:\d{2}$/.test(arrivalTime)) continue;

      const [arrH, arrM] = arrivalTime.split(":").map(Number);
      const arrivalToday = new Date(nowSaudi);
      arrivalToday.setHours(arrH, arrM, 0, 0);

      const diffMs = arrivalToday.getTime() - nowSaudi.getTime();
      const diffMin = Math.floor(diffMs / 60000);

      // Trigger when 10 minutes or less before arrival (but not past it)
      if (diffMin <= 10 && diffMin >= -5) {
        await OrderModel.updateOne({ _id: (order as any)._id }, { $set: { preparationAlertSent: true } });

        // Broadcast via WebSocket manager
        wsManager.broadcastCarPreparationAlert({
          _id: String((order as any)._id),
          orderNumber: (order as any).orderNumber,
          dailyNumber: (order as any).dailyNumber,
          customerName: (order as any).customerName,
          customerPhone: (order as any).customerPhone,
          arrivalTime,
          carType: (order as any).carType,
          carColor: (order as any).carColor,
          plateNumber: (order as any).plateNumber || (order as any).carPlate,
          items: (order as any).items,
          totalAmount: (order as any).totalAmount,
          diffMin,
        });
        console.log(`[SCHEDULER] 🚗 Car order prep alert sent: #${(order as any).orderNumber} arrives at ${arrivalTime} (${diffMin} min)`);
      }
    }
  } catch (err) {
    console.error("[SCHEDULER] Car prep alert error:", err);
  }
}
