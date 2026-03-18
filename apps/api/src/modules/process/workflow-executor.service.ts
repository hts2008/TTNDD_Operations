import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

// ══════════════════════════════════════════════
// T-1106: Node/Edge Type Definitions
// ══════════════════════════════════════════════

export type NodeType =
  | 'start'
  | 'end'
  | 'approval'
  | 'task'
  | 'notification'
  | 'condition'
  | 'delay';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  data: {
    assigneeRole?: string;
    description?: string;
    // condition node
    conditionField?: string;
    conditionOperator?: '==' | '!=' | '>' | '<' | 'contains';
    conditionValue?: string;
    // delay node
    delayMinutes?: number;
    // notification node
    notificationTemplate?: string;
    notificationChannel?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  // For condition nodes: which branch (true/false)
  sourceHandle?: 'true' | 'false';
}

// T-1109: Trigger definitions
export interface WorkflowTrigger {
  id: string;
  eventType: string; // e.g., 'member.created', 'ticket.status_changed'
  conditions?: Record<string, unknown>; // optional filter conditions
}

// T-1108: Node execution result
export interface NodeExecutionResult {
  nodeId: string;
  status: 'completed' | 'rejected' | 'error' | 'waiting';
  completedBy?: string;
  completedAt?: string;
  output?: Record<string, unknown>;
  notes?: string;
}

// ══════════════════════════════════════════════
// T-1108: Executor Service
// ══════════════════════════════════════════════

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Graph Validation (T-1106) ──

  validateGraph(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const startNodes = nodes.filter((n) => n.type === 'start');
    const endNodes = nodes.filter((n) => n.type === 'end');

    if (startNodes.length === 0) errors.push('Workflow must have at least one start node');
    if (startNodes.length > 1) errors.push('Workflow must have exactly one start node');
    if (endNodes.length === 0) errors.push('Workflow must have at least one end node');

    // Check all nodes are connected
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.source))
        errors.push(`Edge references missing source node: ${edge.source}`);
      if (!nodeIds.has(edge.target))
        errors.push(`Edge references missing target node: ${edge.target}`);
    }

    // Check condition nodes have exactly 2 outgoing edges (true/false)
    const conditionNodes = nodes.filter((n) => n.type === 'condition');
    for (const cn of conditionNodes) {
      const outEdges = edges.filter((e) => e.source === cn.id);
      if (outEdges.length !== 2) {
        errors.push(`Condition node '${cn.label}' must have exactly 2 outgoing edges (true/false)`);
      }
    }

    // Check start node has no incoming edges
    for (const sn of startNodes) {
      const inEdges = edges.filter((e) => e.target === sn.id);
      if (inEdges.length > 0) errors.push('Start node cannot have incoming edges');
    }

    return { valid: errors.length === 0, errors };
  }

  // ── Save Definition Graph (T-1106) ──

  async saveDefinitionGraph(
    orgId: string,
    definitionId: string,
    data: {
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
      triggers?: WorkflowTrigger[];
    },
    actorUserId: string,
  ) {
    const validation = this.validateGraph(data.nodes, data.edges);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid workflow graph: ${validation.errors.join('; ')}`);
    }

    const definition = await this.prisma.workflowDefinition.findFirst({
      where: { id: definitionId, orgId },
    });
    if (!definition) throw new NotFoundException('Workflow definition not found');

    const updated = await this.prisma.workflowDefinition.update({
      where: { id: definitionId },
      data: {
        nodesJson: data.nodes as unknown as Prisma.InputJsonValue,
        edgesJson: data.edges as unknown as Prisma.InputJsonValue,
        triggersJson: (data.triggers ?? []) as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'process.graph_saved',
      resource: 'WorkflowDefinition',
      resourceId: definitionId,
      newValue: {
        nodeCount: data.nodes.length,
        edgeCount: data.edges.length,
      } as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  // ── T-1108: Executor Runtime ──

  async startGraphRun(orgId: string, definitionId: string, actorUserId: string) {
    const definition = await this.prisma.workflowDefinition.findFirst({
      where: { id: definitionId, orgId, isActive: true },
    });
    if (!definition) throw new NotFoundException('Active workflow definition not found');

    const nodes = definition.nodesJson as unknown as WorkflowNode[];
    if (!nodes?.length) {
      throw new BadRequestException(
        'Workflow has no graph nodes. Use legacy linear execution or save a graph first.',
      );
    }

    const startNode = nodes.find((n) => n.type === 'start');
    if (!startNode) throw new BadRequestException('Workflow graph has no start node');

    const run = await this.prisma.workflowRun.create({
      data: {
        orgId,
        definitionId,
        status: 'in_progress',
        currentNodeId: startNode.id,
        nodeResults: {} as Prisma.InputJsonValue,
        initiatedBy: actorUserId,
      },
    });

    // Log the start
    await this.logRunAction(orgId, run.id, {
      action: 'run_started',
      nodeId: startNode.id,
      payload: { definitionName: definition.name },
      actorId: actorUserId,
    });

    // Auto-advance past start node to the first real node
    const nextNodes = this.getNextNodes(
      startNode.id,
      nodes,
      definition.edgesJson as unknown as WorkflowEdge[],
    );
    if (nextNodes.length === 1 && nextNodes[0]) {
      return this.advanceToNode(orgId, run.id, nextNodes[0], actorUserId);
    }

    await this.domainEvents.publish({
      orgId,
      eventType: 'workflow.run.started',
      aggregateId: run.id,
      aggregateType: 'WorkflowRun',
      payload: { definitionId, definitionName: definition.name } as Prisma.InputJsonValue,
      actorUserId,
    });

    return run;
  }

  async executeNode(
    orgId: string,
    runId: string,
    result: NodeExecutionResult,
    actorUserId: string,
  ): Promise<unknown> {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, orgId, status: 'in_progress' },
      include: { definition: true },
    });
    if (!run) throw new NotFoundException('Active workflow run not found');

    if (run.currentNodeId !== result.nodeId) {
      throw new BadRequestException(
        `Current node is '${run.currentNodeId}', not '${result.nodeId}'`,
      );
    }

    const nodes = run.definition.nodesJson as unknown as WorkflowNode[];
    const edges = run.definition.edgesJson as unknown as WorkflowEdge[];
    const currentNode = nodes.find((n) => n.id === result.nodeId);
    if (!currentNode) throw new BadRequestException('Node not found in definition');

    // Record node result
    const nodeResults = (run.nodeResults as Record<string, unknown>) ?? {};
    nodeResults[result.nodeId] = {
      status: result.status,
      completedBy: actorUserId,
      completedAt: new Date().toISOString(),
      output: result.output,
      notes: result.notes,
    };

    // Log node completion
    await this.logRunAction(orgId, runId, {
      action: 'node_completed',
      nodeId: result.nodeId,
      payload: { status: result.status, notes: result.notes },
      actorId: actorUserId,
    });

    // Handle rejection — cancel the run
    if (result.status === 'rejected' && currentNode.type === 'approval') {
      return this.cancelRun(orgId, runId, `Rejected at node '${currentNode.label}'`, actorUserId);
    }

    // Find next node(s)
    const nextNodes = this.resolveNextNodes(currentNode, result, nodes, edges);

    if (nextNodes.length === 0) {
      // No outgoing edges — this might be an end node or dead end
      return this.completeRun(orgId, runId, nodeResults, actorUserId);
    }

    // Advance to next node (for now, take the first one — parallel execution is future scope)
    const nextNode = nextNodes[0];
    if (!nextNode) {
      return this.completeRun(orgId, runId, nodeResults, actorUserId);
    }

    // Check if next node is an 'end' node
    if (nextNode.type === 'end') {
      await this.logRunAction(orgId, runId, {
        action: 'node_entered',
        nodeId: nextNode.id,
        fromNode: result.nodeId,
        toNode: nextNode.id,
        actorId: actorUserId,
      });
      return this.completeRun(orgId, runId, nodeResults, actorUserId);
    }

    // Update run state
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        currentNodeId: nextNode.id,
        nodeResults: nodeResults as Prisma.InputJsonValue,
      },
    });

    await this.logRunAction(orgId, runId, {
      action: 'transition',
      fromNode: result.nodeId,
      toNode: nextNode.id,
      actorId: actorUserId,
    });

    // Auto-execute notification and delay nodes
    if (nextNode.type === 'notification') {
      return this.autoExecuteNotification(orgId, runId, nextNode, actorUserId);
    }

    return this.prisma.workflowRun.findFirst({
      where: { id: runId },
      include: { definition: { select: { name: true, nodesJson: true, edgesJson: true } } },
    });
  }

  // ── T-1108: Guard Logic for Condition Nodes ──

  private resolveNextNodes(
    currentNode: WorkflowNode,
    result: NodeExecutionResult,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): WorkflowNode[] {
    if (currentNode.type === 'condition') {
      // Evaluate condition against result output
      const condResult = this.evaluateCondition(currentNode, result.output ?? {});
      const handle = condResult ? 'true' : 'false';
      const matchingEdge = edges.find(
        (e) => e.source === currentNode.id && e.sourceHandle === handle,
      );
      if (!matchingEdge) return [];
      const targetNode = nodes.find((n) => n.id === matchingEdge.target);
      return targetNode ? [targetNode] : [];
    }

    return this.getNextNodes(currentNode.id, nodes, edges);
  }

  private evaluateCondition(node: WorkflowNode, output: Record<string, unknown>): boolean {
    const { conditionField, conditionOperator, conditionValue } = node.data;
    if (!conditionField || !conditionOperator) return true; // Pass through if no condition set

    const actual = String(output[conditionField] ?? '');
    const expected = conditionValue ?? '';

    switch (conditionOperator) {
      case '==':
        return actual === expected;
      case '!=':
        return actual !== expected;
      case '>':
        return Number(actual) > Number(expected);
      case '<':
        return Number(actual) < Number(expected);
      case 'contains':
        return actual.includes(expected);
      default:
        return true;
    }
  }

  private getNextNodes(
    nodeId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): WorkflowNode[] {
    const outEdges = edges.filter((e) => e.source === nodeId);
    return outEdges
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n): n is WorkflowNode => n !== undefined);
  }

  // ── Auto-execute Notification Nodes (T-1109) ──

  private async autoExecuteNotification(
    orgId: string,
    runId: string,
    node: WorkflowNode,
    actorUserId: string,
  ): Promise<unknown> {
    // Emit a domain event for the notification system to pick up
    await this.domainEvents.publish({
      orgId,
      eventType: 'workflow.notification.requested',
      aggregateId: runId,
      aggregateType: 'WorkflowRun',
      payload: {
        nodeId: node.id,
        template: node.data.notificationTemplate,
        channel: node.data.notificationChannel ?? 'in_app',
      } as Prisma.InputJsonValue,
      actorUserId,
    });

    // Auto-complete the notification node
    return this.executeNode(
      orgId,
      runId,
      {
        nodeId: node.id,
        status: 'completed',
        output: { notificationSent: true },
      },
      actorUserId,
    );
  }

  // ── Advance Helper ──

  private async advanceToNode(
    orgId: string,
    runId: string,
    node: WorkflowNode,
    actorUserId: string,
  ): Promise<unknown> {
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { currentNodeId: node.id },
    });

    await this.logRunAction(orgId, runId, {
      action: 'transition',
      toNode: node.id,
      actorId: actorUserId,
    });

    // Auto-execute non-interactive nodes
    if (node.type === 'notification') {
      return this.autoExecuteNotification(orgId, runId, node, actorUserId);
    }

    return this.prisma.workflowRun.findFirst({
      where: { id: runId },
      include: { definition: { select: { name: true, nodesJson: true, edgesJson: true } } },
    });
  }

  // ── Complete / Cancel Run ──

  private async completeRun(
    orgId: string,
    runId: string,
    nodeResults: Record<string, unknown>,
    actorUserId: string,
  ) {
    const run = await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: 'completed',
        nodeResults: nodeResults as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
      include: { definition: { select: { name: true } } },
    });

    await this.logRunAction(orgId, runId, { action: 'run_completed', actorId: actorUserId });

    await this.domainEvents.publish({
      orgId,
      eventType: 'workflow.run.completed',
      aggregateId: runId,
      aggregateType: 'WorkflowRun',
      payload: { definitionName: run.definition.name } as Prisma.InputJsonValue,
      actorUserId,
    });

    return run;
  }

  private async cancelRun(orgId: string, runId: string, reason: string, actorUserId: string) {
    const run = await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: 'cancelled',
        errorMessage: reason,
        completedAt: new Date(),
      },
    });

    await this.logRunAction(orgId, runId, {
      action: 'run_cancelled',
      payload: { reason },
      actorId: actorUserId,
    });

    return run;
  }

  // ── T-1109: Trigger Adapter ──

  async handleTriggerEvent(orgId: string, eventType: string, payload: Record<string, unknown>) {
    // Find definitions with matching triggers
    const definitions = await this.prisma.workflowDefinition.findMany({
      where: { orgId, isActive: true },
    });

    const triggered: string[] = [];

    for (const def of definitions) {
      const triggers = def.triggersJson as unknown as WorkflowTrigger[];
      if (!triggers?.length) continue;

      for (const trigger of triggers) {
        if (trigger.eventType === eventType) {
          // Check optional conditions
          if (trigger.conditions && !this.matchesTriggerConditions(trigger.conditions, payload)) {
            continue;
          }

          this.logger.log(`Trigger matched: ${def.name} for event ${eventType}`);
          const run = (await this.startGraphRun(orgId, def.id, 'system')) as { id: string };
          triggered.push(run.id);
        }
      }
    }

    return { triggered, count: triggered.length };
  }

  private matchesTriggerConditions(
    conditions: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): boolean {
    for (const [key, expected] of Object.entries(conditions)) {
      if (payload[key] !== expected) return false;
    }
    return true;
  }

  // ── T-1110: Run History & Debugging ──

  async getRunHistory(orgId: string, runId: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, orgId },
      include: {
        definition: { select: { name: true, nodesJson: true, edgesJson: true } },
        logs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!run) throw new NotFoundException('Workflow run not found');

    return {
      run: {
        id: run.id,
        status: run.status,
        currentNodeId: run.currentNodeId,
        initiatedBy: run.initiatedBy,
        errorMessage: run.errorMessage,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
      },
      definition: { name: run.definition.name },
      nodeResults: run.nodeResults,
      timeline: run.logs.map((log) => ({
        id: log.id,
        action: log.action,
        nodeId: log.nodeId,
        fromNode: log.fromNode,
        toNode: log.toNode,
        payload: log.payload,
        actorId: log.actorId,
        timestamp: log.createdAt,
      })),
      graph: {
        nodes: run.definition.nodesJson,
        edges: run.definition.edgesJson,
      },
    };
  }

  async findStuckRuns(orgId: string, stuckThresholdMinutes = 60) {
    const threshold = new Date(Date.now() - stuckThresholdMinutes * 60 * 1000);

    const stuckRuns = await this.prisma.workflowRun.findMany({
      where: {
        orgId,
        status: 'in_progress',
        createdAt: { lt: threshold },
      },
      include: { definition: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return {
      count: stuckRuns.length,
      thresholdMinutes: stuckThresholdMinutes,
      runs: stuckRuns.map((r) => ({
        id: r.id,
        definitionName: r.definition.name,
        currentNodeId: r.currentNodeId,
        startedAt: r.createdAt,
        stuckDurationMinutes: Math.round((Date.now() - r.createdAt.getTime()) / 60000),
      })),
    };
  }

  async retryStuckRun(orgId: string, runId: string, actorUserId: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, orgId, status: 'in_progress' },
      include: { definition: true },
    });
    if (!run) throw new NotFoundException('Stuck run not found');

    await this.logRunAction(orgId, runId, {
      action: 'retry_attempted',
      nodeId: run.currentNodeId ?? undefined,
      payload: { retriedBy: actorUserId },
      actorId: actorUserId,
    });

    return { message: `Run ${runId} flagged for retry at node ${run.currentNodeId}`, runId };
  }

  // ── Run Log Helper ──

  private async logRunAction(
    orgId: string,
    runId: string,
    data: {
      action: string;
      nodeId?: string;
      fromNode?: string;
      toNode?: string;
      payload?: Record<string, unknown>;
      actorId?: string;
    },
  ) {
    await this.prisma.workflowRunLog.create({
      data: {
        orgId,
        runId,
        nodeId: data.nodeId,
        action: data.action,
        fromNode: data.fromNode,
        toNode: data.toNode,
        payload: (data.payload ?? {}) as Prisma.InputJsonValue,
        actorId: data.actorId,
      },
    });
  }

  // ── T-1118: Auto-resolve stuck runs ──

  async autoResolveStuckRuns(
    orgId: string,
    actorUserId: string,
  ): Promise<{ resolved: number; runIds: string[] }> {
    const threshold = 24 * 60; // 24 hours in minutes
    const stuckResult = await this.findStuckRuns(orgId, threshold);
    const resolvedIds: string[] = [];

    for (const run of stuckResult.runs) {
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: 'cancelled', completedAt: new Date() },
      });

      await this.logRunAction(orgId, run.id, {
        action: 'auto_resolved',
        payload: {
          reason: `Automatically cancelled: stuck for ${run.stuckDurationMinutes} minutes (threshold: ${threshold})`,
          resolvedBy: actorUserId,
        },
        actorId: actorUserId,
      });

      resolvedIds.push(run.id);
    }

    return { resolved: resolvedIds.length, runIds: resolvedIds };
  }
}
