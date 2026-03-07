import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule);

  // Health check endpoint only — no REST API
  const port = process.env.WORKER_PORT || 3002;
  await app.listen(port);

  console.log(`🔧 TTNDD_OPS Worker running on http://localhost:${port}`);
  console.log(`❤️  Health check: http://localhost:${port}/health`);
}

bootstrap();
