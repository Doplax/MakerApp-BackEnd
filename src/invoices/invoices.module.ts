import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity.js';
import { InvoiceCounter } from './entities/invoice-counter.entity.js';
import { Purchase } from '../purchases/entities/purchase.entity.js';
import { User } from '../users/entities/user.entity.js';
import { InvoicesService } from './invoices.service.js';
import { InvoicesController } from './invoices.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, InvoiceCounter, Purchase, User])],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
