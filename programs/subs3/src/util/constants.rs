// Constants for the subscription program
pub const MAX_PLAN_ID_LENGTH: usize = 32;
pub const MAX_NAME_LENGTH: usize = 64;
pub const MAX_DESCRIPTION_LENGTH: usize = 256;

// Minimum period duration (1 hour in seconds)
pub const MIN_PERIOD_DURATION: i64 = 3600;

// Maximum period duration (1 year in seconds)
pub const MAX_PERIOD_DURATION: i64 = 31_536_000;

// Subscription manager seed
pub const SUBSCRIPTION_MANAGER_SEED: &[u8] = b"subscription_manager";

// Subscription plan seed
pub const SUBSCRIPTION_PLAN_SEED: &[u8] = b"subscription_plan";

// Subscription seed
pub const SUBSCRIPTION_SEED: &[u8] = b"subscription";

// Provider vault seed
pub const PROVIDER_VAULT_SEED: &[u8] = b"provider_vault";

// Payment grace period (5 minutes in seconds) - allows for small timing discrepancies
pub const PAYMENT_GRACE_PERIOD: i64 = 300;
