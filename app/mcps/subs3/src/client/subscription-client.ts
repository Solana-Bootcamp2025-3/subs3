import { Connection, PublicKey, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import type { Subs3 } from "../../../../../target/types/subs3";
import idl from "../../../../../target/idl/subs3.json";
import { 
  SolanaConfig, 
  CreateSubscriptionPlanParams, 
  SubscriptionPlanData, 
  SubscriptionManagerData,
  SubscriptionPlanInfo,
  SubscriptionData,
  SubscriptionInfo
} from "../utils/types";
import { 
  getSubscriptionManagerPda, 
  getSubscriptionPlanPda, 
  getProviderVaultPda,
  getSubscriptionPda,
  toPublicKey,
  validatePlanId,
  validatePrice,
  validatePeriodDuration
} from "../utils/subscription-helpers";

export class SolanaSubscriptionClient {
  private connection: Connection;
  private program: Program<Subs3>;
  private programId: PublicKey;

  constructor(config: SolanaConfig) {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.programId = toPublicKey(config.programId);

    // Create a dummy wallet for read-only operations when no private key is provided
    const dummyKeypair = Keypair.generate();
    const dummyWallet = new anchor.Wallet(dummyKeypair);

    const provider = new anchor.AnchorProvider(
      this.connection,
      dummyWallet,
      { commitment: 'confirmed' }
    );
    
    // Create program instance using the IDL and generated types
    this.program = new Program(idl as Subs3, provider);
  }

  /**
   * Build initialize manager transaction (unsigned)
   */
  async buildInitializeManagerTransaction(authority: PublicKey): Promise<Transaction> {
    const [subscriptionManagerPda] = getSubscriptionManagerPda(this.programId);

    try {
      const tx = await this.program.methods
        .initializeManager()
        .accountsStrict({
            subscriptionManager: subscriptionManagerPda,
            authority: authority,
            systemProgram: SystemProgram.programId
        })
        .transaction();

      return tx;
    } catch (error) {
      throw new Error(`Failed to build initialize manager transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build create subscription plan transaction (unsigned)
   */
  async buildCreateSubscriptionPlanTransaction(
    params: CreateSubscriptionPlanParams, 
    provider: PublicKey
  ): Promise<{ transaction: Transaction; planAddress: string; vaultAddress: string }> {
    // Validate inputs
    if (!validatePlanId(params.planId)) {
      throw new Error("Invalid plan ID: must be 1-32 characters");
    }
    if (!validatePrice(params.pricePerPeriod)) {
      throw new Error("Invalid price: must be a positive integer");
    }
    if (!validatePeriodDuration(params.periodDurationSeconds)) {
      throw new Error("Invalid period duration: must be between 1 minute and 1 year");
    }

    const [subscriptionManagerPda] = getSubscriptionManagerPda(this.programId);
    const [subscriptionPlanPda] = getSubscriptionPlanPda(
      provider,
      params.planId,
      this.programId
    );
    const [providerVaultPda] = getProviderVaultPda(
      provider,
      params.planId,
      this.programId
    );

    const paymentTokenMint = toPublicKey(params.paymentTokenMint);

    try {
      const transaction = await this.program.methods
        .createSubscriptionPlan(
          params.planId,
          params.name,
          params.description,
          new BN(params.pricePerPeriod),
          new BN(params.periodDurationSeconds),
          params.maxSubscribers || null
        )
        .accountsStrict({
          provider: provider,
          subscriptionManager: subscriptionManagerPda,
          subscriptionPlan: subscriptionPlanPda,
          providerVault: providerVaultPda,
          paymentTokenMint: paymentTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      return {
        transaction,
        planAddress: subscriptionPlanPda.toBase58(),
        vaultAddress: providerVaultPda.toBase58()
      };
    } catch (error) {
      throw new Error(`Failed to build create subscription plan transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get subscription manager data
   */
  async getSubscriptionManager(): Promise<SubscriptionManagerData> {
    const [subscriptionManagerPda] = getSubscriptionManagerPda(this.programId);
    
    try {
      return await this.program.account.subscriptionManager.fetch(subscriptionManagerPda) as SubscriptionManagerData;
    } catch (error) {
      throw new Error(`Failed to fetch subscription manager: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get subscription plan data
   */
  async getSubscriptionPlan(planAddress: string): Promise<SubscriptionPlanData> {
    const planPda = toPublicKey(planAddress);
    
    try {
      return await this.program.account.subscriptionPlan.fetch(planPda) as SubscriptionPlanData;
    } catch (error) {
      throw new Error(`Failed to fetch subscription plan: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all subscription plans for a provider
   */
  async getProviderPlans(providerAddress: string): Promise<SubscriptionPlanInfo[]> {
    const provider = toPublicKey(providerAddress);
    
    if (!provider) {
      throw new Error("Provider address is required when no wallet is configured");
    }
    
    try {
      const plans = await this.program.account.subscriptionPlan.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: provider.toBase58(),
          },
        },
      ]);

      return plans.map((plan: any) => ({
        address: plan.publicKey.toBase58(),
        data: plan.account as SubscriptionPlanData
      }));
    } catch (error) {
      throw new Error(`Failed to fetch provider plans: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if subscription manager is initialized
   */
  async isManagerInitialized(): Promise<boolean> {
    const [subscriptionManagerPda] = getSubscriptionManagerPda(this.programId);
    
    try {
      await this.program.account.subscriptionManager.fetch(subscriptionManagerPda);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get subscription plan PDA address
   */
  getSubscriptionPlanAddress(provider: string, planId: string): string {
    const [planPda] = getSubscriptionPlanPda(
      toPublicKey(provider),
      planId,
      this.programId
    );
    return planPda.toBase58();
  }

  /**
   * Get current wallet address
   */
  getWalletAddress(wallet: string): string {
    return toPublicKey(wallet).toBase58();
  }

  /**
   * Build subscribe transaction (unsigned)
   */
  async buildSubscribeTransaction(planAddress: string, subscriber: PublicKey): Promise<{
    transaction: Transaction;
    subscriptionAddress: string;
  }> {
    const planPda = toPublicKey(planAddress);
    const [subscriptionPda] = getSubscriptionPda(
      subscriber,
      planPda,
      this.programId
    );
    const [subscriptionManagerPda] = getSubscriptionManagerPda(this.programId);

    try {
      const transaction = await this.program.methods
        .subscribe()
        .accountsStrict({
          subscription: subscriptionPda,
          subscriptionPlan: planPda,
          subscriptionManager: subscriptionManagerPda,
          subscriber: subscriber,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      return {
        transaction,
        subscriptionAddress: subscriptionPda.toBase58()
      };
    } catch (error) {
      throw new Error(`Failed to build subscribe transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build process payment transaction (unsigned)
   */
  async buildProcessPaymentTransaction(
    subscriptionAddress: string, 
    subscriberTokenAccount: string, 
    subscriber: PublicKey
  ): Promise<{
    transaction: Transaction;
    amount: string;
  }> {
    const subscriptionPda = toPublicKey(subscriptionAddress);
    const subscriberTokenPda = toPublicKey(subscriberTokenAccount);

    try {
      // First get the subscription to find the plan
      const subscription = await this.program.account.subscription.fetch(subscriptionPda);
      const plan = await this.program.account.subscriptionPlan.fetch(subscription.subscriptionPlan);
      
      // Get provider vault PDA
      const [providerVaultPda] = getProviderVaultPda(
        plan.provider,
        plan.planId,
        this.programId
      );

      const transaction = await this.program.methods
        .processPayment()
        .accountsStrict({
          subscription: subscriptionPda,
          subscriptionPlan: subscription.subscriptionPlan,
          subscriberTokenAccount: subscriberTokenPda,
          providerVault: providerVaultPda,
          subscriber: subscriber,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();

      return {
        transaction,
        amount: plan.pricePerPeriod.toString()
      };
    } catch (error) {
      throw new Error(`Failed to build process payment transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get subscription data
   */
  async getSubscription(subscriptionAddress: string): Promise<SubscriptionData> {
    const subscriptionPda = toPublicKey(subscriptionAddress);
    
    try {
      return await this.program.account.subscription.fetch(subscriptionPda) as SubscriptionData;
    } catch (error) {
      throw new Error(`Failed to fetch subscription: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all subscriptions for a subscriber
   */
  async getSubscriberSubscriptions(subscriberAddress: string): Promise<SubscriptionInfo[]> {
    const subscriber = toPublicKey(subscriberAddress);
    
    if (!subscriber) {
      throw new Error("Subscriber address is required when no wallet is configured");
    }
    
    try {
      const subscriptions = await this.program.account.subscription.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: subscriber.toBase58(),
          },
        },
      ]);

      return subscriptions.map((sub: any) => ({
        address: sub.publicKey.toBase58(),
        data: sub.account as SubscriptionData
      }));
    } catch (error) {
      throw new Error(`Failed to fetch subscriber subscriptions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get subscription PDA address
   */
  getSubscriptionAddress(subscriber: string, planAddress: string): string {
    const [subscriptionPda] = getSubscriptionPda(
      toPublicKey(subscriber),
      toPublicKey(planAddress),
      this.programId
    );
    return subscriptionPda.toBase58();
  }

  /**
   * Send a raw signed transaction
   */
  async sendRawTransaction(signedTransactionBuffer: Buffer): Promise<string> {
    try {
      const signature = await this.connection.sendRawTransaction(signedTransactionBuffer);
      await this.connection.confirmTransaction(signature, 'confirmed');
      return signature;
    } catch (error) {
      throw new Error(`Failed to send raw transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get connection for external access
   */
  getConnection() {
    return this.connection;
  }

  /**
   * Get recent blockhash for transaction building
   */
  async getRecentBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    try {
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      return { blockhash, lastValidBlockHeight };
    } catch (error) {
      throw new Error(`Failed to get recent blockhash: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Set transaction parameters (blockhash and fee payer)
   */
  async prepareTransaction(transaction: Transaction, feePayer: PublicKey): Promise<Transaction> {
    try {
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = feePayer;
      return transaction;
    } catch (error) {
      throw new Error(`Failed to prepare transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
