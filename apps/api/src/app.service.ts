import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'ttndd-ops-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
