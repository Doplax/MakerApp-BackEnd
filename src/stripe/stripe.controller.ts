import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  UseGuards,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { StripeService } from './stripe.service.js';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto.js';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity.js';

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly config: ConfigService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Onboarding Connect ───────────────────────────────────────

  @Post('connect/onboard')
  @UseGuards(AuthGuard('jwt'))
  async onboard(@CurrentUser() user: User) {
    // Reutiliza la cuenta Express existente del maker si ya la tiene: crear una
    // nueva en cada onboarding fugaría cuentas huérfanas y —al no persistirse—
    // los pagos nunca se activarían. Releemos el usuario fresco de BD para reducir
    // la ventana de carrera que crearía cuentas duplicadas en clics concurrentes.
    const fresh = await this.userRepo.findOne({ where: { id: user.id } });
    let accountId = fresh?.stripeAccountId ?? user.stripeAccountId;
    if (!accountId) {
      accountId = await this.stripeService.createConnectAccount(user.email);
      await this.userRepo.update(user.id, { stripeAccountId: accountId });
    }

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:4210',
    );
    const link = await this.stripeService.createAccountLink(
      accountId,
      `${frontendUrl}/settings?stripe=success`,
      `${frontendUrl}/settings?stripe=refresh`,
    );
    return { accountId, onboardingUrl: link };
  }

  @Get('connect/status')
  @UseGuards(AuthGuard('jwt'))
  async status(@CurrentUser() user: User) {
    if (!this.stripeService.isConfigured() || !user.stripeAccountId) {
      return { connected: false };
    }
    const s = await this.stripeService.getAccountStatus(user.stripeAccountId);
    // Sincroniza chargesEnabled (además del webhook account.updated) para que
    // acceptsPayments del perfil público refleje si el maker puede cobrar.
    if (user.chargesEnabled !== s.chargesEnabled) {
      await this.userRepo.update(user.id, { chargesEnabled: s.chargesEnabled });
    }
    return { connected: true, ...s };
  }

  // ── Payment Intent ───────────────────────────────────────────

  @Post('payment-intent')
  @UseGuards(AuthGuard('jwt'))
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @CurrentUser() buyer: User,
  ) {
    // El importe y el destinatario se DERIVAN del servidor (precio del proyecto en
    // BD y stripeAccountId del maker dueño). NUNCA se confía en dto.amount.
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId },
      relations: ['createdBy'],
    });
    if (
      !project ||
      !project.isPublic ||
      project.price == null ||
      project.price <= 0
    ) {
      throw new BadRequestException('Proyecto no disponible para compra');
    }
    const maker = project.createdBy;
    if (!maker) throw new BadRequestException('Proyecto sin maker asociado');
    if (maker.id === buyer.id) {
      throw new BadRequestException('No puedes comprar tu propio proyecto');
    }
    // Exigimos chargesEnabled además de stripeAccountId: acceptsPayments del perfil
    // público es !!stripeAccountId && !!chargesEnabled, así que un maker con cuenta
    // creada pero sin cobros habilitados NO debe poder recibir PaymentIntents.
    if (!maker.stripeAccountId || !maker.chargesEnabled) {
      throw new BadRequestException('El maker no tiene pagos configurados');
    }

    const amount = Math.round(project.price * 100); // céntimos, calculado en servidor
    // La moneda se DERIVA del servidor ('eur'): el precio del proyecto está en EUR.
    // Ignoramos dto.currency (igual que dto.amount) para evitar que el cliente fuerce
    // otra divisa y se cobre price*100 unidades de ESA divisa (desajuste importe↔moneda,
    // y roto en monedas de cero decimales).
    return this.stripeService.createPaymentIntent(
      amount,
      'eur',
      maker.stripeAccountId,
      { projectId: project.id, buyerId: buyer.id, makerId: maker.id },
    );
  }

  // ── Webhook ──────────────────────────────────────────────────

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: { rawBody?: Buffer },
    @Headers('stripe-signature') sig: string,
  ) {
    if (!sig) throw new BadRequestException('Missing stripe-signature header');
    if (!req.rawBody) throw new BadRequestException('Raw body no disponible');
    const event = this.stripeService.constructWebhookEvent(
      req.rawBody,
      sig,
    ) as Record<string, unknown>;
    await this.stripeService.handleWebhookEvent(event);
    return { received: true };
  }
}
