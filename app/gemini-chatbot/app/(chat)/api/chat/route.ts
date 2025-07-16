import { convertToCoreMessages, experimental_createMCPClient as createMCPClient, Message, streamText } from "ai";
import { geminiProModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import {
  deleteChatById,
  getChatById,
  saveChat
} from "@/db/queries";

const mcpClient = await createMCPClient({
  transport: {
    type: 'sse',
    url: process.env.MCP_URL!,

    // HTTP headers, e.g. for authentication
    headers: {
      [process.env.MCP_AUTH_HEADER!]: process.env.MCP_AUTH_TOKEN!,
    },
  },
});

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages).filter(
    (message) => message.content.length > 0,
  );

  const tools = await mcpClient.tools();

  // Get user's wallet address if authenticated with wallet
  const userWalletAddress = session.user.walletAddress;

  const result = streamText({
    model: geminiProModel,
    system: `
        You are a Solana subscription management assistant. You help users manage subscription plans, subscriptions, and payments on the Solana blockchain.
        
        ${userWalletAddress ? `THE USER IS AUTHENTICATED WITH WALLET ADDRESS: ${userWalletAddress}` : ''}
        The user is using wallet-based authentication, so their wallet address (${userWalletAddress}) should be used as the provider/subscriber address in all tools.

        Your main capabilities include:
        - Initializing and managing subscription systems
        - Creating and managing subscription plans
        - Handling subscriptions and payments
        - Providing wallet and address information
        - Calculating subscription-related addresses (PDAs)
        - Building unsigned transactions for user signing
        - Executing signed transactions
        
        Transaction Flow:
        When users want to perform actions that require transactions:
        1. Use the appropriate build_*_tx tool to create an unsigned transaction
        2. The UI will show transaction details and handle wallet connection/signing
        3. After signing, the user will get an execute command to paste back
        4. Use execute_transaction to complete the process
        
        Available transaction builders:
        - build_initialize_manager_tx: Initialize subscription manager (needs authority address)
        - build_create_subscription_plan_tx: Create new subscription plans (needs all plan details + provider address)
        - build_subscribe_tx: Subscribe to existing plans (needs plan address + subscriber address)
        - build_process_payment_tx: Process subscription payments (needs subscription address + token account + subscriber address)
        
        Guidelines:
        - Always explain what the transaction will do before building it
        - For build_*_tx tools, ensure you have all required parameters
        - After building a transaction, explain that the user needs to sign it
        - When executing transactions, confirm the successful completion
        - Keep responses concise but informative
        - Help users understand each step of the process

      `,
    messages: coreMessages,
    tools,
    onFinish: async ({ response }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...response.messages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
