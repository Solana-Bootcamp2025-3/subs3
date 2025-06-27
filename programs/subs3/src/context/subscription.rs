use anchor_lang::prelude::*;
use crate::state::*;
use crate::util::constants::*;

#[derive(Accounts)]
pub struct Subscribe<'info> {
    #[account(
        init,
        payer = subscriber,
        space = 8 + Subscription::INIT_SPACE,
        seeds = [SUBSCRIPTION_SEED, subscriber.key().as_ref(), subscription_plan.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,
    
    #[account(mut)]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    
    #[account(
        mut,
        seeds = [SUBSCRIPTION_MANAGER_SEED],
        bump = subscription_manager.bump
    )]
    pub subscription_manager: Account<'info, SubscriptionManager>,
    
    #[account(mut)]
    pub subscriber: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
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
        seeds = [SUBSCRIPTION_MANAGER_SEED],
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
        seeds = [SUBSCRIPTION_SEED, subscriber.key().as_ref(), subscription_plan.key().as_ref()],
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
        seeds = [SUBSCRIPTION_SEED, subscriber.key().as_ref(), subscription_plan.key().as_ref()],
        bump = subscription.bump
    )]
    pub subscription: Account<'info, Subscription>,
    
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    pub subscriber: Signer<'info>,
}
