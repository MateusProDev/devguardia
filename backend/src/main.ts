import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as Sentry from '@sentry/node';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Inicializar Sentry se configurado
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

async function bootstrap() {
  // Validate required environment variables
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'MERCADOPAGO_ACCESS_TOKEN',
    'MERCADOPAGO_PUBLIC_KEY',
  ];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  // Validate optional but recommended variables
  const recommended = ['CLOUDFLARE_AI_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];
  const missingRecommended = recommended.filter((v) => !process.env[v]);
  if (missingRecommended.length > 0) {
    console.warn(`⚠️  Missing recommended environment variables (AI features will be limited): ${missingRecommended.join(', ')}`);
  }

  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    }),
  );

  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://app.devguardia.cloud',
    'https://devguardia.cloud',
    'https://www.devguardia.cloud',
  ];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: string | boolean) => void) => {
      // Permitir requests sem origin (alguns clients legítimos não enviam)
      if (!origin) {
        callback(null, allowedOrigins[0]); // Usar primeira origem permitida como default
      } else if (allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // Configurar Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('DevGuard AI API')
    .setDescription('API de segurança de aplicações web com análise automatizada de vulnerabilidades')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação Firebase')
    .addTag('scans', 'Gerenciamento de Scans')
    .addTag('payments', 'Pagamentos Mercado Pago')
    .addTag('admin', 'Administração')
    .addTag('health', 'Health Checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`DevGuard AI backend running on port ${port}`);
  console.log(`API documentation available at http://localhost:${port}/api/docs`);
}
bootstrap();
