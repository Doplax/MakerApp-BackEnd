import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service.js';

/**
 * Tests de subida de ficheros: son un flujo crítico (imágenes de proyectos,
 * avatares y ahora documentos/licencias). Validamos que:
 *  - solo se aceptan imágenes reales (magic bytes) en uploadBuffer,
 *  - solo se aceptan PDFs reales en uploadDocument,
 *  - se respetan límites de tamaño y carpetas válidas,
 *  - no se puede escapar del UPLOAD_DIR (path traversal) al borrar.
 */
describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let uploadDir: string;

  // PNG 1x1 mínimo válido (magic bytes + IHDR) — suficiente para image-size.
  const PNG_1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  const PDF_BYTES = Buffer.concat([
    Buffer.from('%PDF-1.4\n', 'latin1'),
    Buffer.from('1 0 obj<<>>endobj\n%%EOF', 'latin1'),
  ]);

  beforeEach(async () => {
    uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'makerapp-uploads-'));
    const config = {
      get: (key: string, def?: unknown) => {
        if (key === 'UPLOAD_DIR') return uploadDir;
        if (key === 'PUBLIC_URL') return 'https://api.test';
        return def;
      },
    } as unknown as ConfigService;
    service = new CloudinaryService(config);
  });

  afterEach(async () => {
    await fs.rm(uploadDir, { recursive: true, force: true }).catch(() => undefined);
  });

  describe('uploadBuffer (imágenes)', () => {
    it('guarda una imagen PNG válida y devuelve una URL pública', async () => {
      const res = await service.uploadBuffer(PNG_1x1, 'projects', 'proj-1');
      expect(res.secure_url).toBe('https://api.test/uploads/projects/proj-1.png');
      expect(res.public_id).toBe('projects/proj-1');
      expect(res.bytes).toBe(PNG_1x1.length);
      // el fichero existe físicamente
      await expect(
        fs.stat(path.join(uploadDir, 'projects', 'proj-1.png')),
      ).resolves.toBeDefined();
    });

    it('rechaza un fichero que no es imagen (p. ej. un PDF)', async () => {
      await expect(
        service.uploadBuffer(PDF_BYTES, 'projects'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('uploadDocument (PDF)', () => {
    it('guarda un PDF válido en la carpeta de licencias', async () => {
      const res = await service.uploadDocument(PDF_BYTES, 'licenses', 'lic-1');
      expect(res.secure_url).toBe('https://api.test/uploads/licenses/lic-1.pdf');
      expect(res.public_id).toBe('licenses/lic-1');
      await expect(
        fs.stat(path.join(uploadDir, 'licenses', 'lic-1.pdf')),
      ).resolves.toBeDefined();
    });

    it('rechaza un fichero que no es PDF (una imagen)', async () => {
      await expect(
        service.uploadDocument(PNG_1x1, 'documents'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un buffer vacío', async () => {
      await expect(
        service.uploadDocument(Buffer.alloc(0), 'documents'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un documento que supera el tamaño máximo (10 MB)', async () => {
      const big = Buffer.concat([
        Buffer.from('%PDF-1.4\n', 'latin1'),
        Buffer.alloc(10 * 1024 * 1024 + 1),
      ]);
      await expect(
        service.uploadDocument(big, 'documents'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('deleteByUrl', () => {
    it('borra un fichero previamente subido', async () => {
      const { secure_url } = await service.uploadDocument(PDF_BYTES, 'licenses', 'del-1');
      await service.deleteByUrl(secure_url);
      await expect(
        fs.stat(path.join(uploadDir, 'licenses', 'del-1.pdf')),
      ).rejects.toBeDefined();
    });

    it('ignora URLs que intentan salir del UPLOAD_DIR (path traversal)', async () => {
      // Creamos un fichero "sensible" fuera del subárbol servido.
      const outside = path.join(uploadDir, 'secret.txt');
      await fs.writeFile(outside, 'no borrar');
      await service.deleteByUrl('https://api.test/uploads/../secret.txt');
      // Debe seguir existiendo: el guard de path traversal lo impide.
      await expect(fs.stat(outside)).resolves.toBeDefined();
    });
  });
});
