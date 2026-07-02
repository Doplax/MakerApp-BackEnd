import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PurchasesService } from './purchases.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { Purchase } from './entities/purchase.entity.js';

/**
 * Lectura de compras/ventas reales (tabla `purchases`, escritas por el webhook
 * de Stripe). Devuelve una forma acotada — nunca la entidad User completa — para
 * no filtrar datos sensibles del comprador/maker.
 */
@Controller('purchases')
@UseGuards(AuthGuard('jwt'))
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}

  /** Ventas del maker autenticado. */
  @Get('sales')
  async sales(@CurrentUser() user: User) {
    const rows = await this.purchases.findSalesForMaker(user.id);
    return rows.map((p) => this.toSaleDto(p));
  }

  /** Pedidos (compras) del comprador autenticado. */
  @Get('mine')
  async mine(@CurrentUser() user: User) {
    const rows = await this.purchases.findOrdersForBuyer(user.id);
    return rows.map((p) => this.toOrderDto(p));
  }

  private toSaleDto(p: Purchase) {
    return {
      id: p.id,
      amount: p.amount, // céntimos
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt,
      project: p.project
        ? { id: p.project.id, name: p.project.name, imageUrl: p.project.imageUrl }
        : null,
      buyer: p.buyer
        ? { id: p.buyer.id, fullName: p.buyer.fullName, avatarUrl: p.buyer.avatarUrl }
        : null,
    };
  }

  private toOrderDto(p: Purchase) {
    return {
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt,
      project: p.project
        ? { id: p.project.id, name: p.project.name, imageUrl: p.project.imageUrl }
        : null,
      maker: p.maker
        ? { id: p.maker.id, fullName: p.maker.fullName, avatarUrl: p.maker.avatarUrl }
        : null,
    };
  }
}
