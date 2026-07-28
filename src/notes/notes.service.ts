import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Note } from './entities/note.entity.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { Project } from '../projects/entities/project.entity.js';
import { User } from '../users/entities/user.entity.js';

/**
 * Notas del taller. TODO va scoped por el usuario autenticado (una nota
 * nunca se ve ni se toca desde otra cuenta) y el proyecto vinculado se
 * verifica con el mismo guard anti-IDOR que los print-logs.
 */
@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {}

  /**
   * Guard anti-IDOR (patrón de PrintLogsService.assertOwnership): el proyecto
   * referenciado debe existir y ser DEL usuario. Sin esto, un id ajeno
   * colgaría la nota del proyecto de otra persona.
   */
  private async assertProjectOwnership(id: string, user: User): Promise<void> {
    const row: { id: string } | undefined = await this.noteRepository.manager
      .createQueryBuilder()
      .select('p.id', 'id')
      .from('projects', 'p')
      .where('p.id = :id AND p."createdById" = :userId', { id, userId: user.id })
      .getRawOne();
    if (!row) {
      throw new BadRequestException('Invalid project');
    }
  }

  /** Query base: notas del usuario con el proyecto reducido a id + name. */
  private baseQuery(user: User): SelectQueryBuilder<Note> {
    return this.noteRepository
      .createQueryBuilder('note')
      .leftJoin('note.project', 'project')
      .addSelect(['project.id', 'project.name'])
      .where('note."createdById" = :userId', { userId: user.id });
  }

  /** Lista del usuario: fijadas primero, luego por última edición. */
  findAll(user: User): Promise<Note[]> {
    return this.baseQuery(user)
      .orderBy('note.pinned', 'DESC')
      .addOrderBy('note.updatedAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, user: User): Promise<Note> {
    const note = await this.baseQuery(user)
      .andWhere('note.id = :id', { id })
      .getOne();
    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }
    return note;
  }

  async create(dto: CreateNoteDto, user: User): Promise<Note> {
    const { projectId, ...data } = dto;
    if (projectId) await this.assertProjectOwnership(projectId, user);

    const note = this.noteRepository.create({
      ...data,
      project: projectId ? ({ id: projectId } as Project) : null,
      createdById: user.id,
    });
    const saved = await this.noteRepository.save(note);
    return this.findOne(saved.id, user);
  }

  async update(id: string, dto: UpdateNoteDto, user: User): Promise<Note> {
    const note = await this.findOne(id, user);
    const { projectId, ...data } = dto;

    // Mismo guard anti-IDOR que en create (reasignar a un proyecto ajeno).
    if (projectId) await this.assertProjectOwnership(projectId, user);

    Object.assign(note, data);
    // undefined = no tocar; null = desvincular (nota general); uuid = vincular.
    if (projectId !== undefined) {
      note.project = projectId ? ({ id: projectId } as Project) : null;
    }

    await this.noteRepository.save(note);
    return this.findOne(id, user);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const note = await this.findOne(id, user);
    await this.noteRepository.remove(note);
    return { message: `Note ${note.title} has been removed` };
  }
}
