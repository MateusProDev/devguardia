import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // Validate required environment variables
  const required = ['DATABASE_URL', 'REDIS_URL', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
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
      if (!origin) {
        callback(null, false);
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

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`DevGuard AI backend running on port ${port}`);
}
bootstrap();
