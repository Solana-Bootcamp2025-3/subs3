import { PublicKey } from "@solana/web3.js";

/**
 * Generate subscription manager PDA
 */
export function getSubscriptionManagerPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("subscription_manager")],
    programId
  );
}

/**
 * Generate subscription plan PDA
 */
export function getSubscriptionPlanPda(
  provider: PublicKey,
  planId: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("subscription_plan"), provider.toBuffer(), Buffer.from(planId)],
    programId
  );
}

/**
 * Generate provider vault PDA
 */
export function getProviderVaultPda(
  provider: PublicKey,
  planId: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("provider_vault"), provider.toBuffer(), Buffer.from(planId)],
    programId
  );
}

/**
 * Validate Solana public key
 */
export function validatePublicKey(key: string): boolean {
  try {
    new PublicKey(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert string to PublicKey with validation
 */
export function toPublicKey(key: string): PublicKey {
  if (!validatePublicKey(key)) {
    throw new Error(`Invalid public key: ${key}`);
  }
  return new PublicKey(key);
}

/**
 * Format period duration to human-readable format
 */
export function formatPeriodDuration(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

/**
 * Format timestamp to human-readable date
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Common period durations in seconds
 */
export const PERIOD_DURATIONS = {
  MINUTE: 60,
  HOUR: 60 * 60,
  DAILY: 24 * 60 * 60,
  WEEKLY: 7 * 24 * 60 * 60,
  MONTHLY: 30 * 24 * 60 * 60,
  YEARLY: 365 * 24 * 60 * 60,
} as const;

/**
 * Validate period duration
 */
export function validatePeriodDuration(seconds: number): boolean {
  const MIN_PERIOD = 60; // 1 minute
  const MAX_PERIOD = 365 * 24 * 60 * 60; // 1 year
  return seconds >= MIN_PERIOD && seconds <= MAX_PERIOD;
}

/**
 * Validate plan ID format
 */
export function validatePlanId(planId: string): boolean {
  return planId.length > 0 && planId.length <= 32;
}

/**
 * Validate price
 */
export function validatePrice(price: number): boolean {
  return price > 0 && Number.isInteger(price);
}
