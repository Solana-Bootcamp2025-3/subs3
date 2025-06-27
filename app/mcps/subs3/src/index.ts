import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as dotenv from "dotenv";
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

import { SolanaSubscriptionClient } from "./client/subscription-client.js";
import { 
  SubscriptionTools,
  InitializeManagerSchema,
  CreateSubscriptionPlanSchema,
  GetSubscriptionManagerSchema,
  GetSubscriptionPlanSchema,
  GetProviderPlansSchema,
  GetPlanAddressSchema
} from "./tools/subscription-tools.js";
import { SolanaConfig } from "./utils/types.js";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SOLANA_RPC_URL', 'SOLANA_PROGRAM_ID', 'SOLANA_PRIVATE_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const solanaConfig: SolanaConfig = {
  rpcUrl: process.env.SOLANA_RPC_URL!,
  programId: process.env.SOLANA_PROGRAM_ID!,
  privateKey: process.env.SOLANA_PRIVATE_KEY!,
};

// Initialize Solana client and tools
const solanaClient = new SolanaSubscriptionClient(solanaConfig);
const subscriptionTools = new SubscriptionTools(solanaClient);

const server = new Server({
    name: "Solana Subscription MCP Server",
    version: "1.0.0",
    description: `
      This MCP server provides tools to interact with a Solana-based subscription program.
      It allows you to initialize the subscription manager, create subscription plans,
      and query subscription data. Designed for integration with Solana applications
      that require subscription management functionality.
    `
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(
  ListToolsRequestSchema,
  async () => {
    return {
      tools: [
        {
          name: "initialize_manager",
          description: "Initialize the subscription manager (one-time setup). This creates the global state for managing all subscription plans and providers.",
          inputSchema: zodToJsonSchema(InitializeManagerSchema),
        },
        {
          name: "create_subscription_plan",
          description: "Create a new subscription plan as a provider. Requires plan ID, name, description, pricing, and billing period information.",
          inputSchema: zodToJsonSchema(CreateSubscriptionPlanSchema),
        },
        {
          name: "get_subscription_manager",
          description: "Get information about the subscription manager including total providers and subscriptions.",
          inputSchema: zodToJsonSchema(GetSubscriptionManagerSchema),
        },
        {
          name: "get_subscription_plan",
          description: "Get detailed information about a specific subscription plan by its address.",
          inputSchema: zodToJsonSchema(GetSubscriptionPlanSchema),
        },
        {
          name: "get_provider_plans",
          description: "Get all subscription plans created by a provider (defaults to current wallet if no address specified).",
          inputSchema: zodToJsonSchema(GetProviderPlansSchema),
        },
        {
          name: "get_plan_address",
          description: "Calculate the program-derived address (PDA) for a subscription plan given provider and plan ID.",
          inputSchema: zodToJsonSchema(GetPlanAddressSchema),
        },
        {
          name: "get_period_durations",
          description: "Get available period duration constants and their human-readable formats.",
          inputSchema: zodToJsonSchema(InitializeManagerSchema), // Empty schema
        },
        {
          name: "get_wallet_info",
          description: "Get information about the current wallet being used as provider.",
          inputSchema: zodToJsonSchema(InitializeManagerSchema), // Empty schema
        }
      ]
    }
  }
);

server.setRequestHandler(
  CallToolRequestSchema,
  async (request) => {
    try {
      if (!request.params.arguments) {
        throw new Error("Arguments are required");
      }

      switch (request.params.name) {
        case "initialize_manager": {
          const result = await subscriptionTools.initializeManager();
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        case "create_subscription_plan": {
          const args = CreateSubscriptionPlanSchema.parse(request.params.arguments);
          const result = await subscriptionTools.createSubscriptionPlan(args);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        case "get_subscription_manager": {
          const result = await subscriptionTools.getSubscriptionManager();
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        case "get_subscription_plan": {
          const args = GetSubscriptionPlanSchema.parse(request.params.arguments);
          const result = await subscriptionTools.getSubscriptionPlan(args);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        case "get_provider_plans": {
          const args = GetProviderPlansSchema.parse(request.params.arguments);
          const result = await subscriptionTools.getProviderPlans(args);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        case "get_plan_address": {
          const args = GetPlanAddressSchema.parse(request.params.arguments);
          const result = await subscriptionTools.getPlanAddress(args);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        case "get_period_durations": {
          const result = subscriptionTools.getPeriodDurations();
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        case "get_wallet_info": {
          const result = subscriptionTools.getWalletInfo();
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
      }
      throw error;
    }
  }
)

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Solana Subscription MCP Server running on stdio");
}

runServer().catch(console.error);