import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
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
  GetPlanAddressSchema,
  SubscribeSchema,
  ProcessPaymentSchema,
  GetSubscriptionSchema,
  GetSubscriberSubscriptionsSchema,
  GetSubscriptionAddressSchema,
  BuildInitializeManagerTxSchema,
  BuildCreateSubscriptionPlanTxSchema,
  BuildSubscribeTxSchema,
  BuildProcessPaymentTxSchema,
  ExecuteTransactionSchema,
  GetWalletSchema
} from "./tools/subscription-tools.js";
import { SolanaConfig } from "./utils/types.js";
import express from "express";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SOLANA_RPC_URL', 'SOLANA_PROGRAM_ID', 'SOLANA_PRIVATE_KEY', 'PORT', 'AUTH_TOKEN', 'AUTH_HEADER'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Validate RPC URL format
const rpcUrl = process.env.SOLANA_RPC_URL!;
if (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://')) {
  console.error(`Invalid SOLANA_RPC_URL: "${rpcUrl}". URL must start with http:// or https://`);
  console.error('Example: http://localhost:8899 or https://api.mainnet-beta.solana.com');
  process.exit(1);
}

const solanaConfig: SolanaConfig = {
  rpcUrl: process.env.SOLANA_RPC_URL!,
  programId: process.env.SOLANA_PROGRAM_ID!,
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
          inputSchema: zodToJsonSchema(GetWalletSchema), // Empty schema
        },
        {
          name: "subscribe",
          description: "Subscribe to a subscription plan. Creates a new subscription for the current wallet.",
          inputSchema: zodToJsonSchema(SubscribeSchema),
        },
        {
          name: "process_payment",
          description: "Process a payment for an existing subscription. Can be called by anyone when payment is due.",
          inputSchema: zodToJsonSchema(ProcessPaymentSchema),
        },
        {
          name: "get_subscription",
          description: "Get detailed information about a specific subscription by its address.",
          inputSchema: zodToJsonSchema(GetSubscriptionSchema),
        },
        {
          name: "get_subscriber_subscriptions",
          description: "Get all subscriptions for a subscriber (defaults to current wallet if no address specified).",
          inputSchema: zodToJsonSchema(GetSubscriberSubscriptionsSchema),
        },
        {
          name: "get_subscription_address",
          description: "Calculate the program-derived address (PDA) for a subscription given subscriber and plan address.",
          inputSchema: zodToJsonSchema(GetSubscriptionAddressSchema),
        },
        {
          name: "build_initialize_manager_tx",
          description: "Build an unsigned transaction to initialize the subscription manager. Returns a transaction ready for signing.",
          inputSchema: zodToJsonSchema(BuildInitializeManagerTxSchema),
        },
        {
          name: "build_create_subscription_plan_tx",
          description: "Build an unsigned transaction to create a new subscription plan. Returns a transaction ready for signing.",
          inputSchema: zodToJsonSchema(BuildCreateSubscriptionPlanTxSchema),
        },
        {
          name: "build_subscribe_tx",
          description: "Build an unsigned transaction to subscribe to a plan. Returns a transaction ready for signing.",
          inputSchema: zodToJsonSchema(BuildSubscribeTxSchema),
        },
        {
          name: "build_process_payment_tx",
          description: "Build an unsigned transaction to process a payment. Returns a transaction ready for signing.",
          inputSchema: zodToJsonSchema(BuildProcessPaymentTxSchema),
        },
        {
          name: "execute_transaction",
          description: "Execute a signed transaction that was previously built using one of the build_*_tx tools.",
          inputSchema: zodToJsonSchema(ExecuteTransactionSchema),
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

        case "get_subscription_manager": {
          const result = await subscriptionTools.getSubscriptionManager();
          return result;
        }

        case "get_subscription_plan": {
          const args = GetSubscriptionPlanSchema.parse(request.params.arguments);
          const result = await subscriptionTools.getSubscriptionPlan(args);
          return result;
        }

        case "get_provider_plans": {
          const args = GetProviderPlansSchema.parse(request.params.arguments);
          const result = await subscriptionTools.getProviderPlans(args);
          return result;
        }

        case "get_plan_address": {
          const args = GetPlanAddressSchema.parse(request.params.arguments);
          const result = await subscriptionTools.getPlanAddress(args);
          return result;
        }

        case "get_period_durations": {
          const result = subscriptionTools.getPeriodDurations();
          return result;
        }

        case "get_wallet_info": {
          const args = GetWalletSchema.parse(request.params.arguments);
          const result = subscriptionTools.getWalletInfo(args);
          return result;
        }

        case "get_subscription": {
          const args = GetSubscriptionSchema.parse(request.params.arguments);
          const result = await subscriptionTools.getSubscription(args);
          return result;
        }

        case "get_subscriber_subscriptions": {
          const args = GetSubscriberSubscriptionsSchema.parse(request.params.arguments);
          const result = await subscriptionTools.getSubscriberSubscriptions(args);
          return result;
        }

        case "get_subscription_address": {
          const args = GetSubscriptionAddressSchema.parse(request.params.arguments);
          const result = await subscriptionTools.getSubscriptionAddress(args);
          return result;
        }

        case "build_initialize_manager_tx": {
          const args = BuildInitializeManagerTxSchema.parse(request.params.arguments);
          const result = await subscriptionTools.buildInitializeManagerTransaction(args);
          return result;
        }

        case "build_create_subscription_plan_tx": {
          const args = BuildCreateSubscriptionPlanTxSchema.parse(request.params.arguments);
          const result = await subscriptionTools.buildCreateSubscriptionPlanTransaction(args);
          return result;
        }

        case "build_subscribe_tx": {
          const args = BuildSubscribeTxSchema.parse(request.params.arguments);
          const result = await subscriptionTools.buildSubscribeTransaction(args);
          return result;
        }

        case "build_process_payment_tx": {
          const args = BuildProcessPaymentTxSchema.parse(request.params.arguments);
          const result = await subscriptionTools.buildProcessPaymentTransaction(args);
          return result;
        }

        case "execute_transaction": {
          const args = ExecuteTransactionSchema.parse(request.params.arguments);
          const result = await subscriptionTools.executeTransaction(args);
          return result;
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

//runServer().catch(console.error);


const app = express();
app.use(express.json());

// Apply authentication middleware to all routes
app.use(authenticateRequest);

// Store transports for each session type
const transports = {
  sse: {} as Record<string, SSEServerTransport>
};

// Legacy SSE endpoint for older clients
app.get('/sse', async (req, res) => {
  // Create SSE transport for legacy clients
  const transport = new SSEServerTransport('/messages', res);
  transports.sse[transport.sessionId] = transport;
  
  res.on("close", () => {
    delete transports.sse[transport.sessionId];
  });
  
  await server.connect(transport);
});

// Legacy message endpoint for older clients
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.sse[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});


// Authentication configuration
const AUTH_TOKEN = process.env.AUTH_TOKEN!;
const AUTH_HEADER = process.env.AUTH_HEADER!;

// Authentication middleware
function authenticateRequest(req: any, res: any, next: any) {
  const authHeader = req.headers[AUTH_HEADER];
  
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Missing authentication header',
      required_header: AUTH_HEADER 
    });
  }
  
  if (authHeader !== AUTH_TOKEN) {
    return res.status(403).json({ 
      error: 'Invalid authentication token' 
    });
  }
  
  next();
}

// Start the server
const PORT = process.env.PORT!;

app.listen(PORT, () => {
  console.log(`Solana Subscription MCP Server running on port ${PORT}`);
  console.log(`Authentication required: ${AUTH_HEADER} header`);
});