# Solana Subscription Client - Transaction Modes

The `SolanaSubscriptionClient` now supports two modes of operation:

## 1. Unsigned Transaction Mode (Recommended)

This mode builds transactions without signing them, giving you full control over the signing process. This is ideal for:
- Frontend applications using wallet adapters
- Multi-signature setups
- Custom signing flows
- Testing and simulation

### Usage

```typescript
import { SolanaSubscriptionClient } from "./subscription-client";

// Initialize without private key
const client = new SolanaSubscriptionClient({
  rpcUrl: "https://api.devnet.solana.com",
  programId: "YourProgramIdHere"
  // No privateKey provided
});

// Build unsigned transactions
const authority = new PublicKey("AuthorityPublicKeyHere");
const transaction = await client.buildInitializeManagerTransaction(authority);

// Prepare transaction with blockhash and fee payer
const preparedTx = await client.prepareTransaction(transaction, authority);

// Sign with your preferred method
// preparedTx.sign(keypair);
// or await wallet.signTransaction(preparedTx);

// Send transaction
const signature = await connection.sendRawTransaction(preparedTx.serialize());
```

## 2. Direct Signing Mode (Legacy)

This mode signs and sends transactions directly using a provided private key.

### Usage

```typescript
const client = new SolanaSubscriptionClient({
  rpcUrl: "https://api.devnet.solana.com",
  programId: "YourProgramIdHere",
  privateKey: "base64EncodedPrivateKeyHere"
});

// These methods sign and send automatically
const result = await client.initializeManager();
console.log("Transaction signature:", result.signature);
```

## Available Methods

### Transaction Builders (Return unsigned transactions)
- `buildInitializeManagerTransaction(authority: PublicKey)`
- `buildCreateSubscriptionPlanTransaction(params, provider: PublicKey)`
- `buildSubscribeTransaction(planAddress: string, subscriber: PublicKey)`
- `buildProcessPaymentTransaction(subscriptionAddress: string, subscriberTokenAccount: string, subscriber: PublicKey)`

### Direct Methods (Sign and send)
- `initializeManager(authority?: PublicKey)`
- `createSubscriptionPlan(params, provider?: PublicKey)`
- `subscribe(planAddress: string, subscriber?: PublicKey)`
- `processPayment(subscriptionAddress: string, subscriberTokenAccount: string, subscriber?: PublicKey)`

### Utility Methods
- `prepareTransaction(transaction: Transaction, feePayer: PublicKey)` - Sets blockhash and fee payer
- `sendTransaction(transaction: Transaction)` - Signs and sends a transaction (requires wallet)
- `getRecentBlockhash()` - Gets current blockhash info

### Read-Only Methods (Work in both modes)
- `getSubscriptionManager()`
- `getSubscriptionPlan(planAddress: string)`
- `getProviderPlans(providerAddress?: string)`
- `getSubscription(subscriptionAddress: string)`
- `getSubscriberSubscriptions(subscriberAddress?: string)`
- `isManagerInitialized()`
- `getSubscriptionPlanAddress(provider: string, planId: string)`
- `getSubscriptionAddress(subscriber: string, planAddress: string)`
- `getWalletAddress()` (only works with wallet configured)

## Migration Guide

### From Direct Mode to Unsigned Mode

**Before:**
```typescript
const client = new SolanaSubscriptionClient({
  rpcUrl: "...",
  programId: "...",
  privateKey: "..." // Required
});

const result = await client.initializeManager();
```

**After:**
```typescript
const client = new SolanaSubscriptionClient({
  rpcUrl: "...",
  programId: "..." // No privateKey needed
});

const tx = await client.buildInitializeManagerTransaction(authority);
const preparedTx = await client.prepareTransaction(tx, authority);
// Handle signing externally
```

## Integration Examples

### With Phantom Wallet
```typescript
const tx = await client.buildSubscribeTransaction(planAddress, wallet.publicKey);
const preparedTx = await client.prepareTransaction(tx, wallet.publicKey);
const signedTx = await wallet.signTransaction(preparedTx);
const signature = await connection.sendRawTransaction(signedTx.serialize());
```

### With Solflare Wallet
```typescript
const tx = await client.buildCreateSubscriptionPlanTransaction(params, wallet.publicKey);
const preparedTx = await client.prepareTransaction(tx, wallet.publicKey);
const signedTx = await wallet.signTransaction(preparedTx);
const signature = await connection.sendRawTransaction(signedTx.serialize());
```

### Batch Transactions
```typescript
const tx1 = await client.buildInitializeManagerTransaction(authority);
const tx2 = await client.buildCreateSubscriptionPlanTransaction(params, provider);

const preparedTx1 = await client.prepareTransaction(tx1, authority);
const preparedTx2 = await client.prepareTransaction(tx2, provider);

// Sign all transactions
const signedTxs = await wallet.signAllTransactions([preparedTx1, preparedTx2]);

// Send all transactions
const signatures = await Promise.all(
  signedTxs.map(tx => connection.sendRawTransaction(tx.serialize()))
);
```

## Error Handling

The client throws descriptive errors for common issues:
- "Wallet is required for signing transactions" - when using direct methods without a wallet
- "Provider address is required when no wallet is configured" - when calling methods that need a default address
- "No wallet configured" - when calling `getWalletAddress()` without a wallet

## Benefits of Unsigned Transaction Mode

1. **Security**: Private keys never leave the user's wallet
2. **Flexibility**: Works with any wallet adapter or signing method
3. **Testing**: Easier to test transaction building without signing
4. **Multi-sig**: Compatible with multi-signature setups
5. **Simulation**: Can simulate transactions before signing
6. **Batching**: Easier to batch multiple transactions for signing
