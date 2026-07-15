import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import compression from "compression";
import mongoose from "mongoose";
import { registerRoutes } from "../server/routes";
import { registerQiroxRoutes } from "../server/qirox-admin";
import { initWebPush } from "../server/push-service";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set");
}

// Cache app across cold starts (Vercel reuses the same instance when warm)
let cachedApp: express.Express | null = null;
let isDbConnected = false;

async function connectDatabase() {
  if (isDbConnected && mongoose.connection.readyState === 1) return;

  try {
    await mongoose.connect(MONGODB_URI!, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      connectTimeoutMS: 10000,
    });
    isDbConnected = true;
    console.log("✅ MongoDB connected (serverless)");

    // Sync default accounts
    try {
      const bcrypt = await import("bcryptjs");
      const { v4: uuidv4 } = await import("uuid");
      const { EmployeeModel } = await import("../shared/schema");
      const adminPassword = await bcrypt.hash("admin", 10);
      const ownerPassword = await bcrypt.hash("123456", 10);

      const adminExists = await EmployeeModel.findOne({ username: "admin" });
      if (!adminExists) {
        await EmployeeModel.create({
          id: uuidv4(), tenantId: "demo-tenant", username: "admin",
          password: adminPassword, fullName: "مدير النظام", role: "admin",
          phone: "0000000002", jobTitle: "مدير عام", isActivated: 1, isActive: 1,
        });
      } else {
        await EmployeeModel.updateOne({ username: "admin" }, {
          $set: { password: adminPassword, role: "admin", isActivated: 1, isActive: 1 }
        });
      }

      const ownerExists = await EmployeeModel.findOne({ username: "owner" });
      if (!ownerExists) {
        await EmployeeModel.create({
          id: uuidv4(), tenantId: "demo-tenant", username: "owner",
          password: ownerPassword, fullName: "المالك", role: "owner",
          phone: "0000000001", jobTitle: "المالك", isActivated: 1, isActive: 1,
        });
      } else {
        await EmployeeModel.updateOne({ username: "owner" }, {
          $set: { password: ownerPassword, role: "owner", isActivated: 1, isActive: 1 }
        });
      }
    } catch (err) {
      console.error("Account sync error:", err);
    }
  } catch (error) {
    isDbConnected = false;
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

async function createApp() {
  if (cachedApp) return cachedApp;

  await connectDatabase();

  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.geidea.net", "https://*.paymob.com", "blob:"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:", "https://*.geidea.net", "https://*.paymob.com"],
          frameSrc: ["'self'", "https://*.geidea.net", "https://js.geidea.net", "https://*.paymob.com", "https://accept.paymob.com", "https://ksa.paymob.com"],
          frameAncestors: ["'self'", "https://*.paymob.com"],
          workerSrc: ["'self'", "blob:"],
          objectSrc: ["'none'"],
          scriptSrcAttr: ["'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use("/api/employees/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }));
  app.use("/api/customers/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }));
  app.use("/api/customers/register", rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }));
  app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

  app.use(compression({ level: 6, threshold: 1024 }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));
  app.use(mongoSanitize({ replaceWith: "_" }));
  app.use(hpp());
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With, x-employee-id, x-restore-key");
    res.header("Permissions-Policy", "usb=*, serial=*");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret",
      resave: false,
      saveUninitialized: false,
      name: "qirox.sid",
      store: MongoStore.create({
        mongoUrl: MONGODB_URI!,
        collectionName: "sessions",
        ttl: 30 * 24 * 60 * 60,
        autoRemove: "native",
        touchAfter: 24 * 3600,
      }),
      cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: "none",
        path: "/",
      },
    })
  );

  app.get("/healthz", (_req, res) => res.status(200).send("OK"));
  app.get("/health", (_req, res) =>
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: isDbConnected ? "connected" : "disconnected",
      readyState: mongoose.connection.readyState,
    })
  );

  app.use("/api", (req, res, next) => {
    if (!isDbConnected && mongoose.connection.readyState !== 1) {
      connectDatabase().catch(() => {});
      return res.status(503).json({
        message: "خدمة قاعدة البيانات غير متوفرة حالياً، يرجى المحاولة مرة أخرى خلال ثوانٍ.",
        retryAfter: 5,
      });
    }
    next();
  });

  try {
    registerQiroxRoutes(app);
  } catch (e) {
    console.error("⚠️ Qirox admin routes init error (non-fatal):", e);
  }

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Error:", err);
    res.status(status).json({ message });
  });

  initWebPush();

  cachedApp = app;
  return app;
}

// Vercel serverless handler — default export
export default async function handler(req: Request, res: Response) {
  try {
    const app = await createApp();
    return app(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ message: "Server initialization error" });
  }
}
