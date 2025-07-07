import { 
  Connection, 
  PublicKey, 
  Keypair, 
  LAMPORTS_PER_SOL,
  TransactionConfirmationStrategy
} from "@solana/web3.js";
import { 
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import type { Subs3 } from "../target/types/subs3";

export interface TestSetup {
  connection: Connection;
  program: Program<Subs3>;
  provider: Keypair;
  subscriber: Keypair;
  paymentTokenMint: PublicKey;
  providerTokenAccount: PublicKey;
  subscriberTokenAccount: PublicKey;
  subscriptionManagerPda: PublicKey;
  subscriptionPlanPda: PublicKey;
  providerVaultPda: PublicKey;
  subscriptionPda: PublicKey;
}

export interface TestPlanParams {
  planId: string;
  name: string;
  description: string;
  pricePerPeriod: BN;
  periodDurationSeconds: BN;
  maxSubscribers?: number;
}

export const DEFAULT_TEST_PLAN: TestPlanParams = {
  planId: "test-plan",
  name: "Test Subscription Plan",
  description: "A test subscription plan",
  pricePerPeriod: new BN(1000000), // 1 USDC
  periodDurationSeconds: new BN(2592000), // 30 days
  maxSubscribers: 100
};

/**
 * Create and fund test accounts
 */
export async function createTestAccounts(
  connection: Connection,
  payer: Keypair
): Promise<{
  provider: Keypair;
  subscriber: Keypair;
  paymentTokenMint: PublicKey;
  providerTokenAccount: PublicKey;
  subscriberTokenAccount: PublicKey;
}> {
  const provider = Keypair.generate();
  const subscriber = Keypair.generate();

  // Fund accounts
  const [providerAirdrop, subscriberAirdrop] = await Promise.all([
    connection.requestAirdrop(provider.publicKey, 2 * LAMPORTS_PER_SOL),
    connection.requestAirdrop(subscriber.publicKey, 2 * LAMPORTS_PER_SOL)
  ]);

  const latestBlockhash = await connection.getLatestBlockhash();

  await Promise.all([
    connection.confirmTransaction({
      signature: providerAirdrop,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }),
    connection.confirmTransaction({
      signature: subscriberAirdrop,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    })
  ]);

  // Create payment token mint using the modern SPL token API
  const paymentTokenMint = await createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    6 // USDC decimals
  );

  // Create token accounts
  const providerTokenAccount = await createAssociatedTokenAccount(
    connection,
    payer,
    paymentTokenMint,
    provider.publicKey
  );

  const subscriberTokenAccount = await createAssociatedTokenAccount(
    connection,
    payer,
    paymentTokenMint,
    subscriber.publicKey
  );

  // Mint tokens to subscriber
  await mintTo(
    connection,
    payer,
    paymentTokenMint,
    subscriberTokenAccount,
    payer,
    100000000 // 100 USDC
  );

  return {
    provider,
    subscriber,
    paymentTokenMint,
    providerTokenAccount,
    subscriberTokenAccount
  };
}

/**
 * Derive program PDAs
 */
export function derivePdas(
  programId: PublicKey,
  provider: PublicKey,
  subscriber: PublicKey,
  planId: string
): {
  subscriptionManagerPda: PublicKey;
  subscriptionPlanPda: PublicKey;
  providerVaultPda: PublicKey;
  subscriptionPda: PublicKey;
} {
  const [subscriptionManagerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("subscription_manager")],
    programId
  );

  const [subscriptionPlanPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("subscription_plan"),
      provider.toBuffer(),
      Buffer.from(planId)
    ],
    programId
  );

  const [providerVaultPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("provider_vault"),
      provider.toBuffer(),
      Buffer.from(planId)
    ],
    programId
  );

  const [subscriptionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("subscription"),
      subscriber.toBuffer(),
      subscriptionPlanPda.toBuffer()
    ],
    programId
  );

  return {
    subscriptionManagerPda,
    subscriptionPlanPda,
    providerVaultPda,
    subscriptionPda
  };
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a test subscription plan with default parameters
 */
export async function createTestPlan(
  program: Program<Subs3>,
  params: {
    provider: Keypair;
    subscriptionManagerPda: PublicKey;
    subscriptionPlanPda: PublicKey;
    providerVaultPda: PublicKey;
    paymentTokenMint: PublicKey;
    planParams?: Partial<TestPlanParams>;
  }
): Promise<string> {
  const planParams = { ...DEFAULT_TEST_PLAN, ...params.planParams };

  return await program.methods
    .createSubscriptionPlan(
      planParams.planId,
      planParams.name,
      planParams.description,
      planParams.pricePerPeriod,
      planParams.periodDurationSeconds,
      planParams.maxSubscribers || null
    )
    .accountsStrict({
      provider: params.provider.publicKey,
      subscriptionManager: params.subscriptionManagerPda,
      subscriptionPlan: params.subscriptionPlanPda,
      providerVault: params.providerVaultPda,
      paymentTokenMint: params.paymentTokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId
    })
    .signers([params.provider])
    .rpc();
}

/**
 * Create a test subscription
 */
export async function createTestSubscription(
  program: Program<Subs3>,
  params: {
    subscriber: Keypair;
    subscriptionPda: PublicKey;
    subscriptionPlanPda: PublicKey;
    subscriptionManagerPda: PublicKey;
  }
): Promise<string> {
  return await program.methods
    .subscribe()
    .accountsStrict({
      subscription: params.subscriptionPda,
      subscriptionPlan: params.subscriptionPlanPda,
      subscriptionManager: params.subscriptionManagerPda,
      subscriber: params.subscriber.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId
    })
    .signers([params.subscriber])
    .rpc();
}
