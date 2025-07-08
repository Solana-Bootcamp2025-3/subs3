/**
 * Constants for Subs3 program testing
 * These should match the constants in the Anchor program
*/

// PDA Seeds
export const SUBSCRIPTION_MANAGER_SEED = "subscription_manager";
export const SUBSCRIPTION_PLAN_SEED = "subscription_plan";
export const SUBSCRIPTION_SEED = "subscription";
export const PROVIDER_VAULT_SEED = "provider_vault";

// Test constants
export const TEST_PLAN_ID = "test-plan";
export const SHORT_PERIOD_PLAN_ID = "short-period-plan";
export const LONG_PERIOD_PLAN_ID = "long-period-plan";
export const CLIENT_TEST_PLAN_ID = "client-test-plan";

// Token amounts (in lamports/smallest unit)
export const DEFAULT_PRICE_PER_PERIOD = 1000000; // 1 USDC
export const SHORT_PERIOD_PRICE = 500000; // 0.5 USDC
export const LONG_PERIOD_PRICE = 1000000; // 1 USDC
export const CLIENT_PLAN_PRICE = 2000000; // 2 USDC

// Time durations (in seconds)
export const THIRTY_DAYS_SECONDS = 2592000; // 30 days
export const ONE_DAY_SECONDS = 86400; // 1 day
export const ONE_SECOND = 1; // 1 second for testing
export const TEST_WAIT_TIME = 2000; // 2 seconds wait time

// Account limits
export const DEFAULT_MAX_SUBSCRIBERS = 100;
export const SHORT_PERIOD_MAX_SUBSCRIBERS = 10;
export const CLIENT_PLAN_MAX_SUBSCRIBERS = 50;

// Funding amounts
export const SOL_AIRDROP_AMOUNT = 2 * 1_000_000_000; // 2 SOL
export const TOKEN_MINT_AMOUNT = 1_000_000_000; // 1000 tokens

// Error messages
export const PAYMENT_NOT_DUE_ERROR = "PaymentNotDue";
export const UNAUTHORIZED_ERROR = "Unauthorized";
export const MAX_SEED_LENGTH_ERROR = "Max seed length exceeded";
export const PLAN_ID_TOO_LONG_ERROR = "PlanIdTooLong";
