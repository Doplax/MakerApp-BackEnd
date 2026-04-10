import {
  Controller, Post, Get, Body, Headers,
  Req, UseGuards, BadRequestException, HttpCode,
} from '@nestjs/common';
import { StripeService } from './stripe.service.js';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto.js';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { ConfigService } from '@nestjs/config';

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly config: ConfigService,
  ) {}

  // ── Onboarding Connect ───────────────────────────────────────

  @Post('connect/onboard')
  @UseGuards(AuthGuard('jwt'))
  async onboard(@CurrentUser() user: User) {
    const accountId = await this.stripeService.createConnectAccount(user.email);
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4210');
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
    if (!user.stripeAccountId) {
      return { connected: false };
    }
    const s = await this.stripeService.getAccountStatus(user.stripeAccountId);
    return { connected: true, ...s };
  }

  // ── Payment Intent ───────────────────────────────────────────

  @Post('payment-intent')
  @UseGuards(AuthGuard('jwt'))
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @CurrentUser() buyer: User,
  ) {
    // En producción buscarías el maker dueño del proyecto
    // Para el prototipo requiere que el maker pase su accountId en metadata o el sistema lo resuelva
    return this.stripeService.createPaymentIntent(
      dto.amount,
      dto.currency ?? 'eur',
      '', // stripeAccountId del maker — se completará cuando la feature de pago sea end-to-end
      { projectId: dto.projectId, buyerId: buyer.id },
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
    const event = this.stripeService.constructWebhookEvent(req.rawBody, sig) as Record<string, unknown>;
    this.stripeService.handleWebhookEvent(event);
    return { received: true };
  }
}
