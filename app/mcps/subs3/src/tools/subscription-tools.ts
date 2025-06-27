import { z } from "zod";
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
  providerAddress: z.string().optional().describe("Provider's public key (defaults to current wallet)")
});

export const GetPlanAddressSchema = z.object({
  provider: z.string().describe("Provider's public key"),
  planId: z.string().describe("Plan ID")
});

export class SubscriptionTools {
  constructor(private client: SolanaSubscriptionClient) {}

  /**
   * Initialize the subscription manager
   */
  async initializeManager(): Promise<any> {
    try {
      const isInitialized = await this.client.isManagerInitialized();
      
      if (isInitialized) {
        return {
          success: false,
          message: "Subscription manager is already initialized",
          data: await this.client.getSubscriptionManager()
        };
      }

      const result = await this.client.initializeManager();
      
      return {
        success: true,
        message: "Subscription manager initialized successfully",
        data: {
          signature: result.signature,
          managerAddress: result.managerAddress,
          authority: this.client.getWalletAddress()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to initialize manager: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create a new subscription plan
   */
  async createSubscriptionPlan(params: z.infer<typeof CreateSubscriptionPlanSchema>): Promise<any> {
    try {
      const result = await this.client.createSubscriptionPlan(params);
      
      return {
        success: true,
        message: "Subscription plan created successfully",
        data: {
          signature: result.signature,
          planAddress: result.planAddress,
          vaultAddress: result.vaultAddress,
          planDetails: {
            planId: params.planId,
            name: params.name,
            description: params.description,
            pricePerPeriod: params.pricePerPeriod,
            periodDuration: formatPeriodDuration(params.periodDurationSeconds),
            paymentToken: params.paymentTokenMint,
            maxSubscribers: params.maxSubscribers || "Unlimited",
            provider: this.client.getWalletAddress()
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create subscription plan: ${error instanceof Error ? error.message : String(error)}`
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
   * Get all subscription plans for a provider
   */
  async getProviderPlans(params: z.infer<typeof GetProviderPlansSchema>): Promise<any> {
    try {
      const plans = await this.client.getProviderPlans(params.providerAddress);
      
      return {
        success: true,
        message: `Found ${plans.length} subscription plan(s)`,
        data: {
          providerAddress: params.providerAddress || this.client.getWalletAddress(),
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
   * Get current wallet information
   */
  getWalletInfo(): any {
    return {
      success: true,
      message: "Current wallet information",
      data: {
        address: this.client.getWalletAddress(),
        note: "This is the address that will be used as provider for subscription plans"
      }
    };
  }
}
