# Subs3 - Solana Subscription Program

A Solana program built with Anchor that enables decentralized subscription management on the blockchain. Providers can create subscription plans, and the program handles subscription lifecycle management with SPL token payments.

## Overview

Subs3 allows service providers to create subscription-based offerings on Solana. The program manages subscription plans, handles payments in SPL tokens, and provides a foundation for building subscription-based dApps.

### Key Features

- **Subscription Plans**: Create and manage subscription offerings with flexible pricing and duration
- **SPL Token Payments**: Support for any SPL token as payment method
- **Provider Management**: Decentralized model where anyone can become a subscription provider
- **Flexible Billing**: Configurable billing periods from minutes to years
- **Subscriber Limits**: Optional maximum subscriber caps per plan
- **Revenue Tracking**: Built-in revenue tracking for providers

## Program Structure

### Core Components

- **SubscriptionManager**: Global state tracking all providers and subscriptions
- **SubscriptionPlan**: Individual subscription offerings created by providers
- **Subscription**: Active subscriber relationships (future feature)

### Instructions

1. **initialize_manager**: One-time setup of global subscription state
2. **create_subscription_plan**: Create a new subscription offering

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) 
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor](https://www.anchor-lang.com/docs/installation)
- [Node.js](https://nodejs.org/) (for testing)

### Installation

1. Clone and navigate to the project:
```bash
git clone <your-repo>
cd subs3
```

2. Install dependencies:
```bash
npm install
```

3. Build the program:
```bash
anchor build
```

4. Run tests:
```bash
anchor test
```

### Deployment

1. Configure your target cluster in `Anchor.toml`
2. Deploy the program:
```bash
anchor deploy
```

## Usage Example

### Initialize the Manager (One-time setup)

```typescript
await program.methods
  .initializeManager()
  .accounts({
    authority: provider.publicKey,
    subscriptionManager: managerPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Create a Subscription Plan

```typescript
await program.methods
  .createSubscriptionPlan(
    "monthly-basic",           // plan_id
    "Basic Monthly Plan",      // name
    "Access to basic features", // description
    new BN(1000000),          // price (1 USDC)
    new BN(2592000),          // 30 days in seconds
    1000                      // max 1000 subscribers
  )
  .accounts({
    provider: provider.publicKey,
    subscriptionManager: managerPda,
    subscriptionPlan: planPda,
    providerVault: vaultPda,
    paymentTokenMint: usdcMint,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Program Details

### Account Structure

#### SubscriptionPlan
- `provider`: The account that created this plan
- `plan_id`: Unique identifier (max 32 characters)
- `name`: Display name (max 100 characters) 
- `description`: Plan description (max 500 characters)
- `price_per_period`: Cost per billing cycle (in token smallest units)
- `period_duration_seconds`: Billing period length
- `payment_token`: SPL token mint for payments
- `max_subscribers`: Optional subscriber limit
- `current_subscribers`: Current active subscriber count
- `total_revenue`: Lifetime revenue generated
- `is_active`: Whether plan accepts new subscriptions
- `created_at`: Unix timestamp of creation

#### SubscriptionManager
- `authority`: Program authority account
- `total_providers`: Count of unique providers
- `total_subscriptions`: Count of all subscriptions
- `bump`: PDA bump seed

### Program Derived Addresses (PDAs)

- **Subscription Manager**: `["subscription_manager"]`
- **Subscription Plan**: `["subscription_plan", provider, plan_id]`
- **Provider Vault**: `["provider_vault", provider, plan_id]`

### Constants

- **Plan ID**: 1-32 characters
- **Name**: 1-100 characters
- **Description**: 1-500 characters
- **Min Period**: 60 seconds (1 minute)
- **Max Period**: 31,536,000 seconds (1 year)

## Error Codes

- `6000`: Plan ID too long
- `6001`: Name too long  
- `6002`: Description too long
- `6003`: Invalid price (must be > 0)
- `6004`: Invalid period duration

## Events

- `SubscriptionPlanCreated`: Emitted when a new plan is created
- `PaymentProcessed`: Emitted when subscription payment is made (future)
- `SubscriptionCreated`: Emitted when user subscribes (future)
- `SubscriptionCancelled`: Emitted when subscription ends (future)

## Development

### Project Structure

```
programs/subs3/src/
├── lib.rs                 # Main program entry point
├── context/              # Instruction contexts
├── error/                # Error definitions
├── event/                # Event definitions
├── state/                # Account state structures
└── util/                 # Helper functions and constants
```

### Generated Files

After building, Anchor generates:
- `target/idl/subs3.json`: Program interface definition
- `target/types/subs3.ts`: TypeScript type definitions

These files can be used to build clients in TypeScript/JavaScript.

## Integration

### TypeScript Client

See `app/mcps/subs3/` for a complete TypeScript client implementation that follows Anchor best practices.

### Using Generated Types

```typescript
import type { Subs3 } from "./target/types/subs3";
import idl from "./target/idl/subs3.json";

const program = new Program(idl as Subs3, provider);
```

## Security Considerations

- All price validations happen on-chain
- PDAs ensure deterministic addressing
- Provider authority required for plan creation
- Built-in bounds checking for all string fields
