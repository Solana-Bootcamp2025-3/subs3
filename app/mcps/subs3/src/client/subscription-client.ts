import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
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
  private wallet: anchor.Wallet;
  private programId: PublicKey;

  constructor(config: SolanaConfig) {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.programId = toPublicKey(config.programId);
    
    if (config.privateKey) {
      const keypair = Keypair.fromSecretKey(
        Buffer.from(config.privateKey, 'base64')
      );
      this.wallet = new anchor.Wallet(keypair);
    } else {
      throw new Error("Private key is required for wallet operations");
    }

    const provider = new anchor.AnchorProvider(
      this.connection,
      this.wallet,
      { commitment: 'confirmed' }
    );
    
    // Create program instance using the IDL and generated types
    this.program = new Program(idl as Subs3, provider);
  }

  /**
   * Initialize the subscription manager (one-time setup)
   */
  async initializeManager(): Promise<{ signature: string; managerAddress: string }> {
    const [subscriptionManagerPda] = getSubscriptionManagerPda(this.programId);

    try {
      const tx = await this.program.methods
        .initializeManager()
        .accountsStrict({
            subscriptionManager: subscriptionManagerPda,
            authority: this.wallet.publicKey,
            systemProgram: SystemProgram.programId
        })
        .rpc();

      return {
        signature: tx,
        managerAddress: subscriptionManagerPda.toBase58()
      };
    } catch (error) {
      throw new Error(`Failed to initialize manager: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new subscription plan
   */
  async createSubscriptionPlan(params: CreateSubscriptionPlanParams): Promise<{
    signature: string;
    planAddress: string;
    vaultAddress: string;
  }> {
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
      this.wallet.publicKey,
      params.planId,
      this.programId
    );
    const [providerVaultPda] = getProviderVaultPda(
      this.wallet.publicKey,
      params.planId,
      this.programId
    );

    const paymentTokenMint = toPublicKey(params.paymentTokenMint);

    try {
      const signature = await this.program.methods
        .createSubscriptionPlan(
          params.planId,
          params.name,
          params.description,
          new BN(params.pricePerPeriod),
          new BN(params.periodDurationSeconds),
          params.maxSubscribers || null
        )
        .accountsStrict({
          provider: this.wallet.publicKey,
          subscriptionManager: subscriptionManagerPda,
          subscriptionPlan: subscriptionPlanPda,
          providerVault: providerVaultPda,
          paymentTokenMint: paymentTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return {
        signature,
        planAddress: subscriptionPlanPda.toBase58(),
        vaultAddress: providerVaultPda.toBase58()
      };
    } catch (error) {
      throw new Error(`Failed to create subscription plan: ${error instanceof Error ? error.message : String(error)}`);
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
  async getProviderPlans(providerAddress?: string): Promise<SubscriptionPlanInfo[]> {
    const provider = providerAddress ? toPublicKey(providerAddress) : this.wallet.publicKey;
    
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
  getWalletAddress(): string {
    return this.wallet.publicKey.toBase58();
  }

  /**
   * Subscribe to a subscription plan
   */
  async subscribe(planAddress: string): Promise<{
    signature: string;
    subscriptionAddress: string;
    startTime: number;
    nextPaymentDue: number;
  }> {
    const planPda = toPublicKey(planAddress);
    const [subscriptionPda] = getSubscriptionPda(
      this.wallet.publicKey,
      planPda,
      this.programId
    );
    const [subscriptionManagerPda] = getSubscriptionManagerPda(this.programId);

    try {
      const signature = await this.program.methods
        .subscribe()
        .accountsStrict({
          subscription: subscriptionPda,
          subscriptionPlan: planPda,
          subscriptionManager: subscriptionManagerPda,
          subscriber: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Get the created subscription to return timing info
      const subscription = await this.program.account.subscription.fetch(subscriptionPda);
      
      return {
        signature,
        subscriptionAddress: subscriptionPda.toBase58(),
        startTime: subscription.startTime.toNumber(),
        nextPaymentDue: subscription.nextPaymentDue.toNumber()
      };
    } catch (error) {
      throw new Error(`Failed to subscribe: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process payment for a subscription
   */
  async processPayment(subscriptionAddress: string, subscriberTokenAccount: string): Promise<{
    signature: string;
    amount: string;
    paymentNumber: number;
    nextPaymentDue: number;
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

      const signature = await this.program.methods
        .processPayment()
        .accountsStrict({
          subscription: subscriptionPda,
          subscriptionPlan: subscription.subscriptionPlan,
          subscriberTokenAccount: subscriberTokenPda,
          providerVault: providerVaultPda,
          subscriber: this.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      // Get updated subscription for payment info
      const updatedSubscription = await this.program.account.subscription.fetch(subscriptionPda);
      
      return {
        signature,
        amount: plan.pricePerPeriod.toString(),
        paymentNumber: updatedSubscription.totalPaymentsMade,
        nextPaymentDue: updatedSubscription.nextPaymentDue.toNumber()
      };
    } catch (error) {
      throw new Error(`Failed to process payment: ${error instanceof Error ? error.message : String(error)}`);
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
  async getSubscriberSubscriptions(subscriberAddress?: string): Promise<SubscriptionInfo[]> {
    const subscriber = subscriberAddress ? toPublicKey(subscriberAddress) : this.wallet.publicKey;
    
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
}
