import { StorageSweeperService } from './storage-sweeper.service';

const H = 3_600_000; // 1 hora en ms
const NOW = 1_700_000_000_000; // instante fijo para tests deterministas

function cloudinaryMock(files: { relative: string; mtimeMs: number }[]) {
  return {
    // Lógica real de extracción para que el mapeo url→relativa funcione.
    relativeFromUploadsUrl: (url: string | null) => {
      if (!url) return null;
      const marker = '/uploads/';
      const i = url.indexOf(marker);
      return i === -1 ? null : url.substring(i + marker.length);
    },
    listStoredFiles: jest.fn().mockResolvedValue(files),
    deleteByRelative: jest.fn().mockResolvedValue(undefined),
  };
}

function build(
  files: { relative: string; mtimeMs: number }[],
  referencedUrls: string[],
) {
  const cloudinary = cloudinaryMock(files);
  // dataSource.query se invoca una vez por columna; devolvemos las URLs
  // referenciadas en la primera y vacío en el resto.
  let first = true;
  const dataSource = {
    query: jest.fn().mockImplementation(async () => {
      if (first) {
        first = false;
        return referencedUrls.map((url) => ({ url }));
      }
      return [];
    }),
  };
  const svc = new StorageSweeperService(dataSource as never, cloudinary as never);
  return { svc, cloudinary, dataSource };
}

describe('StorageSweeperService', () => {
  it('scan: huérfano = no referenciado Y más viejo que la gracia', async () => {
    const files = [
      { relative: 'projects/ref.png', mtimeMs: NOW - 100 * H }, // referenciado
      { relative: 'projects/old-orphan.png', mtimeMs: NOW - 48 * H }, // huérfano viejo
      { relative: 'projects/new-orphan.png', mtimeMs: NOW - 2 * H }, // huérfano reciente → gracia
    ];
    const { svc } = build(files, ['https://api.test/uploads/projects/ref.png']);

    const res = await svc.scan(24, NOW);

    expect(res.totalFiles).toBe(3);
    expect(res.referenced).toBe(1);
    expect(res.orphans.map((o) => o.relative)).toEqual(['projects/old-orphan.png']);
  });

  it('scan: no marca nada si todo está referenciado', async () => {
    const files = [{ relative: 'avatars/a.png', mtimeMs: NOW - 100 * H }];
    const { svc } = build(files, ['https://api.test/uploads/avatars/a.png']);
    const res = await svc.scan(24, NOW);
    expect(res.orphans).toEqual([]);
  });

  it('sweep: borra solo los huérfanos detectados, nunca los referenciados', async () => {
    const files = [
      { relative: 'avatars/keep.png', mtimeMs: NOW - 100 * H }, // referenciado
      { relative: 'projects/trash.png', mtimeMs: NOW - 72 * H }, // huérfano
    ];
    const { svc, cloudinary } = build(files, [
      'https://api.test/uploads/avatars/keep.png',
    ]);

    const res = await svc.sweep(24, NOW);

    expect(res.deleted).toEqual(['projects/trash.png']);
    expect(cloudinary.deleteByRelative).toHaveBeenCalledWith('projects/trash.png');
    expect(cloudinary.deleteByRelative).not.toHaveBeenCalledWith('avatars/keep.png');
  });
});
