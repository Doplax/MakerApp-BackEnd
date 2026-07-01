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
  ) {}

  // ── Onboarding Connect ───────────────────────────────────────

  @Post('connect/onboard')
  @UseGuards(AuthGuard('jwt'))
  async onboard(@CurrentUser() user: User) {
    const accountId = await this.stripeService.createConnectAccount(user.email);
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
    if (!maker.stripeAccountId) {
      throw new BadRequestException('El maker no tiene pagos configurados');
    }

    const amount = Math.round(project.price * 100); // céntimos, calculado en servidor
    return this.stripeService.createPaymentIntent(
      amount,
      dto.currency ?? 'eur',
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
