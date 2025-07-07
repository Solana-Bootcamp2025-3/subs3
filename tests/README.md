# Testing Strategy for Subs3 Solana Program

This document outlines the testing approach for the Subs3 subscription management Solana program.

## Testing Approaches

### 1. Direct Program Testing (Primary)

**Location**: `tests/subs3.ts`

**Approach**: Tests call program instructions directly using `program.methods.*`

**Benefits**:
- Tests the actual program logic without abstraction layers
- Faster feedback on core functionality
- Better for testing edge cases and error conditions
- Follows standard Anchor testing patterns
- More granular control over test accounts and PDAs

**Example**:
```typescript
const tx = await program.methods
  .createSubscriptionPlan(planId, name, description, price, duration, maxSubs)
  .accountsStrict({
    provider: provider1.publicKey,
    subscriptionManager: subscriptionManagerPda,
    // ... other accounts
  })
  .signers([provider1])
  .rpc();
```

### 2. Client Integration Testing (Secondary)

**Location**: `tests/subs3.ts` - "Client Integration Testing" section

**Approach**: Tests use the `SolanaSubscriptionClient` abstraction layer

**Benefits**:
- Validates that the client layer works correctly with the program
- Tests the MCP server integration
- Ensures the client abstractions are correct
- Tests the user-facing API

**Example**:
```typescript
const result = await subscriptionClient.createSubscriptionPlan({
  planId: "test-plan",
  name: "Test Plan",
  description: "A test plan",
  pricePerPeriod: 1000000,
  periodDurationSeconds: 86400,
  paymentTokenMint: tokenMint.toBase58()
});
```

## Test Utilities

### Helper Functions (`tests/test-helpers.ts`)

- **`createTestAccounts()`**: Creates and funds test keypairs, creates token mint and accounts
- **`derivePdas()`**: Derives all necessary PDAs for testing
- **`createTestPlan()`**: Helper to create subscription plans with default parameters
- **`createTestSubscription()`**: Helper to create subscriptions

### Test Structure

```
tests/
├── subs3.ts          # Main comprehensive test suite
├── smoke.ts          # Basic smoke tests for CI/quick validation
└── test-helpers.ts   # Shared utility functions
```

## Running Tests

### Prerequisites

1. Start local Solana validator:
```bash
solana-test-validator
```

2. Build the program:
```bash
anchor build
```

### Run Tests

```bash
# Run all tests
anchor test

# Run specific test file
yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/smoke.ts

# Run with specific timeout
yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/subs3.ts
```

## Test Categories

### 1. Core Functionality Tests
- Manager initialization
- Subscription plan creation
- User subscription
- Payment processing

### 2. Error Handling Tests
- Invalid parameters
- Unauthorized operations
- Non-existent accounts
- Business logic violations

### 3. Integration Tests
- Client library functionality
- MCP server tools
- End-to-end workflows

### 4. Edge Case Tests
- Boundary conditions
- Overflow protection
- Race conditions
- State consistency

## Best Practices

1. **Use helpers to reduce duplication**: Leverage `test-helpers.ts` functions
2. **Test both success and failure cases**: Include negative test cases
3. **Use meaningful test data**: Use realistic subscription plans and prices
4. **Clean test state**: Each test should be independent
5. **Verify all state changes**: Check both account states and program state

## Account Management

Tests create fresh accounts for each run:
- Provider keypairs (subscription plan creators)
- Subscriber keypairs (users who subscribe)
- Token mint (simulates USDC)
- Token accounts for payments
- PDAs for program state

## Environment Setup

Tests assume:
- Local Solana validator running on localhost:8899
- Program deployed to local cluster
- Test keypairs are generated and funded automatically
- Token mint is created for each test run

This approach ensures comprehensive testing while maintaining separation between low-level program testing and high-level integration testing.
