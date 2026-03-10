import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController],
  imports: [EventsModule],

  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
