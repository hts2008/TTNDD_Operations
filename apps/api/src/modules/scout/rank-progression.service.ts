import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * SM-10: Skill Progress State Machine
 * not_started → in_progress → pending_review → verified → awarded
 *
 * SM-11: Rank Progression State Machine
 * in_progress → eligible → proposed → council_review → approved → ceremony_scheduled → completed
 */

const SKILL_TRANSITIONS: Record<string, Record<string, string>> = {
  not_started: { start: 'in_progress' },
  in_progress: { submit_review: 'pending_review' },
  pending_review: { verify: 'verified', reject: 'in_progress' },
  verified: { award: 'awarded' },
};

const RANK_TRANSITIONS: Record<string, Record<string, string>> = {
  in_progress: { auto_check: 'eligible' },
  eligible: { propose: 'proposed' },
  proposed: { council_review: 'council_review' },
  council_review: { approve: 'approved', reject: 'proposed' },
  approved: { schedule_ceremony: 'ceremony_scheduled' },
  ceremony_scheduled: { complete: 'completed' },
};

@Injectable()
export class RankProgressionService {
  transitionSkill(current: string, action: string): string {
    const next = SKILL_TRANSITIONS[current]?.[action];
    if (!next) throw new BadRequestException(`Skill action '${action}' not allowed from '${current}'`);
    return next;
  }

  transitionRank(current: string, action: string): string {
    const next = RANK_TRANSITIONS[current]?.[action];
    if (!next) throw new BadRequestException(`Rank action '${action}' not allowed from '${current}'`);
    return next;
  }

  getAllowedSkillActions(status: string): string[] {
    return Object.keys(SKILL_TRANSITIONS[status] || {});
  }

  getAllowedRankActions(status: string): string[] {
    return Object.keys(RANK_TRANSITIONS[status] || {});
  }
}
