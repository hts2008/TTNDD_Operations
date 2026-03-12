/**
 * Conflict resolution rules for offline sync (T-0119)
 * 
 * Strategies:
 * - Server-wins: For scoring/grading data (quiz scores, grades)
 * - Client-wins: For draft checklist progress
 * - Merge (highest): For partial quiz attempts — keep highest score
 */

export type ConflictStrategy = 'server_wins' | 'client_wins' | 'merge_highest';

export interface ConflictResult {
  decision: 'keep_server' | 'keep_client' | 'merged';
  reason: string;
}

/**
 * Determine which version to keep when server and client data conflict.
 */
export function resolveConflict(
  type: 'quiz_attempt' | 'checklist_completion',
  serverData: Record<string, unknown> | null,
  clientData: Record<string, unknown>,
): ConflictResult {
  const strategy = getStrategy(type);

  switch (strategy) {
    case 'server_wins':
      return resolveServerWins(serverData, clientData);
    case 'client_wins':
      return resolveClientWins(serverData, clientData);
    case 'merge_highest':
      return resolveMergeHighest(serverData, clientData);
  }
}

function getStrategy(type: string): ConflictStrategy {
  switch (type) {
    case 'quiz_attempt':
      return 'merge_highest'; // Keep highest score
    case 'checklist_completion':
      return 'client_wins'; // Always accept latest client progress
    default:
      return 'server_wins'; // Default: server authority
  }
}

function resolveServerWins(
  serverData: Record<string, unknown> | null,
  _clientData: Record<string, unknown>,
): ConflictResult {
  if (!serverData) {
    return { decision: 'keep_client', reason: 'no_server_data' };
  }
  return { decision: 'keep_server', reason: 'server_authoritative' };
}

function resolveClientWins(
  serverData: Record<string, unknown> | null,
  _clientData: Record<string, unknown>,
): ConflictResult {
  if (!serverData) {
    return { decision: 'keep_client', reason: 'no_server_data' };
  }
  return { decision: 'keep_client', reason: 'client_authoritative_for_drafts' };
}

function resolveMergeHighest(
  serverData: Record<string, unknown> | null,
  clientData: Record<string, unknown>,
): ConflictResult {
  if (!serverData) {
    return { decision: 'keep_client', reason: 'no_server_data' };
  }

  const serverScore = Number(serverData.score ?? 0);
  const clientScore = Number(clientData.score ?? 0);

  if (clientScore > serverScore) {
    return { decision: 'keep_client', reason: `client_score_higher (${clientScore} > ${serverScore})` };
  }
  if (serverScore > clientScore) {
    return { decision: 'keep_server', reason: `server_score_higher (${serverScore} > ${clientScore})` };
  }
  return { decision: 'merged', reason: 'scores_equal' };
}
