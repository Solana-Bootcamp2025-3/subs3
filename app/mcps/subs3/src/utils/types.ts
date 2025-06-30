import { PublicKey, Connection } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export interface SolanaConfig {
  rpcUrl: string;
  programId: string;
  privateKey?: string;
}

export interface SubscriptionPlanData {
  provider: PublicKey;
  planId: string;
  name: string;
  description: string;
  pricePerPeriod: BN;
  periodDurationSeconds: BN;
  paymentToken: PublicKey;
  maxSubscribers: number | null;
  currentSubscribers: number;
  totalRevenue: BN;
  isActive: boolean;
  createdAt: BN;
  bump: number;
}

export interface SubscriptionManagerData {
  authority: PublicKey;
  totalProviders: BN;
  totalSubscriptions: BN;
  bump: number;
}

export interface CreateSubscriptionPlanParams {
  planId: string;
  name: string;
  description: string;
  pricePerPeriod: number;
  periodDurationSeconds: number;
  paymentTokenMint: string;
  maxSubscribers?: number;
}

export interface SubscriptionPlanInfo {
  address: string;
  data: SubscriptionPlanData;
}

export interface SubscriptionData {
  subscriber: PublicKey;
  subscriptionPlan: PublicKey;
  startTime: BN;
  nextPaymentDue: BN;
  isActive: boolean;
  isPaused: boolean;
  pausedAt: BN | null;
  cancelledAt: BN | null;
  totalPaymentsMade: number;
  totalAmountPaid: BN;
  paymentNonce: BN;
  bump: number;
}

export interface SubscriptionInfo {
  address: string;
  data: SubscriptionData;
}
