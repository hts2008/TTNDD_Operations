import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Use Socket.IO adapter for WebSocket support
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.GATEWAY_PORT || 3002;
  await app.listen(port);
  console.log(`⚡ TTNDD Gateway running on http://localhost:${port}`);
  console.log(`🔌 Socket.IO ready for battle connections`);
}

bootstrap();
