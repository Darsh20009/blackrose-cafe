import crypto from "crypto";

type Recipient = { phone?: string; email?: string; name?: string };

function integrationConfig(channel: "whatsapp" | "email") {
  const projectId = process.env.QIROX_PROJECT_ID;
  const token = process.env[channel === "whatsapp" ? "QIROX_WHATSAPP_TOKEN" : "QIROX_EMAIL_TOKEN"];
  const baseUrl = (process.env.QIROX_INTEGRATIONS_BASE_URL || "https://qiroxstudio.online").replace(/\/+$/, "");

  if (!projectId || !token) {
    throw new Error(`QIROX ${channel} integration is not configured`);
  }

  return { projectId, token, baseUrl };
}

async function sendProjectMessage(
  channel: "whatsapp" | "email",
  body: Record<string, unknown>,
) {
  const { projectId, token, baseUrl } = integrationConfig(channel);
  const response = await fetch(`${baseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/${channel}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    console.error(`[QIROX] ${channel} provider returned HTTP ${response.status}`);
    throw new Error(`QIROX ${channel} message could not be delivered`);
  }
}

export function sendQiroxWhatsAppMessage(
  recipient: Recipient,
  message: string,
) {
  if (!recipient.phone) throw new Error("A phone number is required");
  if (message.length > 100_000) throw new Error("WhatsApp message exceeds the supported limit");
  const name = recipient.name || "عميل";
  return sendProjectMessage("whatsapp", {
    recipient: { phone: recipient.phone, name },
    platformName: "QIROX",
    clientName: name,
    message,
  });
}

export function sendQiroxWhatsAppCode(recipient: Recipient, code: string) {
  if (!recipient.phone) throw new Error("A phone number is required");
  return sendProjectMessage("whatsapp", {
    recipient: { phone: recipient.phone, name: recipient.name || "عميل" },
    platformName: "QIROX",
    clientName: recipient.name || "عميل",
    code,
    message: `رمز الدخول الخاص بك هو ${code}. صالح لمدة 5 دقائق.`,
  });
}

export function sendQiroxEmail(
  recipient: Recipient,
  subject: string,
  message: string,
) {
  if (!recipient.email) throw new Error("An email address is required");
  if (subject.length > 200 || message.length > 100_000) {
    throw new Error("Email content exceeds the supported limit");
  }
  return sendProjectMessage("email", {
    recipient: { email: recipient.email, name: recipient.name || "" },
    subject,
    message,
  });
}