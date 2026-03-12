import {
  Controller, Get, Post, Patch, Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  // ── T-0151: Definition CRUD ──

  @Post('definitions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0151: Create approval definition' })
  createDefinition(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      name: string; description?: string; entityType: string;
      steps: { name: string; type: string; signerRole?: string; signerUserId?: string; autoApproveCondition?: unknown }[];
      triggerConditions?: { field: string; operator: string; value: unknown }[];
      thresholds?: { minAmount?: number; maxAmount?: number; requiredRole: string; requiredLevel?: number }[];
    },
  ) {
    return this.approvalsService.createDefinition(user.orgId, body as Parameters<typeof this.approvalsService.createDefinition>[1], user.userId);
  }

  @Get('definitions')
  @ApiOperation({ summary: 'T-0151: List approval definitions' })
  findDefinitions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('entityType') entityType?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
  ) {
    return this.approvalsService.findDefinitions(
      user.orgId,
      { entityType, isActive: isActive ? isActive === 'true' : undefined },
      page ? parseInt(page) : 1,
    );
  }

  @Get('definitions/:definitionId')
  @ApiOperation({ summary: 'T-0151: Get approval definition details' })
  findDefinitionById(@CurrentUser() user: CurrentUserPayload, @Param('definitionId') definitionId: string) {
    return this.approvalsService.findDefinitionById(user.orgId, definitionId);
  }

  @Patch('definitions/:definitionId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0151: Update approval definition' })
  updateDefinition(
    @CurrentUser() user: CurrentUserPayload,
    @Param('definitionId') definitionId: string,
    @Body() body: Partial<{
      name: string; description: string; isActive: boolean;
      steps: unknown[]; triggerConditions: unknown[]; thresholds: unknown[];
    }>,
  ) {
    return this.approvalsService.updateDefinition(user.orgId, definitionId, body as Parameters<typeof this.approvalsService.updateDefinition>[2]);
  }

  // ── T-0151: Request Lifecycle ──

  @Post('requests')
  @ApiOperation({ summary: 'T-0151: Submit entity for approval' })
  submitForApproval(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      definitionId: string; entityType: string; entityId: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.approvalsService.submitForApproval(user.orgId, body, user.userId);
  }

  @Get('requests')
  @ApiOperation({ summary: 'T-0152: List approval requests' })
  findRequests(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('page') page?: string,
  ) {
    return this.approvalsService.findRequests(
      user.orgId,
      { status, entityType },
      page ? parseInt(page) : 1,
    );
  }

  @Get('requests/:requestId')
  @ApiOperation({ summary: 'T-0153: Get approval request details' })
  findRequestById(@CurrentUser() user: CurrentUserPayload, @Param('requestId') requestId: string) {
    return this.approvalsService.findRequestById(user.orgId, requestId);
  }

  @Post('requests/:requestId/decide')
  @ApiOperation({ summary: 'T-0153: Approve or reject current step' })
  decideStep(
    @CurrentUser() user: CurrentUserPayload,
    @Param('requestId') requestId: string,
    @Body() body: { status: 'approved' | 'rejected'; notes?: string },
  ) {
    return this.approvalsService.decideStep(user.orgId, requestId, body, user.userId);
  }

  @Post('requests/:requestId/cancel')
  @ApiOperation({ summary: 'T-0153: Cancel approval request' })
  cancelRequest(@CurrentUser() user: CurrentUserPayload, @Param('requestId') requestId: string) {
    return this.approvalsService.cancelRequest(user.orgId, requestId, user.userId);
  }

  // ── T-0152: Rule Evaluation ──

  @Post('evaluate')
  @ApiOperation({ summary: 'T-0152: Find applicable approval definition for an entity' })
  evaluateApplicable(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { entityType: string; context: Record<string, unknown> },
  ) {
    return this.approvalsService.findApplicableDefinition(user.orgId, body.entityType, body.context);
  }

  // ── T-0154: Threshold Evaluation ──

  @Post('evaluate-threshold')
  @ApiOperation({ summary: 'T-0154: Check if amount requires approval for given role' })
  evaluateThreshold(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { definitionId: string; amount: number; userRole: string },
  ) {
    return this.approvalsService.findDefinitionById(user.orgId, body.definitionId).then((def) => {
      const thresholds = def.thresholds as unknown as { minAmount?: number; maxAmount?: number; requiredRole: string; requiredLevel?: number }[];
      return this.approvalsService.evaluateThresholds(thresholds, body.amount, body.userRole);
    });
  }

  // ── T-0153: Pending for Current User ──

  @Get('pending')
  @ApiOperation({ summary: 'T-0153: Get approval requests pending for current user' })
  findPendingForUser(@CurrentUser() user: CurrentUserPayload) {
    return this.approvalsService.findPendingForUser(user.orgId, user.userId, user.role ?? 'member');
  }
}
