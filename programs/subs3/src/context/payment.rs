use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::*;
use crate::util::constants::*;

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(
        mut,
        has_one = subscriber,
        has_one = subscription_plan,
        seeds = [SUBSCRIPTION_SEED, subscriber.key().as_ref(), subscription_plan.key().as_ref()],
        bump = subscription.bump
    )]
    pub subscription: Account<'info, Subscription>,
    
    #[account(mut)]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    
    #[account(
        mut,
        constraint = subscriber_token_account.owner == subscriber.key(),
        constraint = subscriber_token_account.mint == subscription_plan.payment_token
    )]
    pub subscriber_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [
            PROVIDER_VAULT_SEED,
            subscription_plan.provider.as_ref(),
            subscription_plan.plan_id.as_bytes()
        ],
        bump
    )]
    pub provider_vault: Account<'info, TokenAccount>,
    
    pub subscriber: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(
        has_one = provider,
        seeds = [SUBSCRIPTION_PLAN_SEED, provider.key().as_ref(), subscription_plan.plan_id.as_bytes()],
        bump = subscription_plan.bump
    )]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    
    #[account(
        mut,
        seeds = [
            PROVIDER_VAULT_SEED,
            provider.key().as_ref(),
            subscription_plan.plan_id.as_bytes()
        ],
        bump
    )]
    pub provider_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub provider_token_account: Account<'info, TokenAccount>,
    
    pub provider: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
