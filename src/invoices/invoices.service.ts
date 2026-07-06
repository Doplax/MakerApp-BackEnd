import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity.js';
import { Purchase } from '../purchases/entities/purchase.entity.js';
import { PurchaseStatus } from '../purchases/enums/purchase-status.enum.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Emite (o devuelve, si ya existe) la factura de una compra. Idempotente por
   * compra. Asigna el número correlativo dentro de una transacción con bloqueo
   * pesimista sobre el contador del maker+año.
   */
  async issueForPurchase(purchaseId: string, makerId: string): Promise<Invoice> {
    // Fast-path de idempotencia (fuera de transacción): si ya existe, la devuelve.
    const pre = await this.invoiceRepo.findOne({
      where: { purchase: { id: purchaseId } },
      relations: ['maker', 'buyer', 'project', 'purchase'],
    });
    if (pre) {
      // Autorización TAMBIÉN en el fast-path: si no, cualquier usuario logueado
      // podría recuperar una factura ajena (con datos fiscales) por su purchaseId
      // (el check de propiedad de abajo solo se alcanza al CREAR la factura).
      if (pre.maker?.id !== makerId) {
        throw new ForbiddenException('No puedes facturar una venta que no es tuya');
      }
      return pre;
    }

    return this.dataSource.transaction(async (m) => {
      // Serializa por COMPRA: bloqueamos la fila de la compra (sin joins, para
      // no chocar con FOR UPDATE sobre el lado nullable de un LEFT JOIN). Dos
      // emisiones simultáneas de la misma venta se ejecutan en serie → una crea
      // la factura y la otra la encuentra (sin huecos ni número duplicado).
      const locked = await m.findOne(Purchase, {
        where: { id: purchaseId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Compra no encontrada');

      // Re-chequea idempotencia dentro del lock (por si otra petición creó la
      // factura entre el fast-path y la transacción), con la misma autorización.
      const existing = await m.findOne(Invoice, {
        where: { purchase: { id: purchaseId } },
        relations: ['maker', 'buyer', 'project', 'purchase'],
      });
      if (existing) {
        if (existing.maker?.id !== makerId) {
          throw new ForbiddenException('No puedes facturar una venta que no es tuya');
        }
        return existing;
      }

      const purchase = await m.findOne(Purchase, {
        where: { id: purchaseId },
        relations: ['maker', 'buyer', 'project'],
      });
      if (!purchase) {
        throw new NotFoundException('Compra no encontrada');
      }
      if (!purchase.maker || purchase.maker.id !== makerId) {
        throw new ForbiddenException('No puedes facturar una venta que no es tuya');
      }
      if (purchase.status !== PurchaseStatus.SUCCEEDED) {
        throw new BadRequestException('Solo se pueden facturar compras completadas');
      }

      const maker = await m.findOne(User, { where: { id: makerId } });
      if (!maker) throw new NotFoundException('Maker no encontrado');

      // ── Datos fiscales obligatorios del emisor ───────────────
      // Una factura legal española exige NIF y datos del emisor. Validamos
      // ANTES de consumir el correlativo: así no gastamos número (ni dejamos
      // huecos lógicos en la serie) con un snapshot fiscal incompleto.
      if (!maker.nifCif?.trim() || !maker.fiscalAddress?.trim()) {
        throw new BadRequestException(
          'Completa tus datos fiscales (NIF/CIF y dirección) en tu perfil antes de emitir facturas',
        );
      }

      // ── Número correlativo (serie = año), atómico ────────────
      // UPSERT con incremento en el mismo statement: evita la carrera de
      // "leer-null-y-crear" y el bloqueo pesimista sobre una fila inexistente.
      const series = String(new Date().getFullYear());
      const counterRows: Array<{ lastNumber: number }> = await m.query(
        `INSERT INTO "invoice_counters" ("makerId","series","lastNumber")
         VALUES ($1,$2,1)
         ON CONFLICT ("makerId","series")
         DO UPDATE SET "lastNumber" = "invoice_counters"."lastNumber" + 1
         RETURNING "lastNumber"`,
        [makerId, series],
      );
      const sequence = Number(counterRows[0].lastNumber);
      const number = `${series}-${String(sequence).padStart(4, '0')}`;

      // ── Importes (el total es lo cobrado, IVA incluido) ──────
      const totalCents = purchase.amount;
      const vatPercent = maker.chargesVat ? Number(maker.vatPercent ?? 21) : 0;
      const baseCents =
        vatPercent > 0 ? Math.round(totalCents / (1 + vatPercent / 100)) : totalCents;
      const vatCents = totalCents - baseCents;

      const invoice = m.create(Invoice, {
        number,
        series,
        sequence,
        maker,
        buyer: purchase.buyer,
        purchase,
        project: purchase.project,
        issueDate: new Date(),
        concept: purchase.project?.name ?? 'Pedido',
        makerName: maker.companyName || maker.workshopName || maker.fullName,
        makerNif: maker.nifCif ?? null,
        makerAddress: maker.fiscalAddress ?? null,
        clientName: purchase.buyer?.fullName ?? null,
        clientNif: purchase.buyer?.nifCif ?? null,
        clientAddress: purchase.buyer?.fiscalAddress ?? null,
        baseCents,
        vatPercent,
        vatCents,
        totalCents,
        currency: purchase.currency,
      });
      const saved = await m.save(invoice);
      this.logger.log(`Factura ${number} emitida por maker ${makerId} (compra ${purchaseId})`);
      return saved;
    });
  }

  /** Facturas emitidas por un maker (más recientes primero). */
  async findForMaker(makerId: string): Promise<Invoice[]> {
    return this.invoiceRepo.find({
      where: { maker: { id: makerId } },
      relations: ['buyer', 'project'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Devuelve una factura si el usuario es el maker emisor o el comprador. */
  async findOneAuthorized(id: string, userId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
      relations: ['maker', 'buyer', 'project'],
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    const isMaker = invoice.maker?.id === userId;
    const isBuyer = invoice.buyer?.id === userId;
    if (!isMaker && !isBuyer) {
      throw new ForbiddenException('No tienes acceso a esta factura');
    }
    return invoice;
  }
}
