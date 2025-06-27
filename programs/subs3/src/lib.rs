use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("4vWTjxHPJx6YzWeMfmimgeA2cMcyC9kXg3jqCq93mmo2");

#[program]
pub mod subs3 {
    use super::*;

    /// Initialize the global subscription manager state
    pub fn initialize_manager(ctx: Context<InitializeManager>) -> Result<()> {
        let manager = &mut ctx.accounts.subscription_manager;
        manager.total_providers = 0;
        manager.total_subscriptions = 0;
        manager.bump = ctx.bumps.subscription_manager;
        
        msg!("Subscription manager initialized with authority: {}", manager.authority);
        Ok(())
    }

    /// Create a subscription plan (Provider function)
    pub fn create_subscription_plan(
        ctx: Context<CreateSubscriptionPlan>,
        plan_id: String,
        name: String,
        description: String,
        price_per_period: u64,
        period_duration_seconds: u64,
        max_subscribers: Option<u32>,
    ) -> Result<()> {
        require!(plan_id.len() <= 32, ErrorCode::PlanIdTooLong);
        require!(name.len() <= 64, ErrorCode::NameTooLong);
        require!(description.len() <= 256, ErrorCode::DescriptionTooLong);
        require!(price_per_period > 0, ErrorCode::InvalidPrice);
        require!(period_duration_seconds > 0, ErrorCode::InvalidPeriod);

        let plan = &mut ctx.accounts.subscription_plan;
        let manager = &mut ctx.accounts.subscription_manager;
        
        plan.provider = ctx.accounts.provider.key();
        plan.plan_id = plan_id;
        plan.name = name;
        plan.description = description;
        plan.price_per_period = price_per_period;
        plan.period_duration_seconds = period_duration_seconds;
        plan.payment_token = ctx.accounts.payment_token_mint.key();
        plan.max_subscribers = max_subscribers;
        plan.current_subscribers = 0;
        plan.total_revenue = 0;
        plan.is_active = true;
        plan.created_at = Clock::get()?.unix_timestamp;
        plan.bump = ctx.bumps.subscription_plan;

        manager.total_providers += 1;

        emit!(SubscriptionPlanCreated {
            provider: plan.provider,
            plan_id: plan.plan_id.clone(),
            price_per_period: plan.price_per_period,
            period_duration_seconds: plan.period_duration_seconds,
            payment_token: plan.payment_token,
        });

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

// Events
#[event]
pub struct SubscriptionPlanCreated {
    pub provider: Pubkey,
    pub plan_id: String,
    pub price_per_period: u64,
    pub period_duration_seconds: u64,
    pub payment_token: Pubkey,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Plan ID is too long")]
    PlanIdTooLong,
    #[msg("Name is too long")]
    NameTooLong,
    #[msg("Description is too long")]
    DescriptionTooLong,
    #[msg("Invalid price - must be greater than 0")]
    InvalidPrice,
    #[msg("Invalid period - must be greater than 0")]
    InvalidPeriod
}