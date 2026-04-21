import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = config.get<string>(
      'MAIL_FROM',
      '"MΛkerUp" <noreply@makerup.app>',
    );

    this.transporter = nodemailer.createTransport({
      host: config.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: Number(config.get<string>('MAIL_PORT', '587')),
      secure: config.get<string>('MAIL_SECURE', 'false') === 'true',
      auth: {
        user: config.get<string>('MAIL_USER'),
        pass: config.get<string>('MAIL_PASS'),
      },
    });
  }

  async send(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Email enviado a ${options.to}: ${options.subject}`);
    } catch (err) {
      this.logger.error(`Error enviando email a ${options.to}`, err);
      throw err;
    }
  }

  // ── Plantillas ───────────────────────────────────────────────

  async sendWelcome(to: string, name: string): Promise<void> {
    await this.send({
      to,
      subject: '¡Bienvenido/a a MΛkerUp!',
      html: this.welcomeTemplate(name),
      text: `Hola ${name}, bienvenido/a a MΛkerUp. Tu cuenta ya está activa.`,
    });
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Restablece tu contraseña — MΛkerUp',
      html: this.passwordResetTemplate(resetUrl),
      text: `Visita el siguiente enlace para restablecer tu contraseña: ${resetUrl}`,
    });
  }

  async sendOrderConfirmation(
    to: string,
    makerName: string,
    projectName: string,
    price: number,
  ): Promise<void> {
    await this.send({
      to,
      subject: `Pedido confirmado: ${projectName}`,
      html: this.orderConfirmationTemplate(makerName, projectName, price),
    });
  }

  async sendMaintenanceAlert(
    to: string,
    printerName: string,
    type: 'simple' | 'full',
  ): Promise<void> {
    const label = type === 'simple' ? 'básico' : 'completo';
    await this.send({
      to,
      subject: `Mantenimiento ${label} pendiente: ${printerName}`,
      html: this.maintenanceAlertTemplate(printerName, label),
    });
  }

  // ── HTML Templates ───────────────────────────────────────────

  private baseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .wrapper { max-width:560px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.08); }
    .header  { background:#1e1e2e; padding:24px 32px; }
    .logo    { color:#a5b4fc; font-size:20px; font-weight:700; letter-spacing:.04em; }
    .body    { padding:32px; color:#374151; font-size:15px; line-height:1.6; }
    .btn     { display:inline-block; margin:20px 0; padding:12px 28px; background:#6366f1; color:#fff !important; text-decoration:none; border-radius:8px; font-weight:600; }
    .footer  { background:#f9fafb; padding:16px 32px; font-size:12px; color:#9ca3af; text-align:center; }
    h2       { margin:0 0 16px; color:#111827; font-size:20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><span class="logo">MΛkerUp</span></div>
    <div class="body">${content}</div>
    <div class="footer">© ${new Date().getFullYear()} MΛkerUp · Comunidad de makers 3D</div>
  </div>
</body>
</html>`;
  }

  private welcomeTemplate(name: string): string {
    return this.baseTemplate(`
      <h2>¡Hola, ${name}!</h2>
      <p>Bienvenido/a a <strong>MΛkerUp</strong>, la plataforma para makers de impresión 3D.</p>
      <p>Ya puedes añadir tus impresoras, gestionar tu inventario de filamentos y compartir tus proyectos con la comunidad.</p>
      <a href="${this.config.get('APP_URL', 'http://localhost:4210')}/dashboard" class="btn">Ir al panel</a>
    `);
  }

  private passwordResetTemplate(resetUrl: string): string {
    return this.baseTemplate(`
      <h2>Restablecer contraseña</h2>
      <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p>Haz clic en el botón de abajo. El enlace expirará en <strong>1 hora</strong>.</p>
      <a href="${resetUrl}" class="btn">Restablecer contraseña</a>
      <p style="font-size:13px;color:#6b7280">Si no solicitaste este cambio, ignora este mensaje.</p>
    `);
  }

  private orderConfirmationTemplate(
    makerName: string,
    projectName: string,
    price: number,
  ): string {
    const formatted = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
    return this.baseTemplate(`
      <h2>Pedido confirmado</h2>
      <p>Hola, <strong>${makerName}</strong> ha confirmado tu pedido.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#6b7280">Proyecto</td><td style="padding:8px 0;font-weight:600">${projectName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Importe</td><td style="padding:8px 0;font-weight:600">${formatted}</td></tr>
      </table>
    `);
  }

  private maintenanceAlertTemplate(printerName: string, type: string): string {
    return this.baseTemplate(`
      <h2>Mantenimiento ${type} pendiente</h2>
      <p>Tu impresora <strong>${printerName}</strong> ha alcanzado el umbral de horas para realizar el mantenimiento <strong>${type}</strong>.</p>
      <p>Revisar el estado de la impresora ayuda a mantener la calidad de impresión y prolongar su vida útil.</p>
      <a href="${this.config.get('APP_URL', 'http://localhost:4210')}/printers" class="btn">Ver impresoras</a>
    `);
  }
}
