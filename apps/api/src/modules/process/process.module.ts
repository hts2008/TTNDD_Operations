import { Module } from '@nestjs/common';
import { ProcessController } from './process.controller';
import { ProcessService } from './process.service';
import { SopService } from './sop.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { WorkflowTriggerSubscriber } from './workflow-trigger.subscriber';
import { TemplateService } from './template.service';
import { FileStorageModule } from '../file-storage';

@Module({
  imports: [FileStorageModule],
  controllers: [ProcessController],
  providers: [
    ProcessService,
    SopService,
    WorkflowExecutorService,
    WorkflowTriggerSubscriber,
    TemplateService,
  ],
  exports: [ProcessService, SopService, WorkflowExecutorService, TemplateService],
})
export class ProcessModule {}
