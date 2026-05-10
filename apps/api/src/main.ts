import './load-env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({
    origin: webOrigin.split(',').map((o) => o.trim()),
    credentials: process.env.CORS_CREDENTIALS === 'true',
  });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
