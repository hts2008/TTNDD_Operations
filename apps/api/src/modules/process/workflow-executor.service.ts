import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, type WorkflowRun } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

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
    conditionField?: string;
    conditionOperator?: '==' | '!=' | '>' | '<' | 'contains';
    conditionValue?: string;
    delayMinutes?: number;
    notificationTemplate?: string;
    notificationChannel?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: 'true' | 'false';
}

export interface WorkflowTrigger {
  id: string;
  eventType: string;
  conditions?: Record<string, unknown>;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'completed' | 'rejected' | 'error' | 'waiting';
  completedBy?: string;
  completedAt?: string;
  output?: Record<string, unknown>;
  notes?: string;
}

export interface WorkflowRuntimeState {
  activeNodeIds?: string[];
  delayUntilByNode?: Record<string, string>;
  joinWaitingNodeIds?: string[];
}

type WorkflowRunWithDefinition = WorkflowRun & {
  definition: {
    name?: string;
    nodesJson: Prisma.JsonValue;
    edgesJson: Prisma.JsonValue;
  };
};

@Injectable()
export class WorkflowExecutorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowExecutorService.name);
  private delayWorker?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    if (process.env.WORKFLOW_DELAY_WORKER_DISABLED === 'true') {
      return;
    }

    const intervalMs = Number(process.env.WORKFLOW_DELAY_WORKER_INTERVAL_MS ?? 5000);
    this.delayWorker = setInterval(
      () => {
        void this.processDueDelayNodes().catch((error) => {
          this.logger.error(`Workflow delay worker failed: ${this.errorMessage(error)}`);
        });
      },
      Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 5000,
    );
  }

  onModuleDestroy() {
    if (this.delayWorker) {
      clearInterval(this.delayWorker);
      this.delayWorker = undefined;
    }
  }

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

    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references missing source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references missing target node: ${edge.target}`);
      }
    }

    for (const node of nodes.filter((n) => n.type === 'condition')) {
      const outEdges = edges.filter((e) => e.source === node.id);
      if (outEdges.length !== 2) {
        errors.push(
          `Condition node '${node.label}' must have exactly 2 outgoing edges (true/false)`,
        );
      }
    }

    for (const node of startNodes) {
      if (edges.some((e) => e.target === node.id)) {
        errors.push('Start node cannot have incoming edges');
      }
    }

    return { valid: errors.length === 0, errors };
  }

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

  async startGraphRun(orgId: string, definitionId: string, actorUserId: string) {
    const definition = await this.prisma.workflowDefinition.findFirst({
      where: { id: definitionId, orgId, isActive: true },
    });
    if (!definition) throw new NotFoundException('Active workflow definition not found');

    const nodes = definition.nodesJson as unknown as WorkflowNode[];
    const edges = definition.edgesJson as unknown as WorkflowEdge[];
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
        activeNodeIds: [startNode.id],
        nodeResults: {} as Prisma.InputJsonValue,
        runtimeState: {
          activeNodeIds: [startNode.id],
          delayUntilByNode: {},
          joinWaitingNodeIds: [],
        } as Prisma.InputJsonValue,
        initiatedBy: actorUserId,
      },
    });

    await this.logRunAction(orgId, run.id, {
      action: 'run_started',
      nodeId: startNode.id,
      payload: { definitionName: definition.name },
      actorId: actorUserId,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: 'workflow.run.started',
      aggregateId: run.id,
      aggregateType: 'WorkflowRun',
      payload: { definitionId, definitionName: definition.name } as Prisma.InputJsonValue,
      actorUserId,
    });

    const nextNodes = this.getNextNodes(startNode.id, nodes, edges);
    if (nextNodes.length > 0) {
      return this.activateNextNodes(orgId, run.id, startNode, nextNodes, {}, actorUserId);
    }

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

    const activeNodeIds = this.getActiveNodeIds(run);
    if (!activeNodeIds.includes(result.nodeId)) {
      throw new BadRequestException(
        `Node '${result.nodeId}' is not active. Active nodes: ${activeNodeIds.join(', ') || 'none'}`,
      );
    }

    const nodes = run.definition.nodesJson as unknown as WorkflowNode[];
    const edges = run.definition.edgesJson as unknown as WorkflowEdge[];
    const currentNode = nodes.find((n) => n.id === result.nodeId);
    if (!currentNode) throw new BadRequestException('Node not found in definition');

    this.assertDelayIsDue(currentNode, run, result);

    const nodeResults = (run.nodeResults as Record<string, unknown>) ?? {};
    nodeResults[result.nodeId] = {
      status: result.status,
      completedBy: actorUserId,
      completedAt: new Date().toISOString(),
      output: result.output,
      notes: result.notes,
    };

    await this.logRunAction(orgId, runId, {
      action: 'node_completed',
      nodeId: result.nodeId,
      payload: { status: result.status, notes: result.notes },
      actorId: actorUserId,
    });

    if (result.status === 'rejected' && currentNode.type === 'approval') {
      return this.cancelRun(orgId, runId, `Rejected at node '${currentNode.label}'`, actorUserId);
    }

    const nextNodes = this.resolveNextNodes(currentNode, result, nodes, edges);
    return this.transitionFromExecutedNode(
      orgId,
      run,
      currentNode,
      nextNodes,
      nodeResults,
      nodes,
      edges,
      actorUserId,
    );
  }

  private async transitionFromExecutedNode(
    orgId: string,
    run: WorkflowRunWithDefinition,
    completedNode: WorkflowNode,
    nextNodes: WorkflowNode[],
    nodeResults: Record<string, unknown>,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    actorUserId: string,
  ): Promise<unknown> {
    const runtimeState = this.runtimeStateFromJson(run.runtimeState);
    if (runtimeState.delayUntilByNode) {
      delete runtimeState.delayUntilByNode[completedNode.id];
    }

    const remainingActive = this.getActiveNodeIds(run).filter(
      (nodeId) => nodeId !== completedNode.id,
    );
    const activated: WorkflowNode[] = [];
    const joinWaitingNodeIds: string[] = [];

    for (const nextNode of nextNodes) {
      if (nextNode.type === 'end') {
        await this.logRunAction(orgId, run.id, {
          action: 'node_entered',
          nodeId: nextNode.id,
          fromNode: completedNode.id,
          toNode: nextNode.id,
          actorId: actorUserId,
        });
        continue;
      }

      if (this.canActivateNode(nextNode, completedNode, nodeResults, edges)) {
        activated.push(nextNode);
      } else {
        joinWaitingNodeIds.push(nextNode.id);
        await this.logRunAction(orgId, run.id, {
          action: 'join_waiting',
          nodeId: nextNode.id,
          fromNode: completedNode.id,
          toNode: nextNode.id,
          payload: {
            waitingFor: this.pendingIncomingSources(
              nextNode.id,
              completedNode.id,
              nodeResults,
              edges,
            ),
          },
          actorId: actorUserId,
        });
      }
    }

    const activeNodeIds = this.uniqueNodeIds([
      ...remainingActive,
      ...activated.map((node) => node.id),
    ]);

    runtimeState.activeNodeIds = activeNodeIds;
    runtimeState.joinWaitingNodeIds = joinWaitingNodeIds;
    runtimeState.delayUntilByNode = runtimeState.delayUntilByNode ?? {};

    for (const node of activated) {
      await this.logRunAction(orgId, run.id, {
        action: 'transition',
        fromNode: completedNode.id,
        toNode: node.id,
        actorId: actorUserId,
      });

      if (node.type === 'delay') {
        await this.scheduleDelayNode(orgId, run.id, node, runtimeState, actorUserId);
      }
    }

    if (activeNodeIds.length === 0) {
      return this.completeRun(orgId, run.id, nodeResults, actorUserId);
    }

    await this.persistRunState(run.id, activeNodeIds, nodeResults, runtimeState);
    return this.processAutoRunnableNodes(orgId, run.id, actorUserId);
  }

  private async activateNextNodes(
    orgId: string,
    runId: string,
    fromNode: WorkflowNode,
    nextNodes: WorkflowNode[],
    nodeResults: Record<string, unknown>,
    actorUserId: string,
  ) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, orgId, status: 'in_progress' },
      include: { definition: true },
    });
    if (!run) throw new NotFoundException('Active workflow run not found');

    const nodes = run.definition.nodesJson as unknown as WorkflowNode[];
    const edges = run.definition.edgesJson as unknown as WorkflowEdge[];
    return this.transitionFromExecutedNode(
      orgId,
      run,
      fromNode,
      nextNodes,
      nodeResults,
      nodes,
      edges,
      actorUserId,
    );
  }

  private resolveNextNodes(
    currentNode: WorkflowNode,
    result: NodeExecutionResult,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): WorkflowNode[] {
    if (currentNode.type === 'condition') {
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
    if (!conditionField || !conditionOperator) return true;

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
    return edges
      .filter((edge) => edge.source === nodeId)
      .map((edge) => nodes.find((node) => node.id === edge.target))
      .filter((node): node is WorkflowNode => node !== undefined);
  }

  private canActivateNode(
    node: WorkflowNode,
    fromNode: WorkflowNode,
    nodeResults: Record<string, unknown>,
    edges: WorkflowEdge[],
  ) {
    const incomingSources = this.incomingSources(node.id, edges);
    if (incomingSources.length <= 1) return true;

    return incomingSources.every(
      (sourceId) =>
        sourceId === fromNode.id || this.nodeResultStatus(nodeResults, sourceId) === 'completed',
    );
  }

  private pendingIncomingSources(
    nodeId: string,
    fromNodeId: string,
    nodeResults: Record<string, unknown>,
    edges: WorkflowEdge[],
  ) {
    return this.incomingSources(nodeId, edges).filter(
      (sourceId) =>
        sourceId !== fromNodeId && this.nodeResultStatus(nodeResults, sourceId) !== 'completed',
    );
  }

  private incomingSources(nodeId: string, edges: WorkflowEdge[]) {
    return this.uniqueNodeIds(
      edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source),
    );
  }

  private nodeResultStatus(nodeResults: Record<string, unknown>, nodeId: string) {
    const result = nodeResults[nodeId];
    if (result && typeof result === 'object' && 'status' in result) {
      return String((result as { status?: unknown }).status ?? '');
    }
    return '';
  }

  private async autoExecuteNotification(
    orgId: string,
    runId: string,
    node: WorkflowNode,
    actorUserId: string,
  ): Promise<unknown> {
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

  private async scheduleDelayNode(
    orgId: string,
    runId: string,
    node: WorkflowNode,
    runtimeState: WorkflowRuntimeState,
    actorUserId: string,
  ) {
    runtimeState.delayUntilByNode = runtimeState.delayUntilByNode ?? {};
    if (!runtimeState.delayUntilByNode[node.id]) {
      const delayMinutes = Math.max(0, Number(node.data.delayMinutes ?? 0));
      const dueAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
      runtimeState.delayUntilByNode[node.id] = dueAt;
      await this.logRunAction(orgId, runId, {
        action: 'delay_scheduled',
        nodeId: node.id,
        payload: { delayMinutes, dueAt },
        actorId: actorUserId,
      });
    }
  }

  private async processAutoRunnableNodes(
    orgId: string,
    runId: string,
    actorUserId: string,
  ): Promise<unknown> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const run = await this.prisma.workflowRun.findFirst({
        where: { id: runId, orgId, status: 'in_progress' },
        include: { definition: true },
      });
      if (!run) return null;

      const nodes = run.definition.nodesJson as unknown as WorkflowNode[];
      const runtimeState = this.runtimeStateFromJson(run.runtimeState);
      const activeNodes = this.getActiveNodeIds(run)
        .map((nodeId) => nodes.find((node) => node.id === nodeId))
        .filter((node): node is WorkflowNode => node !== undefined);

      const notificationNode = activeNodes.find((node) => node.type === 'notification');
      if (notificationNode) {
        return this.autoExecuteNotification(orgId, runId, notificationNode, actorUserId);
      }

      const dueDelayNode = activeNodes.find(
        (node) => node.type === 'delay' && this.delayIsDue(node.id, runtimeState),
      );
      if (dueDelayNode) {
        return this.executeNode(
          orgId,
          runId,
          {
            nodeId: dueDelayNode.id,
            status: 'completed',
            output: { delayCompleted: true },
          },
          actorUserId,
        );
      }

      return run;
    }

    throw new BadRequestException('Workflow auto-execution exceeded safety limit');
  }

  async processDueDelayNodes(now = new Date()): Promise<{ processed: number; runIds: string[] }> {
    const runs = await this.prisma.workflowRun.findMany({
      where: {
        status: 'in_progress',
        waitingUntil: { lte: now },
      },
      include: { definition: true },
      take: 20,
    });

    const processedRunIds: string[] = [];
    for (const run of runs) {
      const nodes = run.definition.nodesJson as unknown as WorkflowNode[];
      const runtimeState = this.runtimeStateFromJson(run.runtimeState);
      const dueDelayNode = this.getActiveNodeIds(run)
        .map((nodeId) => nodes.find((node) => node.id === nodeId))
        .find(
          (node): node is WorkflowNode =>
            !!node && node.type === 'delay' && this.delayIsDue(node.id, runtimeState),
        );

      if (!dueDelayNode) continue;
      await this.executeNode(
        run.orgId,
        run.id,
        {
          nodeId: dueDelayNode.id,
          status: 'completed',
          output: { delayCompleted: true, workerProcessedAt: now.toISOString() },
        },
        run.initiatedBy,
      );
      processedRunIds.push(run.id);
    }

    return { processed: processedRunIds.length, runIds: processedRunIds };
  }

  private assertDelayIsDue(node: WorkflowNode, run: WorkflowRun, result: NodeExecutionResult) {
    if (node.type !== 'delay') return;
    const runtimeState = this.runtimeStateFromJson(run.runtimeState);
    const dueAt = runtimeState.delayUntilByNode?.[node.id];
    if (dueAt && new Date(dueAt).getTime() > Date.now() && result.status !== 'waiting') {
      throw new BadRequestException(`Delay node is waiting until ${dueAt}`);
    }
  }

  private delayIsDue(nodeId: string, runtimeState: WorkflowRuntimeState) {
    const dueAt = runtimeState.delayUntilByNode?.[nodeId];
    return !!dueAt && new Date(dueAt).getTime() <= Date.now();
  }

  private async persistRunState(
    runId: string,
    activeNodeIds: string[],
    nodeResults: Record<string, unknown>,
    runtimeState: WorkflowRuntimeState,
  ) {
    runtimeState.activeNodeIds = activeNodeIds;
    runtimeState.delayUntilByNode = Object.fromEntries(
      Object.entries(runtimeState.delayUntilByNode ?? {}).filter(([nodeId]) =>
        activeNodeIds.includes(nodeId),
      ),
    );

    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        currentNodeId: activeNodeIds[0] ?? null,
        activeNodeIds,
        nodeResults: nodeResults as Prisma.InputJsonValue,
        runtimeState: runtimeState as Prisma.InputJsonValue,
        waitingUntil: this.nextWaitingUntil(activeNodeIds, runtimeState),
      },
    });
  }

  private nextWaitingUntil(activeNodeIds: string[], runtimeState: WorkflowRuntimeState) {
    const dueTimes = Object.entries(runtimeState.delayUntilByNode ?? {})
      .filter(([nodeId]) => activeNodeIds.includes(nodeId))
      .map(([, dueAt]) => new Date(dueAt))
      .filter((date) => Number.isFinite(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    return dueTimes[0] ?? null;
  }

  private getActiveNodeIds(
    run: Pick<WorkflowRun, 'activeNodeIds' | 'currentNodeId' | 'runtimeState'>,
  ) {
    if (run.activeNodeIds?.length) {
      return this.uniqueNodeIds(run.activeNodeIds);
    }

    const runtimeState = this.runtimeStateFromJson(run.runtimeState);
    if (runtimeState.activeNodeIds?.length) {
      return this.uniqueNodeIds(runtimeState.activeNodeIds);
    }

    return run.currentNodeId ? [run.currentNodeId] : [];
  }

  private runtimeStateFromJson(value: Prisma.JsonValue): WorkflowRuntimeState {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { activeNodeIds: [], delayUntilByNode: {}, joinWaitingNodeIds: [] };
    }

    const state = value as Record<string, unknown>;
    const activeNodeIds = Array.isArray(state.activeNodeIds) ? state.activeNodeIds.map(String) : [];
    const joinWaitingNodeIds = Array.isArray(state.joinWaitingNodeIds)
      ? state.joinWaitingNodeIds.map(String)
      : [];
    const delayUntilByNode =
      state.delayUntilByNode &&
      typeof state.delayUntilByNode === 'object' &&
      !Array.isArray(state.delayUntilByNode)
        ? Object.fromEntries(
            Object.entries(state.delayUntilByNode as Record<string, unknown>).map(
              ([key, value]) => [key, String(value)],
            ),
          )
        : {};

    return { activeNodeIds, delayUntilByNode, joinWaitingNodeIds };
  }

  private uniqueNodeIds(nodeIds: string[]) {
    return Array.from(new Set(nodeIds.filter(Boolean)));
  }

  private async advanceToNode(
    orgId: string,
    runId: string,
    node: WorkflowNode,
    actorUserId: string,
  ): Promise<unknown> {
    return this.activateNextNodes(orgId, runId, node, [node], {}, actorUserId);
  }

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
        currentNodeId: null,
        activeNodeIds: [],
        nodeResults: nodeResults as Prisma.InputJsonValue,
        runtimeState: { activeNodeIds: [], delayUntilByNode: {}, joinWaitingNodeIds: [] },
        waitingUntil: null,
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
        currentNodeId: null,
        activeNodeIds: [],
        runtimeState: { activeNodeIds: [], delayUntilByNode: {}, joinWaitingNodeIds: [] },
        waitingUntil: null,
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

  async handleTriggerEvent(orgId: string, eventType: string, payload: Record<string, unknown>) {
    const definitions = await this.prisma.workflowDefinition.findMany({
      where: { orgId, isActive: true },
    });

    const triggered: string[] = [];
    for (const def of definitions) {
      const triggers = def.triggersJson as unknown as WorkflowTrigger[];
      if (!triggers?.length) continue;

      for (const trigger of triggers) {
        if (trigger.eventType !== eventType) continue;
        if (trigger.conditions && !this.matchesTriggerConditions(trigger.conditions, payload)) {
          continue;
        }

        this.logger.log(`Trigger matched: ${def.name} for event ${eventType}`);
        const run = (await this.startGraphRun(
          orgId,
          def.id,
          def.createdBy ?? '00000000-0000-4000-8000-000000000000',
        )) as {
          id: string;
        };
        triggered.push(run.id);
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
        activeNodeIds: run.activeNodeIds,
        waitingUntil: run.waitingUntil,
        initiatedBy: run.initiatedBy,
        errorMessage: run.errorMessage,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
      },
      definition: { name: run.definition.name },
      nodeResults: run.nodeResults,
      runtimeState: run.runtimeState,
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
    const now = new Date();

    const stuckRuns = await this.prisma.workflowRun.findMany({
      where: {
        orgId,
        status: 'in_progress',
        createdAt: { lt: threshold },
        OR: [{ waitingUntil: null }, { waitingUntil: { lte: now } }],
      },
      include: { definition: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return {
      count: stuckRuns.length,
      thresholdMinutes: stuckThresholdMinutes,
      runs: stuckRuns.map((run) => ({
        id: run.id,
        definitionName: run.definition.name,
        currentNodeId: run.currentNodeId,
        activeNodeIds: run.activeNodeIds,
        waitingUntil: run.waitingUntil,
        startedAt: run.createdAt,
        stuckDurationMinutes: Math.round((Date.now() - run.createdAt.getTime()) / 60000),
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
      payload: { retriedBy: actorUserId, activeNodeIds: run.activeNodeIds },
      actorId: actorUserId,
    });

    return { message: `Run ${runId} flagged for retry at node ${run.currentNodeId}`, runId };
  }

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

  async autoResolveStuckRuns(
    orgId: string,
    actorUserId: string,
  ): Promise<{ resolved: number; runIds: string[] }> {
    const threshold = 24 * 60;
    const stuckResult = await this.findStuckRuns(orgId, threshold);
    const resolvedIds: string[] = [];

    for (const run of stuckResult.runs) {
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'cancelled',
          currentNodeId: null,
          activeNodeIds: [],
          waitingUntil: null,
          runtimeState: { activeNodeIds: [], delayUntilByNode: {}, joinWaitingNodeIds: [] },
          completedAt: new Date(),
        },
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

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
