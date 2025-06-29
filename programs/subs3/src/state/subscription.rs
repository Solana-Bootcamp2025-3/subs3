use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Subscription {
    pub subscriber: Pubkey,
    pub subscription_plan: Pubkey,
    pub start_time: i64,
    pub next_payment_due: i64,
    pub is_active: bool,
    pub is_paused: bool,
    pub paused_at: Option<i64>,
    pub cancelled_at: Option<i64>,
    pub total_payments_made: u32,
    pub total_amount_paid: u64,
    pub payment_nonce: u64,
    pub bump: u8,
}
