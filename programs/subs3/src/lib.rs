use anchor_lang::prelude::*;

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

    /// Subscribe to a plan (Subscriber function)
    pub fn subscribe(ctx: Context<Subscribe>) -> Result<()> {
        let plan = &mut ctx.accounts.subscription_plan;
        let subscription = &mut ctx.accounts.subscription;
        let manager = &mut ctx.accounts.subscription_manager;
        
        require!(plan.is_active, SubscriptionError::PlanInactive);
        
        if let Some(max_subs) = plan.max_subscribers {
            require!(plan.current_subscribers < max_subs, SubscriptionError::PlanAtCapacity);
        }

        let clock = Clock::get()?;
        
        subscription.subscriber = ctx.accounts.subscriber.key();
        subscription.subscription_plan = plan.key();
        subscription.start_time = clock.unix_timestamp;
        subscription.next_payment_due = clock.unix_timestamp + plan.period_duration_seconds;
        subscription.is_active = true;
        subscription.is_paused = false;
        subscription.total_payments_made = 0;
        subscription.total_amount_paid = 0;
        subscription.bump = ctx.bumps.subscription;

        plan.current_subscribers += 1;
        manager.total_subscriptions += 1;

        emit!(SubscriptionCreated {
            subscriber: subscription.subscriber,
            subscription_plan: subscription.subscription_plan,
            start_time: subscription.start_time,
            next_payment_due: subscription.next_payment_due,
        });

        Ok(())
    }
}