import nodemailer from "nodemailer";
import { logger } from "./logger";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn("SMTP not configured — email notifications disabled");
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export interface EncuentroEmailData {
  title: string;
  dateTime: Date;
  location: string;
  maxSpots?: number | null;
  notes?: string | null;
  organizerName?: string | null;
  encuentroId: number;
}

function formatDate(date: Date): string {
  return date.toLocaleString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

function getAppUrl(): string {
  const domain = process.env.REPLIT_DEV_DOMAIN ?? process.env.REPLIT_DOMAINS?.split(",")[0];
  return domain ? `https://${domain}` : "http://localhost";
}

export async function sendEncuentroInvitation(
  to: string,
  playerName: string,
  data: EncuentroEmailData,
): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const appUrl = getAppUrl();
  const encuentroUrl = `${appUrl}/encuentros/${data.encuentroId}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #e6edf3; margin: 0; padding: 20px; }
  .container { max-width: 520px; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #0d9373 0%, #059669 100%); padding: 28px 32px; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #fff; }
  .header p { margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 14px; }
  .body { padding: 28px 32px; }
  .greeting { font-size: 16px; margin: 0 0 20px; color: #e6edf3; }
  .detail { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
  .detail-icon { font-size: 18px; width: 24px; flex-shrink: 0; margin-top: 1px; }
  .detail-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #7d8590; margin: 0 0 2px; }
  .detail-value { font-size: 15px; color: #e6edf3; margin: 0; font-weight: 500; }
  .notes { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 14px 16px; margin: 20px 0; font-size: 14px; color: #7d8590; font-style: italic; }
  .cta { text-align: center; margin: 28px 0 0; }
  .btn { display: inline-block; background: #0d9373; color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }
  .footer { padding: 18px 32px; border-top: 1px solid #30363d; font-size: 12px; color: #7d8590; text-align: center; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🏸 Padel Tracker IA</h1>
    <p>Nueva convocatoria de encuentro</p>
  </div>
  <div class="body">
    <p class="greeting">Hola <strong>${playerName}</strong>,</p>
    <p style="color:#7d8590;font-size:14px;margin:0 0 22px">
      ${data.organizerName ? `<strong>${data.organizerName}</strong> te ha convocado a un encuentro.` : "Te han convocado a un encuentro."}
    </p>

    <div class="detail">
      <span class="detail-icon">📅</span>
      <div>
        <p class="detail-label">Fecha y hora</p>
        <p class="detail-value">${formatDate(data.dateTime)}</p>
      </div>
    </div>

    <div class="detail">
      <span class="detail-icon">📍</span>
      <div>
        <p class="detail-label">Lugar</p>
        <p class="detail-value">${data.location}</p>
      </div>
    </div>

    ${data.maxSpots ? `
    <div class="detail">
      <span class="detail-icon">👥</span>
      <div>
        <p class="detail-label">Plazas máximas</p>
        <p class="detail-value">${data.maxSpots} jugadores</p>
      </div>
    </div>` : ""}

    ${data.notes ? `<div class="notes">${data.notes}</div>` : ""}

    <div class="cta">
      <a href="${encuentroUrl}" class="btn">Ver y confirmar asistencia</a>
    </div>
  </div>
  <div class="footer">
    Padel Tracker IA &nbsp;·&nbsp; <a href="${appUrl}" style="color:#0d9373">Abrir app</a>
  </div>
</div>
</body>
</html>
`;

  const text = `
Hola ${playerName},

${data.organizerName ? `${data.organizerName} te ha convocado a un encuentro.` : "Te han convocado a un encuentro."}

📅 ${formatDate(data.dateTime)}
📍 ${data.location}
${data.maxSpots ? `👥 Máx. ${data.maxSpots} jugadores` : ""}
${data.notes ? `\n${data.notes}` : ""}

Confirma tu asistencia en: ${encuentroUrl}

— Padel Tracker IA
`;

  try {
    await t.sendMail({
      from: `"Padel Tracker IA" <${from}>`,
      to,
      subject: `🏸 Encuentro: ${data.title} — ${formatDate(data.dateTime)}`,
      text: text.trim(),
      html,
    });
    logger.info({ to, encuentroId: data.encuentroId }, "Notification email sent");
    return true;
  } catch (err) {
    logger.error({ err, to }, "Failed to send notification email");
    return false;
  }
}

export async function sendRsvpReminder(
  to: string,
  playerName: string,
  data: EncuentroEmailData,
): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const appUrl = getAppUrl();
  const encuentroUrl = `${appUrl}/encuentros/${data.encuentroId}`;

  try {
    await t.sendMail({
      from: `"Padel Tracker IA" <${from}>`,
      to,
      subject: `⏰ Recuerda confirmar: ${data.title}`,
      text: `Hola ${playerName},\n\nAún no has confirmado tu asistencia al encuentro "${data.title}" del ${formatDate(data.dateTime)} en ${data.location}.\n\nConfirma aquí: ${encuentroUrl}\n\n— Padel Tracker IA`,
      html: `<p>Hola <strong>${playerName}</strong>,</p><p>Aún no has confirmado tu asistencia al encuentro <strong>${data.title}</strong> del <strong>${formatDate(data.dateTime)}</strong> en ${data.location}.</p><p><a href="${encuentroUrl}" style="background:#0d9373;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Confirmar asistencia</a></p>`,
    });
    return true;
  } catch (err) {
    logger.error({ err, to }, "Failed to send RSVP reminder");
    return false;
  }
}
