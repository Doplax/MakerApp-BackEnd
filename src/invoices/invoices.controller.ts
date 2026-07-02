import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvoicesService } from './invoices.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { Invoice } from './entities/invoice.entity.js';

@Controller('invoices')
@UseGuards(AuthGuard('jwt'))
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  /** Emite (o devuelve, si ya existe) la factura de una venta. Solo el maker. */
  @Post('from-purchase/:purchaseId')
  async issue(@Param('purchaseId') purchaseId: string, @CurrentUser() user: User) {
    const invoice = await this.invoices.issueForPurchase(purchaseId, user.id);
    return this.toDto(invoice);
  }

  /** Facturas emitidas por el maker autenticado. */
  @Get()
  async list(@CurrentUser() user: User) {
    const rows = await this.invoices.findForMaker(user.id);
    return rows.map((i) => this.toDto(i));
  }

  /** Detalle de una factura (maker emisor o comprador). */
  @Get(':id')
  async detail(@Param('id') id: string, @CurrentUser() user: User) {
    const invoice = await this.invoices.findOneAuthorized(id, user.id);
    return this.toDto(invoice);
  }

  /** Forma de salida: importes en unidades de moneda (no céntimos) para la UI. */
  private toDto(i: Invoice) {
    return {
      id: i.id,
      number: i.number,
      issueDate: i.issueDate,
      concept: i.concept,
      maker: { name: i.makerName, nif: i.makerNif, address: i.makerAddress },
      client: { name: i.clientName, nif: i.clientNif, address: i.clientAddress },
      base: i.baseCents / 100,
      vatPercent: Number(i.vatPercent),
      vatAmount: i.vatCents / 100,
      total: i.totalCents / 100,
      currency: i.currency,
      project: i.project ? { id: i.project.id, name: i.project.name } : null,
    };
  }
}
