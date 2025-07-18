use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::*;
use crate::error::*;
use crate::util::constants::*;

#[derive(Accounts)]
pub struct InitializeManager<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SubscriptionManager::INIT_SPACE,
        seeds = [SUBSCRIPTION_MANAGER_SEED],
        bump
    )]
    pub subscription_manager: Account<'info, SubscriptionManager>,
    
    #[account(
        mut,
        constraint = authority.key() != Pubkey::default() @ SubscriptionError::Unauthorized
    )]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(plan_id: String)]
pub struct CreateSubscriptionPlan<'info> {
    #[account(
        init,
        payer = provider,
        space = 8 + SubscriptionPlan::INIT_SPACE,
        seeds = [SUBSCRIPTION_PLAN_SEED, provider.key().as_ref(), plan_id.as_bytes()],
        bump
    )]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    
    #[account(
        mut,
        constraint = subscription_manager.authority != Pubkey::default() @ SubscriptionError::Unauthorized,
        seeds = [SUBSCRIPTION_MANAGER_SEED],
        bump = subscription_manager.bump
    )]
    pub subscription_manager: Account<'info, SubscriptionManager>,
    
    #[account(
        init,
        payer = provider,
        token::mint = payment_token_mint,
        token::authority = subscription_plan,
        seeds = [PROVIDER_VAULT_SEED, provider.key().as_ref(), plan_id.as_bytes()],
        bump
    )]
    pub provider_vault: Account<'info, TokenAccount>,
    
    /// CHECK: This is the mint for the payment token (e.g., USDC)
    /// Must be a valid SPL Token mint account
    #[account(
        constraint = payment_token_mint.owner == &anchor_spl::token::ID @ SubscriptionError::InvalidTokenMint
    )]
    pub payment_token_mint: AccountInfo<'info>,
    
    #[account(mut)]
    pub provider: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
