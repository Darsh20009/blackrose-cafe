import crypto from "crypto";
import type { Express } from "express";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { CustomerModel, EmployeeModel, LoginOTPModel } from "@shared/schema";
import { sendQiroxWhatsAppCode } from "./qirox-project-integrations";

type UserType = "employee" | "customer";

function normalizePhone(value: unknown): string | null {
  let input = String(value ?? "")
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .trim();

  if (input.startsWith("00")) input = `+${input.slice(2).replace(/\D/g, "")}`;
  const parsed = parsePhoneNumberFromString(input, "SA");
  return parsed?.isValid() ? parsed.number : null;
}

function phoneAliases(e164Phone: string) {
  const aliases = new Set([e164Phone, e164Phone.slice(1), `00${e164Phone.slice(1)}`]);
  const parsed = parsePhoneNumberFromString(e164Phone);
  if (parsed?.country === "SA") {
    aliases.add(parsed.nationalNumber);
    aliases.add(`0${parsed.nationalNumber}`);
  }
  return [...aliases];
}

function hashOtp(userType: UserType, phone: string, code: string) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret === "dev-secret") {
    throw new Error("A strong SESSION_SECRET is required for OTP login");
  }
  return crypto.createHmac("sha256", sessionSecret).update(`${userType}:${phone}:${code}`).digest("hex");
}

function saveSession(req: any) {
  return new Promise<void>((resolve, reject) => {
    req.session.save((error: Error | null) => error ? reject(error) : resolve());
  });
}

function regenerateSession(req: any) {
  return new Promise<void>((resolve, reject) => {
    req.session.regenerate((error: Error | null) => error ? reject(error) : resolve());
  });
}

async function findEmployee(phone: string) {
  return EmployeeModel.findOne({ phone: { $in: phoneAliases(phone) } });
}

async function findCustomer(phone: string) {
  return CustomerModel.findOne({ phone: { $in: phoneAliases(phone) } });
}

export function registerPhoneOtpAuthRoutes(app: Express) {
  app.post("/api/auth/otp/request", async (req, res) => {
    try {
      const userType = req.body?.userType as UserType;
      const phone = normalizePhone(req.body?.phone);
      if (!phone || !["employee", "customer"].includes(userType)) {
        return res.status(400).json({ error: "أدخل رقم جوال صحيحاً مع اختيار مفتاح البلد" });
      }

      const employee = userType === "employee" ? await findEmployee(phone) : null;
      if (userType === "employee" && !employee) {
        const customer = await findCustomer(phone);
        if (customer) {
          return res.status(403).json({
            error: "هذا الرقم مسجل كعميل وليس كموظف، ولا يملك صلاحية الدخول إلى بوابة الموظفين.",
          });
        }
        return res.status(404).json({
          error: "رقم الجوال غير مسجل ضمن حسابات الموظفين. تواصل مع الإدارة لإضافته.",
        });
      }

      if (userType === "employee" && [0, false, "0"].includes(employee!.isActivated as any)) {
        return res.status(403).json({
          error: "حساب الموظف غير مفعل من الإدارة. تواصل مع مديرك.",
        });
      }

      const code = String(crypto.randomInt(100000, 1_000_000));
      const now = new Date();
      const cooldownBefore = new Date(now.getTime() - 60_000);
      const codeHash = hashOtp(userType, phone, code);
      let reservation: any;

      try {
        reservation = await LoginOTPModel.findOneAndUpdate(
          {
            phone,
            userType,
            $or: [
              { lastSentAt: { $exists: false } },
              { lastSentAt: { $lte: cooldownBefore } },
            ],
          },
          {
            $set: {
              codeHash,
              expiresAt: new Date(now.getTime() + 5 * 60_000),
              used: false,
              attempts: 0,
              lastSentAt: now,
            },
            $setOnInsert: { phone, userType },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } catch (error: any) {
        if (error?.code === 11000) {
          return res.status(429).json({ error: "انتظر دقيقة قبل طلب رمز جديد" });
        }
        throw error;
      }

      if (!reservation) {
        return res.status(429).json({ error: "انتظر دقيقة قبل طلب رمز جديد" });
      }

      const customer = userType === "customer" ? await findCustomer(phone) : null;
      try {
        await sendQiroxWhatsAppCode(
          {
            phone,
            name: employee?.fullName || customer?.name || String(req.body?.name || "").trim() || "عميل",
          },
          code,
        );
      } catch (error) {
        await LoginOTPModel.updateOne({ _id: reservation._id }, { $set: { used: true } });
        console.error(
          "[AUTH-OTP] WhatsApp delivery failed:",
          error instanceof Error ? error.message : "Unknown delivery error",
        );
        return res.status(503).json({
          error: "تعذر إرسال رمز واتساب الآن. تحقق من إعداد خدمة الرسائل ثم حاول مجدداً.",
        });
      }

      return res.json({
        accepted: true,
        message: userType === "employee"
          ? "تم إرسال رمز واتساب إلى الرقم المسجل، وهو صالح لمدة خمس دقائق."
          : "إذا كان الحساب موجوداً ومفعلاً، فقد أرسلنا رمزاً صالحاً لمدة خمس دقائق.",
      });
    } catch (error) {
      console.error("[AUTH-OTP] Failed to request login code");
      return res.status(500).json({ error: "تعذر طلب رمز الدخول. حاول مجدداً." });
    }
  });

  app.post("/api/auth/otp/verify", async (req, res) => {
    try {
      const userType = req.body?.userType as UserType;
      const phone = normalizePhone(req.body?.phone);
      const code = String(req.body?.code || "").trim();
      if (!phone || !["employee", "customer"].includes(userType) || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: "تحقق من رقم الجوال ورمز التحقق المكوّن من 6 أرقام" });
      }

      const employee = userType === "employee" ? await findEmployee(phone) : null;
      if (userType === "employee" && (!employee || [0, false, "0"].includes(employee.isActivated as any))) {
        return res.status(403).json({ error: "الحساب غير مفعل من الإدارة. تواصل مع مديرك." });
      }

      const expectedHash = hashOtp(userType, phone, code);
      const record = await LoginOTPModel.findOne({
        phone,
        userType,
        used: false,
        expiresAt: { $gt: new Date() },
      });
      if (!record || record.attempts >= 5) {
        return res.status(400).json({ error: "الرمز غير صحيح أو منتهي الصلاحية. اطلب رمزاً جديداً." });
      }

      const actual = Buffer.from(record.codeHash, "hex");
      const expected = Buffer.from(expectedHash, "hex");
      const matches = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
      if (!matches) {
        await LoginOTPModel.updateOne(
          { _id: record._id, used: false },
          { $inc: { attempts: 1 } },
        );
        return res.status(400).json({ error: "الرمز غير صحيح أو منتهي الصلاحية" });
      }

      const existingCustomer = userType === "customer" ? await findCustomer(phone) : null;
      const newCustomerName = String(req.body?.name || "").trim();
      const newCustomerEmail = String(req.body?.email || "").trim();
      const deferRegistration = req.body?.deferRegistration === true;
      if (userType === "customer" && !existingCustomer && !newCustomerName && deferRegistration) {
        return res.json({ userType, requiresRegistration: true });
      }
      if (userType === "customer" && !existingCustomer && (newCustomerName.length < 2 || newCustomerName.length > 100)) {
        return res.status(400).json({ error: "لإنشاء حساب جديد، أدخل اسماً من حرفين إلى 100 حرف" });
      }
      if (userType === "customer" && !existingCustomer && newCustomerEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomerEmail)) {
          return res.status(400).json({ error: "صيغة البريد الإلكتروني غير صحيحة" });
        }
        const emailOwner = await CustomerModel.findOne({ email: newCustomerEmail });
        if (emailOwner) {
          return res.status(409).json({ error: "هذا البريد الإلكتروني مرتبط بحساب آخر. استخدم بريداً مختلفاً." });
        }
      }

      const consumed = await LoginOTPModel.findOneAndUpdate(
        {
          _id: record._id,
          codeHash: expectedHash,
          used: false,
          attempts: { $lt: 5 },
          expiresAt: { $gt: new Date() },
        },
        { $set: { used: true } },
        { new: true },
      );
      if (!consumed) {
        return res.status(400).json({ error: "الرمز لم يعد صالحاً. اطلب رمزاً جديداً." });
      }

      if (userType === "employee") {
        if (!employee) return res.status(403).json({ error: "تعذر العثور على حساب الموظف" });
        await regenerateSession(req);
        const employeeId = employee._id.toString();
        const restoreKey = crypto.randomBytes(32).toString("hex");
        await EmployeeModel.findByIdAndUpdate(employee._id, {
          $set: { lastRestoreKey: restoreKey, restoreKeyIssuedAt: new Date() },
        });
        const sessionEmployee = {
          id: employeeId,
          username: employee.username,
          role: employee.role,
          branchId: employee.branchId,
          fullName: employee.fullName,
          tenantId: employee.tenantId || "demo-tenant",
        };
        req.session.employee = sessionEmployee;
        req.session.restoreKey = restoreKey;
        await saveSession(req);

        const employeeData = employee.toObject();
        delete employeeData.password;
        delete employeeData.lastRestoreKey;
        return res.json({ userType, user: { ...employeeData, id: employeeId }, restoreKey });
      }

      let customer = existingCustomer;
      if (!customer) {
        try {
          customer = await CustomerModel.create({
            phone,
            name: newCustomerName,
            ...(newCustomerEmail ? { email: newCustomerEmail } : {}),
            registeredBy: "self",
            isPasswordSet: 0,
          });
        } catch (error: any) {
          if (error?.code !== 11000) throw error;
          customer = await findCustomer(phone);
          if (!customer && newCustomerEmail) {
            const emailOwner = await CustomerModel.findOne({ email: newCustomerEmail });
            if (emailOwner) {
              return res.status(409).json({ error: "هذا البريد الإلكتروني مرتبط بحساب آخر. استخدم بريداً مختلفاً." });
            }
          }
        }
      }
      if (!customer) {
        return res.status(500).json({ error: "تعذر إنشاء حساب العميل" });
      }

      await regenerateSession(req);
      const customerData = {
        ...customer.toObject(),
        id: customer.id || customer._id.toString(),
      };
      delete customerData.password;
      delete customerData.walletPin;
      req.session.customer = customerData;
      await saveSession(req);
      return res.json({ userType, user: customerData });
    } catch (error) {
      console.error("[AUTH-OTP] Login verification failed");
      return res.status(500).json({ error: "تعذر إكمال تسجيل الدخول. حاول مجدداً." });
    }
  });
}