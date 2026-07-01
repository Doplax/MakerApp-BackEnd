import { NestFactory, Reflector } from '@nestjs/core';
import {
  ValidationPipe,
  Logger,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { resolve } from 'path';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const logger = new Logger('Bootstrap');

  // Confiar en el proxy inverso (Traefik) para obtener la IP real del cliente
  // (necesario para que el rate limiting no vea a todos como la misma IP).
  app.set('trust proxy', 1);

  // Cabeceras de seguridad HTTP (HSTS, X-Content-Type-Options: nosniff, frameguard,
  // Referrer-Policy, etc.). CORP en cross-origin para que el front (otro subdominio)
  // pueda cargar las imágenes de /uploads. El CSP de HTML se aplica en nginx (front).
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  // Imágenes subidas (volumen persistente): se sirven como estáticos en /uploads,
  // fuera del prefijo /api. UPLOAD_DIR apunta al punto de montaje del volumen.
  const uploadDir = process.env.UPLOAD_DIR || resolve(process.cwd(), 'uploads');
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  // Prefijo global para la API
  app.setGlobalPrefix('api');

  // CORS — lista blanca de orígenes (coma). Sin '*' con credenciales: si CORS_ORIGIN
  // no está definida, se usa el origen de desarrollo (no un comodín).
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : ['http://localhost:4210'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validation pipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Interceptores globales (orden: Transform envuelve; ClassSerializer, al ser el
  // último registrado, corre PRIMERO sobre la entidad cruda y aplica @Exclude —
  // defensa en profundidad para nunca serializar password/tokens).
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // Swagger — SOLO fuera de producción (no exponer la documentación de la API en prod)
  const swaggerEnabled = process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('MakerUp API')
      .setDescription(
        'API para gestión de inventario de filamentos 3D, impresoras y proyectos',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Autenticación y registro')
      .addTag('filaments', 'Gestión de filamentos')
      .addTag('printers', 'Gestión de impresoras')
      .addTag('projects', 'Gestión de proyectos')
      .addTag('print-logs', 'Registro de impresiones')
      .addTag('statistics', 'Estadísticas y dashboard')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 MakerUp API running on: http://localhost:${port}/api`);
  if (swaggerEnabled) {
    logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
  }
}
bootstrap();
