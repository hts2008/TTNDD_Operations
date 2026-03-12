/**
 * Reward Redemption State Machine
 *
 * STORY-009 / T-0901 — RewardRedemption.status
 * Module: M9 Reward Engine
 *
 * DB: reward_redemptions.status (varchar 50, default 'pending')
 */
import { StateMachineDef } from './types';

export const RedemptionStatus = [
  'pending',
  'approved',
  'fulfilled',
  'rejected',
  'cancelled',
] as const;
export type RedemptionStatus = (typeof RedemptionStatus)[number];

export const rewardRedemptionLifecycle: StateMachineDef<RedemptionStatus> = {
  id: 'reward_redemption',
  name: 'Reward Redemption Lifecycle',
  module: 'M9-Rewards',
  prismaModel: 'RewardRedemption',
  dbColumn: 'status',
  dbTable: 'reward_redemptions',
  openApiEnum: 'RedemptionStatus',
  states: RedemptionStatus,
  initialState: 'pending',
  terminalStates: ['fulfilled', 'rejected', 'cancelled'],
  transitions: [
    {
      from: 'pending',
      to: 'approved',
      guard: 'admin_reviews_and_approves',
      actors: ['admin', 'truong'],
      event: 'reward.approved',
      auditAction: 'REWARD_APPROVE',
    },
    {
      from: 'approved',
      to: 'fulfilled',
      guard: 'item_delivered_to_member',
      actors: ['admin', 'truong'],
      event: 'reward.fulfilled',
      auditAction: 'REWARD_FULFILL',
      sideEffects: ['deduct_exp_balance'],
    },
    {
      from: 'pending',
      to: 'rejected',
      guard: 'rejection_reason_provided',
      actors: ['admin', 'truong'],
      event: 'reward.rejected',
      auditAction: 'REWARD_REJECT',
      sideEffects: ['refund_exp'],
    },
    {
      from: 'pending',
      to: 'cancelled',
      actors: ['member'],
      event: 'reward.cancelled',
      auditAction: 'REWARD_CANCEL',
      sideEffects: ['refund_exp'],
    },
    {
      from: 'approved',
      to: 'cancelled',
      guard: 'admin_or_member_cancels',
      actors: ['admin', 'member'],
      event: 'reward.cancelled',
      auditAction: 'REWARD_CANCEL',
      sideEffects: ['refund_exp'],
    },
  ],
};
