import { ReviewsService } from './reviews.service';

/** Repositorio mock con los métodos que usa el servicio. */
function repoMock() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: unknown) => x),
    remove: jest.fn(async () => undefined),
    createQueryBuilder: jest.fn(),
  };
}

/**
 * Autor con TODA la PII/datos fiscales que jamás debe salir por un endpoint
 * público. Si el servicio devolviera la entidad User, estos campos se filtrarían.
 */
function fullAuthor() {
  return {
    id: 'author-1',
    fullName: 'Ada Lovelace',
    avatarUrl: 'https://cdn.test/avatars/ada.png',
    email: 'ada@example.com',
    password: '$2b$10$hashsecreto',
    passwordResetToken: 'reset-token',
    nifCif: '12345678Z',
    fiscalAddress: 'Calle Secreta 1, Madrid',
    role: 'maker',
    isActive: true,
    chargesVat: true,
    vatPercent: 21,
    stripeAccountId: 'acct_123',
    phone: '+34123456789',
    dni: '12345678Z',
  };
}

describe('ReviewsService', () => {
  let reviewRepo: ReturnType<typeof repoMock>;
  let projectRepo: ReturnType<typeof repoMock>;
  let service: ReviewsService;

  beforeEach(() => {
    reviewRepo = repoMock();
    projectRepo = repoMock();
    service = new ReviewsService(reviewRepo as never, projectRepo as never);
  });

  describe('findByProject (lectura pública)', () => {
    it('expone el autor con EXACTAMENTE {id, fullName, avatarUrl}, sin PII', async () => {
      const author = fullAuthor();
      reviewRepo.find.mockResolvedValue([
        {
          id: 'rev-1',
          rating: 5,
          comment: 'Excelente',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
          author,
          project: { id: 'proj-1' },
        },
      ]);

      const result = await service.findByProject('proj-1');

      expect(result).toHaveLength(1);
      const outAuthor = result[0].author;
      expect(outAuthor).not.toBeNull();

      // Claves EXACTAS: ni una más, ni una menos.
      expect(Object.keys(outAuthor!).sort()).toEqual([
        'avatarUrl',
        'fullName',
        'id',
      ]);
      expect(outAuthor).toEqual({
        id: 'author-1',
        fullName: 'Ada Lovelace',
        avatarUrl: 'https://cdn.test/avatars/ada.png',
      });

      // El front necesita el nombre del autor para pintarlo.
      expect(outAuthor!.fullName).toBe('Ada Lovelace');
    });

    it('NO filtra email, password, nifCif, fiscalAddress, role ni isActive', async () => {
      reviewRepo.find.mockResolvedValue([
        {
          id: 'rev-1',
          rating: 4,
          comment: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          author: fullAuthor(),
          project: { id: 'proj-1' },
        },
      ]);

      const result = await service.findByProject('proj-1');
      const outAuthor = result[0].author as Record<string, unknown>;

      const forbidden = [
        'email',
        'password',
        'passwordResetToken',
        'nifCif',
        'fiscalAddress',
        'role',
        'isActive',
        'chargesVat',
        'vatPercent',
        'stripeAccountId',
        'phone',
        'dni',
      ];
      for (const key of forbidden) {
        expect(outAuthor).not.toHaveProperty(key);
      }

      // Y la reseña serializada tampoco arrastra la entidad completa.
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('ada@example.com');
      expect(serialized).not.toContain('$2b$10$hashsecreto');
      expect(serialized).not.toContain('12345678Z');
      expect(serialized).not.toContain('Calle Secreta 1');
    });

    it('mapea solo campos públicos de la reseña (id, rating, comment, createdAt, author)', async () => {
      const createdAt = new Date('2026-02-02T10:00:00Z');
      reviewRepo.find.mockResolvedValue([
        {
          id: 'rev-9',
          rating: 3,
          comment: 'Correcto',
          createdAt,
          updatedAt: new Date('2026-03-03T00:00:00Z'),
          author: fullAuthor(),
          project: { id: 'proj-1', name: 'privado' },
        },
      ]);

      const result = await service.findByProject('proj-1');

      expect(Object.keys(result[0]).sort()).toEqual([
        'author',
        'comment',
        'createdAt',
        'id',
        'rating',
      ]);
      expect(result[0]).toEqual({
        id: 'rev-9',
        rating: 3,
        comment: 'Correcto',
        createdAt,
        author: {
          id: 'author-1',
          fullName: 'Ada Lovelace',
          avatarUrl: 'https://cdn.test/avatars/ada.png',
        },
      });
      // No debe exponer 'project' ni 'updatedAt'.
      expect(result[0]).not.toHaveProperty('project');
      expect(result[0]).not.toHaveProperty('updatedAt');
    });

    it('devuelve author=null si la reseña no trae autor', async () => {
      reviewRepo.find.mockResolvedValue([
        {
          id: 'rev-2',
          rating: 5,
          comment: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          author: null,
          project: { id: 'proj-1' },
        },
      ]);

      const result = await service.findByProject('proj-1');
      expect(result[0].author).toBeNull();
    });

    it('normaliza avatarUrl ausente a null', async () => {
      const author = fullAuthor();
      delete (author as { avatarUrl?: string }).avatarUrl;
      reviewRepo.find.mockResolvedValue([
        {
          id: 'rev-3',
          rating: 5,
          comment: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          author,
          project: { id: 'proj-1' },
        },
      ]);

      const result = await service.findByProject('proj-1');
      expect(result[0].author).toEqual({
        id: 'author-1',
        fullName: 'Ada Lovelace',
        avatarUrl: null,
      });
    });

    it('consulta el repo filtrando por proyecto, con relación author y orden DESC', async () => {
      reviewRepo.find.mockResolvedValue([]);
      await service.findByProject('proj-42');
      expect(reviewRepo.find).toHaveBeenCalledWith({
        where: { project: { id: 'proj-42' } },
        relations: ['author'],
        order: { createdAt: 'DESC' },
      });
    });

    it('mapea todas las reseñas de la lista', async () => {
      reviewRepo.find.mockResolvedValue([
        {
          id: 'rev-a',
          rating: 5,
          comment: 'a',
          createdAt: new Date('2026-01-02T00:00:00Z'),
          author: { ...fullAuthor(), id: 'a1', fullName: 'Uno' },
          project: { id: 'proj-1' },
        },
        {
          id: 'rev-b',
          rating: 4,
          comment: 'b',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          author: { ...fullAuthor(), id: 'a2', fullName: 'Dos' },
          project: { id: 'proj-1' },
        },
      ]);

      const result = await service.findByProject('proj-1');
      expect(result.map((r) => r.id)).toEqual(['rev-a', 'rev-b']);
      expect(result.map((r) => r.author?.id)).toEqual(['a1', 'a2']);
      for (const r of result) {
        expect(Object.keys(r.author!).sort()).toEqual([
          'avatarUrl',
          'fullName',
          'id',
        ]);
      }
    });
  });
});
