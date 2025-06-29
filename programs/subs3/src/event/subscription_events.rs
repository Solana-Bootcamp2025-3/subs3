use anchor_lang::prelude::*;

#[event]
pub struct SubscriptionPlanCreated {
    pub provider: Pubkey,
    pub plan_id: String,
    pub price_per_period: u64,
    pub period_duration_seconds: i64,
    pub payment_token: Pubkey,
}

#[event]
pub struct SubscriptionCreated {
    pub subscriber: Pubkey,
    pub subscription_plan: Pubkey,
    pub start_time: i64,
    pub next_payment_due: i64
}

#[event]
pub struct PaymentProcessed {
    pub subscriber: Pubkey,
    pub subscription_plan: Pubkey,
    pub amount: u64,
    pub payment_number: u32,
    pub next_payment_due: i64,
}

#[event]
pub struct SubscriptionCancelled {
    pub subscriber: Pubkey,
    pub subscription_plan: Pubkey,
    pub cancelled_at: i64,
}
