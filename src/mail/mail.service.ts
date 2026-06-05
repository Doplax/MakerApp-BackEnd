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

/** Bloque de contenido para construir el cuerpo de un email. */
interface TemplateOptions {
  /** Texto de preview que muestran los clientes de correo en la bandeja. */
  preheader: string;
  /** Título principal (h1) del email. */
  heading: string;
  /** HTML del cuerpo (párrafos, tablas, etc.). */
  body: string;
  /** Botón de acción principal (opcional). */
  cta?: { label: string; url: string };
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  // ── Identidad de marca (estética corporativa MΛkerUp) ────────
  private static readonly BRAND = {
    name: 'MΛkerUp',
    tagline: 'Comunidad de makers 3D',
    // Logo alojado en producción (siempre accesible desde cualquier cliente)
    logoUrl: 'https://makerup.app/logo.png',
    site: 'https://makerup.app',
    // Paleta corporativa (src/styles/_variables.scss)
    purple: '#7B5CF5', // brand-600 — botones y acentos
    pink: '#E040C8', // fin del gradiente de marca
    dark: '#1A0A2E', // brand-900 — fondo de cabecera
    heading: '#1A0A2E',
    text: '#374151',
    muted: '#6B7280',
    faint: '#9CA3AF',
    page: '#F3F4F8', // fondo de página (--bg-body)
    card: '#FFFFFF',
    border: '#ECECF3',
  };

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

  /** Verifica la conexión SMTP (útil para diagnóstico al arrancar). */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Conexión SMTP verificada correctamente');
      return true;
    } catch (err) {
      this.logger.error('No se pudo verificar la conexión SMTP', err as Error);
      return false;
    }
  }

  // ── Emails (API pública) ─────────────────────────────────────

  async sendWelcome(to: string, name: string): Promise<void> {
    const html = this.baseTemplate({
      preheader: 'Tu cuenta de MΛkerUp ya está activa. ¡Empieza a crear!',
      heading: `¡Hola, ${this.escape(name)}!`,
      body: `
        <p>Te damos la bienvenida a <strong>MΛkerUp</strong>, la plataforma para makers de impresión 3D.</p>
        <p>Desde tu panel ya puedes:</p>
        <ul style="margin:0 0 8px;padding-left:20px;color:${MailService.BRAND.text}">
          <li style="margin:6px 0">Registrar tus impresoras y controlar su mantenimiento.</li>
          <li style="margin:6px 0">Gestionar tu inventario de filamentos.</li>
          <li style="margin:6px 0">Publicar proyectos y recibir pedidos de la comunidad.</li>
        </ul>
        <p>¡Nos alegra tenerte aquí!</p>
      `,
      cta: { label: 'Ir a mi panel', url: `${this.appUrl()}/dashboard` },
    });

    await this.send({
      to,
      subject: '¡Bienvenido/a a MΛkerUp!',
      html,
      text: `Hola ${name}, te damos la bienvenida a MΛkerUp. Tu cuenta ya está activa: ${this.appUrl()}/dashboard`,
    });
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const html = this.baseTemplate({
      preheader: 'Restablece la contraseña de tu cuenta MΛkerUp (enlace válido 1 hora).',
      heading: 'Restablecer contraseña',
      body: `
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Pulsa el botón de abajo para elegir una nueva. Por seguridad, el enlace
        caducará en <strong>1 hora</strong>.</p>
        <p style="font-size:13px;color:${MailService.BRAND.muted};margin-top:24px">
          Si no has solicitado este cambio, puedes ignorar este mensaje: tu contraseña
          actual seguirá siendo válida.
        </p>
      `,
      cta: { label: 'Restablecer contraseña', url: resetUrl },
    });

    await this.send({
      to,
      subject: 'Restablece tu contraseña — MΛkerUp',
      html,
      text: `Para restablecer tu contraseña visita este enlace (válido 1 hora): ${resetUrl}`,
    });
  }

  async sendOrderConfirmation(
    to: string,
    makerName: string,
    projectName: string,
    price: number,
  ): Promise<void> {
    const formatted = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);

    const html = this.baseTemplate({
      preheader: `Tu pedido "${projectName}" ha sido confirmado.`,
      heading: 'Pedido confirmado',
      body: `
        <p><strong>${this.escape(makerName)}</strong> ha confirmado tu pedido. ¡Gracias por tu compra!</p>
        ${this.detailsTable([
          { label: 'Proyecto', value: this.escape(projectName) },
          { label: 'Maker', value: this.escape(makerName) },
          { label: 'Importe', value: formatted },
        ])}
        <p style="font-size:13px;color:${MailService.BRAND.muted};margin-top:20px">
          Puedes seguir el estado de tu pedido desde tu cuenta.
        </p>
      `,
      cta: { label: 'Ver mis pedidos', url: `${this.appUrl()}/dashboard` },
    });

    await this.send({
      to,
      subject: `Pedido confirmado: ${projectName}`,
      html,
      text: `${makerName} ha confirmado tu pedido "${projectName}". Importe: ${formatted}.`,
    });
  }

  async sendMaintenanceAlert(
    to: string,
    printerName: string,
    type: 'simple' | 'full',
  ): Promise<void> {
    const label = type === 'simple' ? 'básico' : 'completo';
    const html = this.baseTemplate({
      preheader: `Tu impresora ${printerName} necesita mantenimiento ${label}.`,
      heading: `Mantenimiento ${label} pendiente`,
      body: `
        <p>Tu impresora <strong>${this.escape(printerName)}</strong> ha alcanzado el
        umbral de horas para realizar el mantenimiento <strong>${label}</strong>.</p>
        <p>Revisar el estado de la impresora ayuda a mantener la calidad de impresión
        y a prolongar su vida útil.</p>
      `,
      cta: { label: 'Ver mis impresoras', url: `${this.appUrl()}/printers` },
    });

    await this.send({
      to,
      subject: `Mantenimiento ${label} pendiente: ${printerName}`,
      html,
      text: `Tu impresora ${printerName} necesita mantenimiento ${label}: ${this.appUrl()}/printers`,
    });
  }

  // ── Helpers de plantilla ─────────────────────────────────────

  private appUrl(): string {
    return this.config
      .get<string>('APP_URL', MailService.BRAND.site)
      .replace(/\/+$/, '');
  }

  /** Escapa caracteres HTML para evitar romper el layout o inyección. */
  private escape(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Tabla de detalles clave/valor con la estética de marca. */
  private detailsTable(rows: { label: string; value: string }[]): string {
    const b = MailService.BRAND;
    const cells = rows
      .map(
        (r, i) => `
        <tr>
          <td style="padding:12px 16px;color:${b.muted};font-size:14px;${
            i > 0 ? `border-top:1px solid ${b.border};` : ''
          }">${r.label}</td>
          <td style="padding:12px 16px;color:${b.heading};font-size:14px;font-weight:600;text-align:right;${
            i > 0 ? `border-top:1px solid ${b.border};` : ''
          }">${r.value}</td>
        </tr>`,
      )
      .join('');
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#F9F9FC;border:1px solid ${b.border};border-radius:12px;border-collapse:separate;overflow:hidden">
        ${cells}
      </table>`;
  }

  /** Botón "bulletproof" (sólido, máxima compatibilidad incl. Outlook). */
  private button(label: string, url: string): string {
    const b = MailService.BRAND;
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0">
        <tr>
          <td align="center" bgcolor="${b.purple}" style="border-radius:10px">
            <a href="${url}" target="_blank"
               style="display:inline-block;padding:14px 32px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;background:${b.purple}">
              ${label}
            </a>
          </td>
        </tr>
      </table>`;
  }

  /**
   * Plantilla base "bulletproof": layout en tablas con estilos inline para
   * máxima compatibilidad entre clientes de correo (Gmail, Outlook, Apple Mail).
   */
  private baseTemplate(opts: TemplateOptions): string {
    const b = MailService.BRAND;
    const year = new Date().getFullYear();
    const cta = opts.cta ? this.button(opts.cta.label, opts.cta.url) : '';

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="https://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <title>${b.name}</title>
</head>
<body style="margin:0;padding:0;background:${b.page};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- preheader (oculto, define el texto de preview en la bandeja) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${this.escape(opts.preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${b.page};padding:32px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:${b.card};border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(26,10,46,.08)">

          <!-- Cabecera -->
          <tr>
            <td style="background:${b.dark};padding:28px 32px" align="left">
              <img src="${b.logoUrl}" width="36" height="36" alt="${b.name}"
                   style="vertical-align:middle;border:0;display:inline-block" />
              <span style="vertical-align:middle;margin-left:10px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.02em">${b.name}</span>
            </td>
          </tr>

          <!-- Barra de acento con el gradiente de marca -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background:${b.purple};background:linear-gradient(90deg,${b.purple} 0%,${b.pink} 100%)">&nbsp;</td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:36px 32px 8px">
              <h1 style="margin:0 0 18px;color:${b.heading};font-size:22px;font-weight:700;line-height:1.3">${opts.heading}</h1>
              <div style="color:${b.text};font-size:15px;line-height:1.65">
                ${opts.body}
              </div>
              ${cta}
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td style="padding:24px 32px 28px;border-top:1px solid ${b.border}">
              <p style="margin:0 0 4px;color:${b.faint};font-size:12px;line-height:1.5">
                © ${year} ${b.name} · ${b.tagline}
              </p>
              <p style="margin:0;color:${b.faint};font-size:12px;line-height:1.5">
                <a href="${b.site}" target="_blank" style="color:${b.purple};text-decoration:none">makerup.app</a>
                · Este es un correo automático, no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
