use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct SubscriptionManager {
    pub authority: Pubkey,
    pub total_providers: u64,
    pub total_subscriptions: u64,
    pub bump: u8,
}
