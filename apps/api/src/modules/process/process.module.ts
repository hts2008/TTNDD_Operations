import { Module } from '@nestjs/common';
import { ProcessController } from './process.controller';
import { ProcessService } from './process.service';
import { SopService } from './sop.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { TemplateService } from './template.service';

@Module({
  controllers: [ProcessController],
  providers: [ProcessService, SopService, WorkflowExecutorService, TemplateService],
  exports: [ProcessService, SopService, WorkflowExecutorService, TemplateService],
})
export class ProcessModule {}
