import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './core/database';
import { AuthModule, AuthGuard, RolesGuard } from './core/auth';
import { EventsModule } from './core/events';
import { CacheModule } from './core/cache';
import { AuditModule } from './core/audit';
import { AllExceptionsFilter } from './common/filters';
import { LoggingInterceptor, TransformInterceptor } from './common/interceptors';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { SecurityHeadersMiddleware, RateLimiterMiddleware } from './common/middleware';
import { OrgConfigModule } from './modules/org-config';
import { HrmModule } from './modules/hrm';
import { RewardsModule } from './modules/rewards';
import { ScoutModule } from './modules/scout';
import { SessionsModule } from './modules/sessions';
import { EventsCampModule } from './modules/events';
import { SpiritualModule } from './modules/spiritual';
import { LmsModule } from './modules/lms';
import { EnrichmentModule } from './modules/enrichment';
import { ProjectsModule } from './modules/projects';
import { TicketsModule } from './modules/tickets';
import { ApprovalsModule } from './modules/approvals';
import { FinanceModule } from './modules/finance';
import { AssetsModule } from './modules/assets';
import { ProcessModule } from './modules/process';
import { ChildSafetyModule } from './modules/child-safety';
import { NotificationsModule } from './modules/notifications';
import { DashboardsModule } from './modules/dashboards';
import { FileStorageModule } from './modules/file-storage';
import { SystemModule } from './modules/system';
import { DataImportModule } from './modules/data-import';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { AppController } from './app.controller';
import { HealthController } from './core/health/health.controller';
import { SyntheticProbeService } from './core/health/synthetic-probe.service';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    EventsModule,
    CacheModule,
    AuditModule,
    OrgConfigModule,
    HrmModule,
    RewardsModule,
    ScoutModule,
    SessionsModule,
    EventsCampModule,
    SpiritualModule,
    LmsModule,
    EnrichmentModule,
    ProjectsModule,
    TicketsModule,
    ApprovalsModule,
    FinanceModule,
    AssetsModule,
    ProcessModule,
    ChildSafetyModule,
    NotificationsModule,
    DashboardsModule,
    FileStorageModule,
    SystemModule,
    DataImportModule,
    WarehouseModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    SyntheticProbeService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware, RateLimiterMiddleware).forRoutes('*');
  }
}
