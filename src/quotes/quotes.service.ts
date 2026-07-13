import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from './entities/quote.entity.js';
import { CreateQuoteDto } from './dto/create-quote.dto.js';
import { User } from '../users/entities/user.entity.js';

/**
 * Historial de PRESUPUESTOS del maker (documentos informales; las facturas
 * legales van por el módulo invoices). Todo scoped por el usuario.
 */
@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
  ) {}

  findAll(user: User): Promise<Quote[]> {
    return this.quoteRepository.find({
      where: { createdById: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Quote> {
    const quote = await this.quoteRepository.findOne({
      where: { id, createdById: user.id },
    });
    if (!quote) {
      throw new NotFoundException(`Presupuesto ${id} no encontrado`);
    }
    return quote;
  }

  /** Guarda el snapshot: euros → céntimos, IVA POR ENCIMA de la base. */
  create(dto: CreateQuoteDto, user: User): Promise<Quote> {
    const baseCents = Math.round(dto.base * 100);
    const vatPercent = dto.vatPercent ?? 0;
    const vatCents = Math.round((baseCents * vatPercent) / 100);
    const quote = this.quoteRepository.create({
      reference: dto.reference,
      concept: dto.concept ?? null,
      clientName: dto.clientName ?? null,
      clientNif: dto.clientNif ?? null,
      clientAddress: dto.clientAddress ?? null,
      notes: dto.notes ?? null,
      baseCents,
      vatPercent,
      vatCents,
      totalCents: baseCents + vatCents,
      createdById: user.id,
    });
    return this.quoteRepository.save(quote);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const quote = await this.findOne(id, user);
    await this.quoteRepository.remove(quote);
    return { message: `Presupuesto ${quote.reference} eliminado` };
  }
}
