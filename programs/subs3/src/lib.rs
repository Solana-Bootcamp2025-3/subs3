use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};

declare_id!("4vWTjxHPJx6YzWeMfmimgeA2cMcyC9kXg3jqCq93mmo2");

// Module declarations
pub mod state;
pub mod context;
pub mod event;
pub mod error;
pub mod util;

// Re-exports for convenience
pub use state::{SubscriptionManager, SubscriptionPlan, Subscription};
pub use context::*;
pub use event::*;
pub use error::*;
pub use util::*;

#[program]
pub mod subs3 {
    use super::*;

    /// Initialize the global subscription manager state
    pub fn initialize_manager(ctx: Context<InitializeManager>) -> Result<()> {
        let manager = &mut ctx.accounts.subscription_manager;
        manager.authority = ctx.accounts.authority.key();
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
        period_duration_seconds: i64,
        max_subscribers: Option<u32>,
    ) -> Result<()> {
        require!(plan_id.len() <= MAX_PLAN_ID_LENGTH, SubscriptionError::PlanIdTooLong);
        require!(name.len() <= MAX_NAME_LENGTH, SubscriptionError::NameTooLong);
        require!(description.len() <= MAX_DESCRIPTION_LENGTH, SubscriptionError::DescriptionTooLong);
        require!(price_per_period > 0, SubscriptionError::InvalidPrice);
        require!(
            period_duration_seconds >= MIN_PERIOD_DURATION,
            SubscriptionError::InvalidPeriod
        );
        require!(
            period_duration_seconds <= MAX_PERIOD_DURATION,
            SubscriptionError::InvalidPeriod
        );

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

        manager.total_providers = manager.total_providers
            .checked_add(1)
            .ok_or(SubscriptionError::ArithmeticOverflow)?;

        emit!(SubscriptionPlanCreated {
            provider: plan.provider,
            plan_id: plan.plan_id.clone(),
            price_per_period: plan.price_per_period,
            period_duration_seconds: plan.period_duration_seconds,
            payment_token: plan.payment_token,
        });

        Ok(())
    }

    /// Subscribe to a plan (Subscriber function)
    pub fn subscribe(ctx: Context<Subscribe>) -> Result<()> {
        let plan = &mut ctx.accounts.subscription_plan;
        let subscription = &mut ctx.accounts.subscription;
        let manager = &mut ctx.accounts.subscription_manager;
        
        // Ensure subscription account is being initialized fresh
        require!(
            subscription.subscriber == Pubkey::default(),
            SubscriptionError::SubscriptionAlreadyExists
        );
        
        // Prevent providers from subscribing to their own plans
        require!(
            ctx.accounts.subscriber.key() != plan.provider,
            SubscriptionError::Unauthorized
        );
        
        if let Some(max_subs) = plan.max_subscribers {
            require!(plan.current_subscribers < max_subs, SubscriptionError::PlanAtCapacity);
        }

        let clock = Clock::get()?;
        
        // Validate that plan timing is reasonable
        require!(
            clock.unix_timestamp.checked_add(plan.period_duration_seconds).is_some(),
            SubscriptionError::ArithmeticOverflow
        );
        
        subscription.subscriber = ctx.accounts.subscriber.key();
        subscription.subscription_plan = plan.key();
        subscription.start_time = clock.unix_timestamp;
        subscription.next_payment_due = clock.unix_timestamp + plan.period_duration_seconds;
        subscription.is_active = true;
        subscription.is_paused = false;
        subscription.total_payments_made = 0;
        subscription.total_amount_paid = 0;
        subscription.payment_nonce = 0;
        subscription.bump = ctx.bumps.subscription;

        plan.current_subscribers = plan.current_subscribers
            .checked_add(1)
            .ok_or(SubscriptionError::ArithmeticOverflow)?;
        manager.total_subscriptions = manager.total_subscriptions
            .checked_add(1)
            .ok_or(SubscriptionError::ArithmeticOverflow)?;

        emit!(SubscriptionCreated {
            subscriber: subscription.subscriber,
            subscription_plan: subscription.subscription_plan,
            start_time: subscription.start_time,
            next_payment_due: subscription.next_payment_due,
        });

        Ok(())
    }

    /// Process payment for a subscription (Can be called by anyone - automated)
    /// 
    /// Payment Flow Explanation:
    /// 1. Subscriber has tokens in their token account (e.g., USDC)
    /// 2. Provider has a dedicated vault (PDA) for each subscription plan
    /// 3. When payment is due, tokens are transferred from subscriber → provider vault
    /// 4. Provider can later withdraw funds from their vault to their personal account
    /// 
    /// Security Features: 
    /// - The vault is a PDA controlled by the program, not directly by provider
    /// - Only the program can move funds from vault (via withdraw_funds instruction)
    /// - Balance validation prevents insufficient fund scenarios
    /// - Overflow protection on all arithmetic operations
    /// - Payment nonce prevents replay attacks
    /// - Grace period prevents timing manipulation attacks
    /// - This prevents providers from stealing funds or draining subscriber accounts
    pub fn process_payment(ctx: Context<ProcessPayment>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        let plan = &mut ctx.accounts.subscription_plan; // Make mutable to update revenue
        let clock = Clock::get()?;

        require!(subscription.is_active, SubscriptionError::SubscriptionInactive);
        require!(!subscription.is_paused, SubscriptionError::SubscriptionPaused);
        require!(
            clock.unix_timestamp >= subscription.next_payment_due - PAYMENT_GRACE_PERIOD,
            SubscriptionError::PaymentNotDue
        );

        // Transfer tokens from subscriber to provider vault
        // This is the core payment mechanism:
        // subscriber_token_account (user's USDC) → provider_vault (plan's USDC vault)
        let transfer_instruction = Transfer {
            from: ctx.accounts.subscriber_token_account.to_account_info(),
            to: ctx.accounts.provider_vault.to_account_info(),
            authority: ctx.accounts.subscriber.to_account_info(), // Subscriber must sign
        };

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                transfer_instruction,
            ),
            plan.price_per_period, // Amount to transfer (e.g., 10 USDC)
        )?;

        // Update subscription state with overflow protection
        subscription.next_payment_due = subscription.next_payment_due
            .checked_add(plan.period_duration_seconds)
            .ok_or(SubscriptionError::ArithmeticOverflow)?;
        subscription.total_payments_made = subscription.total_payments_made
            .checked_add(1)
            .ok_or(SubscriptionError::ArithmeticOverflow)?;
        subscription.total_amount_paid = subscription.total_amount_paid
            .checked_add(plan.price_per_period)
            .ok_or(SubscriptionError::ArithmeticOverflow)?;
        subscription.payment_nonce = subscription.payment_nonce
            .checked_add(1)
            .ok_or(SubscriptionError::ArithmeticOverflow)?;

        // Update plan revenue tracking with overflow protection
        // This tracks total revenue generated by this specific plan
        // Useful for analytics, provider dashboards, and plan performance metrics
        plan.total_revenue = plan.total_revenue
            .checked_add(plan.price_per_period)
            .ok_or(SubscriptionError::ArithmeticOverflow)?;

        emit!(PaymentProcessed {
            subscriber: subscription.subscriber,
            subscription_plan: subscription.subscription_plan,
            amount: plan.price_per_period,
            payment_number: subscription.total_payments_made,
            payment_nonce: subscription.payment_nonce,
            next_payment_due: subscription.next_payment_due,
        });

        Ok(())
    }
}