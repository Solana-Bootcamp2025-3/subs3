use anchor_lang::prelude::*;

#[error_code]
pub enum SubscriptionError {
    #[msg("Plan ID is too long")]
    PlanIdTooLong,
    #[msg("Name is too long")]
    NameTooLong,
    #[msg("Description is too long")]
    DescriptionTooLong,
    #[msg("Invalid price - must be greater than 0")]
    InvalidPrice,
    #[msg("Invalid period - must be greater than 0")]
    InvalidPeriod,
    #[msg("Subscription plan is inactive")]
    PlanInactive,
    #[msg("Plan has reached maximum subscriber capacity")]
    PlanAtCapacity,
    #[msg("Subscription is inactive")]
    SubscriptionInactive,
    #[msg("Subscription is paused")]
    SubscriptionPaused,
    #[msg("Payment is not due yet")]
    PaymentNotDue,
    #[msg("Insufficient funds for payment")]
    InsufficientFunds,
    #[msg("Arithmetic overflow detected")]
    ArithmeticOverflow,
}
