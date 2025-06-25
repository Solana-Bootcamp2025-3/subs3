use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("4vWTjxHPJx6YzWeMfmimgeA2cMcyC9kXg3jqCq93mmo2");

#[program]
pub mod subs3 {
    use super::*;

    /// Initialize the global subscription manager state
    pub fn initialize_manager(ctx: Context<InitializeManager>) -> Result<()> {
        // TODO
        Ok(())
    }
}

// Context Accounts
#[derive(Accounts)]
pub struct InitializeManager<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SubscriptionManager::INIT_SPACE,
        seeds = [b"subscription_manager"],
        bump
    )]
    pub subscription_manager: Account<'info, SubscriptionManager>,
    
    #[account(mut)]
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
        seeds = [b"subscription_plan", provider.key().as_ref(), plan_id.as_bytes()],
        bump
    )]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    
    #[account(
        mut,
        seeds = [b"subscription_manager"],
        bump = subscription_manager.bump
    )]
    pub subscription_manager: Account<'info, SubscriptionManager>,
    
    #[account(
        init,
        payer = provider,
        token::mint = payment_token_mint,
        token::authority = provider_vault,
        seeds = [b"provider_vault", provider.key().as_ref(), plan_id.as_bytes()],
        bump
    )]
    pub provider_vault: Account<'info, TokenAccount>,
    
    /// CHECK: This is the mint for the payment token (e.g., USDC)
    pub payment_token_mint: AccountInfo<'info>,
    
    #[account(mut)]
    pub provider: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Subscribe<'info> {
    #[account(
        init,
        payer = subscriber,
        space = 8 + Subscription::INIT_SPACE,
        seeds = [b"subscription", subscriber.key().as_ref(), subscription_plan.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,
    
    #[account(mut)]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    
    #[account(
        mut,
        seeds = [b"subscription_manager"],
        bump = subscription_manager.bump
    )]
    pub subscription_manager: Account<'info, SubscriptionManager>,
    
    #[account(mut)]
    pub subscriber: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(
        mut,
        has_one = subscriber,
        has_one = subscription_plan,
        seeds = [b"subscription", subscriber.key().as_ref(), subscription_plan.key().as_ref()],
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
            b"provider_vault",
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
pub struct CancelSubscription<'info> {
    #[account(
        mut,
        has_one = subscriber,
        has_one = subscription_plan,
        seeds = [b"subscription", subscriber.key().as_ref(), subscription_plan.key().as_ref()],
        bump = subscription.bump
    )]
    pub subscription: Account<'info, Subscription>,
    
    #[account(mut)]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    
    #[account(
        mut,
        seeds = [b"subscription_manager"],
        bump = subscription_manager.bump
    )]
    pub subscription_manager: Account<'info, SubscriptionManager>,
    
    pub subscriber: Signer<'info>,
}

#[derive(Accounts)]
pub struct PauseSubscription<'info> {
    #[account(
        mut,
        has_one = subscriber,
        has_one = subscription_plan,
        seeds = [b"subscription", subscriber.key().as_ref(), subscription_plan.key().as_ref()],
        bump = subscription.bump
    )]
    pub subscription: Account<'info, Subscription>,
    
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    pub subscriber: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResumeSubscription<'info> {
    #[account(
        mut,
        has_one = subscriber,
        has_one = subscription_plan,
        seeds = [b"subscription", subscriber.key().as_ref(), subscription_plan.key().as_ref()],
        bump = subscription.bump
    )]
    pub subscription: Account<'info, Subscription>,
    
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    pub subscriber: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(
        has_one = provider,
        seeds = [b"subscription_plan", provider.key().as_ref(), subscription_plan.plan_id.as_bytes()],
        bump = subscription_plan.bump
    )]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    
    #[account(
        mut,
        seeds = [
            b"provider_vault",
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

#[derive(Accounts)]
pub struct UpdateSubscriptionPlan<'info> {
    #[account(
        mut,
        has_one = provider,
        seeds = [b"subscription_plan", provider.key().as_ref(), subscription_plan.plan_id.as_bytes()],
        bump = subscription_plan.bump
    )]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    
    pub provider: Signer<'info>,
}

// Data Accounts
#[account]
#[derive(InitSpace)]
pub struct SubscriptionManager {
    pub authority: Pubkey,
    pub total_providers: u64,
    pub total_subscriptions: u64,
    pub bump: u8,
}

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
    pub bump: u8,
}