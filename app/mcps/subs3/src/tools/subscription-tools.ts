import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { SolanaSubscriptionClient } from "../client/subscription-client";
import { CreateSubscriptionPlanParams } from "../utils/types";
import { formatPeriodDuration, formatTimestamp, PERIOD_DURATIONS } from "../utils/subscription-helpers";

// Schema definitions for tool inputs
export const InitializeManagerSchema = z.object({});

export const CreateSubscriptionPlanSchema = z.object({
  planId: z.string().min(1).max(32).describe("Unique identifier for the subscription plan"),
  name: z.string().min(1).max(100).describe("Display name for the subscription plan"),
  description: z.string().min(1).max(500).describe("Description of what the subscription includes"),
  pricePerPeriod: z.number().int().positive().describe("Price per billing period in smallest token units"),
  periodDurationSeconds: z.number().int().positive().describe("Duration of each billing period in seconds"),
  paymentTokenMint: z.string().describe("Public key of the SPL token mint for payments"),
  maxSubscribers: z.number().int().positive().optional().describe("Maximum number of subscribers (optional)")
});

export const GetSubscriptionManagerSchema = z.object({});

export const GetSubscriptionPlanSchema = z.object({
  planAddress: z.string().describe("Public key address of the subscription plan")
});

export const GetProviderPlansSchema = z.object({
  providerAddress: z.string().describe("Provider's public key (defaults to current wallet)")
});

export const GetPlanAddressSchema = z.object({
  provider: z.string().describe("Provider's public key"),
  planId: z.string().describe("Plan ID")
});

export const SubscribeSchema = z.object({
  planAddress: z.string().describe("Public key address of the subscription plan to subscribe to")
});

export const ProcessPaymentSchema = z.object({
  subscriptionAddress: z.string().describe("Public key address of the subscription to process payment for"),
  subscriberTokenAccount: z.string().describe("Subscriber's token account address containing payment tokens")
});

export const GetWalletSchema = z.object({
  walletAddress: z.string().describe("Public key address of the wallet")
});

export const GetSubscriptionSchema = z.object({
  subscriptionAddress: z.string().describe("Public key address of the subscription")
});

export const GetSubscriberSubscriptionsSchema = z.object({
  subscriberAddress: z.string().describe("Subscriber's public key (defaults to current wallet)")
});

export const GetSubscriptionAddressSchema = z.object({
  subscriber: z.string().describe("Subscriber's public key"),
  planAddress: z.string().describe("Subscription plan address")
});

// Unsigned transaction builder schemas
export const BuildInitializeManagerTxSchema = z.object({
  authority: z.string().describe("Authority public key for the subscription manager")
});

export const BuildCreateSubscriptionPlanTxSchema = z.object({
  planId: z.string().min(1).max(32).describe("Unique identifier for the subscription plan"),
  name: z.string().min(1).max(100).describe("Display name for the subscription plan"),
  description: z.string().min(1).max(500).describe("Description of what the subscription includes"),
  pricePerPeriod: z.number().int().positive().describe("Price per billing period in smallest token units"),
  periodDurationSeconds: z.number().int().positive().describe("Duration of each billing period in seconds"),
  paymentTokenMint: z.string().describe("Public key of the SPL token mint for payments"),
  maxSubscribers: z.number().int().positive().optional().describe("Maximum number of subscribers (optional)"),
  provider: z.string().describe("Provider's public key")
});

export const BuildSubscribeTxSchema = z.object({
  planAddress: z.string().describe("Public key address of the subscription plan to subscribe to"),
  subscriber: z.string().describe("Subscriber's public key")
});

export const BuildProcessPaymentTxSchema = z.object({
  subscriptionAddress: z.string().describe("Public key address of the subscription to process payment for"),
  subscriberTokenAccount: z.string().describe("Subscriber's token account address containing payment tokens"),
  subscriber: z.string().describe("Subscriber's public key")
});

// Transaction execution schema (after signing)
export const ExecuteTransactionSchema = z.object({
  transactionHash: z.string().describe("Signed transaction hash to execute"),
  transactionType: z.enum(["initialize_manager", "create_subscription_plan", "subscribe", "process_payment"]).describe("Type of transaction being executed"),
  metadata: z.any().optional().describe("Additional metadata for the transaction")
});

export class SubscriptionTools {
  constructor(private client: SolanaSubscriptionClient) {}

  /**
   * Get all subscription plans for a provider
   */
  async getProviderPlans(params: z.infer<typeof GetProviderPlansSchema>): Promise<any> {
    try {
      const plans = await this.client.getProviderPlans(params.providerAddress);
      
      return {
        success: true,
        message: `Found ${plans.length} subscription plan(s)`,
        data: {
          providerAddress: params.providerAddress,
          totalPlans: plans.length,
          plans: plans.map(plan => ({
            address: plan.address,
            planId: plan.data.planId,
            name: plan.data.name,
            description: plan.data.description,
            pricePerPeriod: plan.data.pricePerPeriod.toString(),
            periodDuration: formatPeriodDuration(plan.data.periodDurationSeconds.toNumber()),
            currentSubscribers: plan.data.currentSubscribers,
            maxSubscribers: plan.data.maxSubscribers !== null ? plan.data.maxSubscribers.toString() : "Unlimited",
            totalRevenue: plan.data.totalRevenue.toString(),
            isActive: plan.data.isActive,
            createdAt: formatTimestamp(plan.data.createdAt.toNumber())
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get provider plans: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get subscription plan address for given provider and plan ID
   */
  async getPlanAddress(params: z.infer<typeof GetPlanAddressSchema>): Promise<any> {
    try {
      const planAddress = this.client.getSubscriptionPlanAddress(params.provider, params.planId);
      
      return {
        success: true,
        message: "Plan address calculated successfully",
        data: {
          provider: params.provider,
          planId: params.planId,
          planAddress: planAddress
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get plan address: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get available period duration constants
   */
  getPeriodDurations(): any {
    return {
      success: true,
      message: "Available period duration constants",
      data: {
        durations: Object.entries(PERIOD_DURATIONS).map(([name, seconds]) => ({
          name,
          seconds,
          humanReadable: formatPeriodDuration(seconds)
        })),
        note: "You can also specify custom durations in seconds"
      }
    };
  }

  /**
   * Get subscription details
   */
  async getSubscription(params: z.infer<typeof GetSubscriptionSchema>): Promise<any> {
    try {
      const subscription = await this.client.getSubscription(params.subscriptionAddress);
      
      return {
        success: true,
        message: "Subscription data retrieved successfully",
        data: {
          address: params.subscriptionAddress,
          subscriber: subscription.subscriber.toBase58(),
          subscriptionPlan: subscription.subscriptionPlan.toBase58(),
          startTime: formatTimestamp(subscription.startTime.toNumber()),
          nextPaymentDue: formatTimestamp(subscription.nextPaymentDue.toNumber()),
          isActive: subscription.isActive,
          isPaused: subscription.isPaused,
          pausedAt: subscription.pausedAt ? formatTimestamp(subscription.pausedAt.toNumber()) : null,
          cancelledAt: subscription.cancelledAt ? formatTimestamp(subscription.cancelledAt.toNumber()) : null,
          totalPaymentsMade: subscription.totalPaymentsMade,
          totalAmountPaid: subscription.totalAmountPaid.toString(),
          paymentNonce: subscription.paymentNonce.toString(),
          bump: subscription.bump
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get subscription: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get subscription manager information
   */
  async getSubscriptionManager(): Promise<any> {
    try {
      const isInitialized = await this.client.isManagerInitialized();
      
      if (!isInitialized) {
        return {
          success: false,
          message: "Subscription manager is not initialized yet",
          suggestion: "Use initialize_manager tool to set it up first"
        };
      }

      const manager = await this.client.getSubscriptionManager();
      
      return {
        success: true,
        message: "Subscription manager data retrieved successfully",
        data: {
          authority: manager.authority.toBase58(),
          totalProviders: manager.totalProviders.toNumber(),
          totalSubscriptions: manager.totalSubscriptions.toNumber(),
          bump: manager.bump
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get subscription manager: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get subscription plan details
   */
  async getSubscriptionPlan(params: z.infer<typeof GetSubscriptionPlanSchema>): Promise<any> {
    try {
      const plan = await this.client.getSubscriptionPlan(params.planAddress);
      
      return {
        success: true,
        message: "Subscription plan data retrieved successfully",
        data: {
          address: params.planAddress,
          provider: plan.provider.toBase58(),
          planId: plan.planId,
          name: plan.name,
          description: plan.description,
          pricePerPeriod: plan.pricePerPeriod.toString(),
          periodDuration: formatPeriodDuration(plan.periodDurationSeconds.toNumber()),
          periodDurationSeconds: plan.periodDurationSeconds.toNumber(),
          paymentToken: plan.paymentToken.toBase58(),
          maxSubscribers: plan.maxSubscribers !== null ? plan.maxSubscribers.toString() : "Unlimited",
          currentSubscribers: plan.currentSubscribers,
          totalRevenue: plan.totalRevenue.toString(),
          isActive: plan.isActive,
          createdAt: formatTimestamp(plan.createdAt.toNumber()),
          bump: plan.bump
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get subscription plan: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get all subscriptions for a subscriber
   */
  async getSubscriberSubscriptions(params: z.infer<typeof GetSubscriberSubscriptionsSchema>): Promise<any> {
    try {
      const subscriptions = await this.client.getSubscriberSubscriptions(params.subscriberAddress);
      
      return {
        success: true,
        message: `Found ${subscriptions.length} subscription(s)`,
        data: {
          subscriberAddress: params.subscriberAddress,
          totalSubscriptions: subscriptions.length,
          subscriptions: subscriptions.map(sub => ({
            address: sub.address,
            subscriptionPlan: sub.data.subscriptionPlan.toBase58(),
            startTime: formatTimestamp(sub.data.startTime.toNumber()),
            nextPaymentDue: formatTimestamp(sub.data.nextPaymentDue.toNumber()),
            isActive: sub.data.isActive,
            isPaused: sub.data.isPaused,
            totalPaymentsMade: sub.data.totalPaymentsMade,
            totalAmountPaid: sub.data.totalAmountPaid.toString()
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get subscriber subscriptions: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get subscription address for given subscriber and plan
   */
  async getSubscriptionAddress(params: z.infer<typeof GetSubscriptionAddressSchema>): Promise<any> {
    try {
      const subscriptionAddress = this.client.getSubscriptionAddress(
        params.subscriber,
        params.planAddress
      );
      
      return {
        success: true,
        message: "Subscription address calculated successfully",
        data: {
          subscriber: params.subscriber,
          planAddress: params.planAddress,
          subscriptionAddress: subscriptionAddress
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get subscription address: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get current wallet information
   */
  getWalletInfo(params: z.infer<typeof GetWalletSchema>): any {
    return {
      success: true,
      message: "Current wallet information",
      data: {
        address: params.walletAddress,
        note: "This is the address that will be used as provider for subscription plans"
      }
    };
  }

  /**
   * Build initialize manager transaction (unsigned)
   */
  async buildInitializeManagerTransaction(params: z.infer<typeof BuildInitializeManagerTxSchema>): Promise<any> {
    try {
      const authority = new PublicKey(params.authority);
      const transaction = await this.client.buildInitializeManagerTransaction(authority);
      const preparedTx = await this.client.prepareTransaction(transaction, authority);
      
      // Serialize transaction for signing
      const serializedTx = preparedTx.serialize({ requireAllSignatures: false }).toString('base64');
      
      return {
        success: true,
        message: "Initialize manager transaction prepared for signing",
        requiresSignature: true,
        data: {
          transactionType: "initialize_manager",
          serializedTransaction: serializedTx,
          authority: params.authority,
          instructions: "Please sign this transaction to initialize the subscription manager",
          metadata: {
            authority: params.authority
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to build initialize manager transaction: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Build create subscription plan transaction (unsigned)
   */
  async buildCreateSubscriptionPlanTransaction(params: z.infer<typeof BuildCreateSubscriptionPlanTxSchema>): Promise<any> {
    try {
      const provider = new PublicKey(params.provider);
      const { transaction, planAddress, vaultAddress } = await this.client.buildCreateSubscriptionPlanTransaction(params, provider);
      const preparedTx = await this.client.prepareTransaction(transaction, provider);
      
      // Serialize transaction for signing
      const serializedTx = preparedTx.serialize({ requireAllSignatures: false }).toString('base64');
      
      return {
        success: true,
        message: "Create subscription plan transaction prepared for signing",
        requiresSignature: true,
        data: {
          transactionType: "create_subscription_plan",
          serializedTransaction: serializedTx,
          provider: params.provider,
          instructions: `Please sign this transaction to create subscription plan "${params.name}"`,
          planAddress,
          vaultAddress,
          metadata: {
            planId: params.planId,
            name: params.name,
            description: params.description,
            pricePerPeriod: params.pricePerPeriod,
            periodDurationSeconds: params.periodDurationSeconds,
            paymentTokenMint: params.paymentTokenMint,
            maxSubscribers: params.maxSubscribers,
            provider: params.provider,
            planAddress,
            vaultAddress
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to build create subscription plan transaction: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Build subscribe transaction (unsigned)
   */
  async buildSubscribeTransaction(params: z.infer<typeof BuildSubscribeTxSchema>): Promise<any> {
    try {
      const subscriber = new PublicKey(params.subscriber);
      const { transaction, subscriptionAddress } = await this.client.buildSubscribeTransaction(params.planAddress, subscriber);
      const preparedTx = await this.client.prepareTransaction(transaction, subscriber);
      
      // Serialize transaction for signing
      const serializedTx = preparedTx.serialize({ requireAllSignatures: false }).toString('base64');
      
      return {
        success: true,
        message: "Subscribe transaction prepared for signing",
        requiresSignature: true,
        data: {
          transactionType: "subscribe",
          serializedTransaction: serializedTx,
          subscriber: params.subscriber,
          instructions: "Please sign this transaction to subscribe to the plan",
          subscriptionAddress,
          metadata: {
            planAddress: params.planAddress,
            subscriber: params.subscriber,
            subscriptionAddress
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to build subscribe transaction: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Build process payment transaction (unsigned)
   */
  async buildProcessPaymentTransaction(params: z.infer<typeof BuildProcessPaymentTxSchema>): Promise<any> {
    try {
      const subscriber = new PublicKey(params.subscriber);
      const { transaction, amount } = await this.client.buildProcessPaymentTransaction(
        params.subscriptionAddress,
        params.subscriberTokenAccount,
        subscriber
      );
      const preparedTx = await this.client.prepareTransaction(transaction, subscriber);
      
      // Serialize transaction for signing
      const serializedTx = preparedTx.serialize({ requireAllSignatures: false }).toString('base64');
      
      return {
        success: true,
        message: "Process payment transaction prepared for signing",
        requiresSignature: true,
        data: {
          transactionType: "process_payment",
          serializedTransaction: serializedTx,
          subscriber: params.subscriber,
          instructions: `Please sign this transaction to process payment of ${amount} tokens`,
          amount,
          metadata: {
            subscriptionAddress: params.subscriptionAddress,
            subscriberTokenAccount: params.subscriberTokenAccount,
            subscriber: params.subscriber,
            amount
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to build process payment transaction: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Execute a signed transaction
   */
  async executeTransaction(params: z.infer<typeof ExecuteTransactionSchema>): Promise<any> {
    try {
      // Deserialize and send the signed transaction
      const transactionBuffer = Buffer.from(params.transactionHash, 'base64');
      const signature = await this.client.sendRawTransaction(transactionBuffer);
      
      // Return success with transaction-specific data
      let resultData: any = {
        signature,
        transactionType: params.transactionType,
        confirmed: true
      };

      // Add transaction-specific data from metadata
      if (params.metadata) {
        resultData = { ...resultData, ...params.metadata };
      }

      return {
        success: true,
        message: `Transaction executed successfully: ${params.transactionType}`,
        data: resultData
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to execute transaction: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
