import crypto from "crypto";

const TICKET_TTL_MS = 2 * 60 * 1000;
const IV_BYTES = 12;
const TAG_BYTES = 16;

function ticketKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

export function createAppleWalletTicket(phone: string): string {
  const normalizedPhone = String(phone || "").trim();
  if (!normalizedPhone || normalizedPhone.replace(/\D/g, "").length < 9) {
    throw new Error("Customer phone is missing or invalid");
  }

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", ticketKey(), iv);
  const payload = Buffer.from(JSON.stringify({
    phone: normalizedPhone,
    expiresAt: Date.now() + TICKET_TTL_MS,
  }), "utf8");
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function readAppleWalletTicket(value: unknown): { phone: string } | null {
  if (typeof value !== "string" || value.length > 1024) return null;

  try {
    const encoded = Buffer.from(value, "base64url");
    if (encoded.length <= IV_BYTES + TAG_BYTES) return null;

    const iv = encoded.subarray(0, IV_BYTES);
    const tag = encoded.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = encoded.subarray(IV_BYTES + TAG_BYTES);
    const decipher = crypto.createDecipheriv("aes-256-gcm", ticketKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const payload = JSON.parse(plaintext);
    const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
    const expiresAt = Number(payload.expiresAt);

    if (!phone || phone.replace(/\D/g, "").length < 9) return null;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    if (expiresAt > Date.now() + TICKET_TTL_MS + 30_000) return null;

    return { phone };
  } catch {
    return null;
  }
}
