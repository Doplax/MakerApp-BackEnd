import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { User } from '../users/entities/user.entity.js';

/**
 * Clientes del maker (mini-CRM para presupuestos). TODAS las operaciones van
 * scoped por el usuario autenticado: un maker nunca ve ni toca clientes de
 * otro (el "not found" de un id ajeno es intencional, no filtra existencia).
 */
@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  findAll(user: User): Promise<Client[]> {
    return this.clientRepository.find({
      where: { createdById: user.id },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, user: User): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id, createdById: user.id },
    });
    if (!client) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }
    return client;
  }

  create(dto: CreateClientDto, user: User): Promise<Client> {
    const client = this.clientRepository.create({
      ...dto,
      createdById: user.id,
    });
    return this.clientRepository.save(client);
  }

  async update(id: string, dto: UpdateClientDto, user: User): Promise<Client> {
    const client = await this.findOne(id, user);
    Object.assign(client, dto);
    return this.clientRepository.save(client);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const client = await this.findOne(id, user);
    await this.clientRepository.remove(client);
    return { message: `Cliente ${client.name} eliminado` };
  }
}
