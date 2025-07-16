import { PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { SolanaSubscriptionClient } from "./subscription-client";

// Example usage of the unsigned transaction methods

async function exampleUsage() {
  // Initialize client without private key for read-only operations
  const client = new SolanaSubscriptionClient({
    rpcUrl: "https://api.devnet.solana.com",
    programId: "YourProgramIdHere"
    // No privateKey - client can only build transactions, not sign them
  });

  // Example 1: Build initialize manager transaction
  const authority = new PublicKey("AuthorityPublicKeyHere");
  const initManagerTx = await client.buildInitializeManagerTransaction(authority);
  
  // Set transaction parameters
  const preparedTx = await client.prepareTransaction(initManagerTx, authority);
  
  // At this point, you can sign the transaction with any wallet
  // Example with a keypair:
  // const keypair = Keypair.fromSecretKey(secretKey);
  // preparedTx.sign(keypair);
  // const signature = await client.connection.sendRawTransaction(preparedTx.serialize());

  // Example 2: Build create subscription plan transaction
  const provider = new PublicKey("ProviderPublicKeyHere");
  const planParams = {
    planId: "basic-plan",
    name: "Basic Plan",
    description: "Basic subscription plan",
    pricePerPeriod: 1000000, // 1 USDC (6 decimals)
    periodDurationSeconds: 2592000, // 30 days
    paymentTokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    maxSubscribers: 1000
  };

  const { transaction: createPlanTx, planAddress, vaultAddress } = 
    await client.buildCreateSubscriptionPlanTransaction(planParams, provider);
  
  const preparedCreatePlanTx = await client.prepareTransaction(createPlanTx, provider);
  
  // Example 3: Build subscribe transaction
  const subscriber = new PublicKey("SubscriberPublicKeyHere");
  const { transaction: subscribeTx, subscriptionAddress } = 
    await client.buildSubscribeTransaction(planAddress, subscriber);
  
  const preparedSubscribeTx = await client.prepareTransaction(subscribeTx, subscriber);

  // Example 4: Build process payment transaction
  const subscriberTokenAccount = "SubscriberTokenAccountHere";
  const { transaction: paymentTx, amount } = 
    await client.buildProcessPaymentTransaction(subscriptionAddress, subscriberTokenAccount, subscriber);
  
  const preparedPaymentTx = await client.prepareTransaction(paymentTx, subscriber);

  console.log("All transactions built successfully!");
  console.log("Plan address:", planAddress);
  console.log("Vault address:", vaultAddress);
  console.log("Subscription address:", subscriptionAddress);
  console.log("Payment amount:", amount);
}

// Alternative: Using the client with a private key for direct signing
async function exampleWithWallet() {
  const clientWithWallet = new SolanaSubscriptionClient({
    rpcUrl: "https://api.devnet.solana.com",
    programId: "YourProgramIdHere",
  });

  const secretKey = Uint8Array.from([/* Your secret key here */]);
  const keypair = Keypair.fromSecretKey(secretKey);

  // These methods will sign and send transactions automatically
  const initResult = await clientWithWallet.buildInitializeManagerTransaction(keypair.publicKey);
  console.log("Manager initialized:", initResult);

  const planParams = {
    planId: "basic-plan",
    name: "Basic Plan",
    description: "Basic subscription plan",
    pricePerPeriod: 1000000,
    periodDurationSeconds: 2592000,
    paymentTokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    maxSubscribers: 1000
  };

  const createResult = await clientWithWallet.buildCreateSubscriptionPlanTransaction(planParams, keypair.publicKey);
  console.log("Plan created:", createResult);

  const subscribeResult = await clientWithWallet.buildSubscribeTransaction(createResult.planAddress, keypair.publicKey);
  console.log("Subscribed:", subscribeResult);
}

// Example of how to integrate with different wallet types
interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
}

async function exampleWithWalletAdapter(wallet: WalletAdapter) {
  const client = new SolanaSubscriptionClient({
    rpcUrl: "https://api.devnet.solana.com",
    programId: "YourProgramIdHere"
  });

  // Build transaction
  const initTx = await client.buildInitializeManagerTransaction(wallet.publicKey);
  const preparedTx = await client.prepareTransaction(initTx, wallet.publicKey);

  // Sign with wallet adapter
  const signedTx = await wallet.signTransaction(preparedTx);

  // Send manually or use client's connection
  const connection = (client as any).connection;
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, 'confirmed');

  console.log("Transaction sent:", signature);
}

export { exampleUsage, exampleWithWallet, exampleWithWalletAdapter };
