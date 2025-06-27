use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]  
pub struct SubscriptionPlan {
    pub provider: Pubkey,
    #[max_len(32)]
    pub plan_id: String,
    #[max_len(64)]
    pub name: String,
    #[max_len(256)]
    pub description: String,
    pub price_per_period: u64,
    pub period_duration_seconds: u64,
    pub payment_token: Pubkey,
    pub max_subscribers: Option<u32>,
    pub current_subscribers: u32,
    pub total_revenue: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}
