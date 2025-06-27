# Solana Subscription MCP Server

This Model Context Protocol (MCP) server provides tools to interact with a Solana-based subscription program. It enables you to manage subscription plans, initialize the subscription manager, and query subscription data through a standardized interface.

## Features

- **Initialize Manager**: One-time setup of the subscription manager
- **Create Subscription Plans**: Create new subscription plans as a provider
- **Query Data**: Get information about subscription plans and manager state
- **Modular Architecture**: Clean separation of concerns with reusable utilities

## Setup

### 1. Install Dependencies

```bash
cd app/mcps/subs3
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PROGRAM_ID=4vWTjxHPJx6YzWeMfmimgeA2cMcyC9kXg3jqCq93mmo2
SOLANA_PRIVATE_KEY=your_base64_encoded_private_key_here
```

### 3. Convert Your Keypair

If you have a Solana keypair JSON file, use the conversion script:

```bash
node scripts/convert-keypair.js ~/.config/solana/id.json
```

This will output the base64 encoded private key to use in your `.env` file.

### 4. Build and Run

```bash
npm run build
npm start
```

**Note**: The MCP server uses Anchor's generated IDL and TypeScript types directly from the main Solana program via relative imports, following Anchor best practices. No file copying is needed when the program is updated.

## Available Tools

### `initialize_manager`
Initialize the subscription manager (one-time setup).

**Parameters:** None

**Example Response:**
```json
{
  "success": true,
  "message": "Subscription manager initialized successfully",
  "data": {
    "signature": "transaction_signature",
    "managerAddress": "manager_pda_address",
    "authority": "wallet_address"
  }
}
```

### `create_subscription_plan`
Create a new subscription plan as a provider.

**Parameters:**
- `planId` (string): Unique identifier (1-32 characters)
- `name` (string): Display name (1-100 characters)
- `description` (string): Plan description (1-500 characters)
- `pricePerPeriod` (number): Price per billing period in token smallest units
- `periodDurationSeconds` (number): Billing period duration in seconds
- `paymentTokenMint` (string): SPL token mint address for payments
- `maxSubscribers` (number, optional): Maximum subscribers limit

**Example:**
```json
{
  "planId": "basic-monthly",
  "name": "Basic Monthly Plan",
  "description": "Access to basic features with monthly billing",
  "pricePerPeriod": 1000000,
  "periodDurationSeconds": 2592000,
  "paymentTokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "maxSubscribers": 1000
}
```

### `get_subscription_manager`
Get information about the subscription manager.

**Parameters:** None

### `get_subscription_plan`
Get detailed information about a specific subscription plan.

**Parameters:**
- `planAddress` (string): Public key address of the subscription plan

### `get_provider_plans`
Get all subscription plans created by a provider.

**Parameters:**
- `providerAddress` (string, optional): Provider's public key (defaults to current wallet)

### `get_plan_address`
Calculate the program-derived address for a subscription plan.

**Parameters:**
- `provider` (string): Provider's public key
- `planId` (string): Plan ID

### `get_period_durations`
Get available period duration constants.

**Parameters:** None

### `get_wallet_info`
Get information about the current wallet.

**Parameters:** None

## Architecture

### Project Structure

```
src/
├── client/
│   └── subscription-client.ts    # Solana program client using generated types
├── tools/
│   └── subscription-tools.ts     # MCP tool implementations
├── utils/
│   ├── types.ts                  # MCP server type definitions
│   └── subscription-helpers.ts   # Helper functions and constants
└── index.ts                      # Main MCP server
```

### Key Components

- **SolanaSubscriptionClient**: Handles all interactions with the Solana program using Anchor's generated types
- **SubscriptionTools**: Implements MCP tool interfaces and error handling
- **Utils**: Modular utilities for the MCP server:
  - `types.ts`: Interface definitions for the MCP server (distinct from Anchor types)
  - `subscription-helpers.ts`: Reusable functions for PDA generation, validation, and formatting

## TypeScript Integration Best Practices

This project follows Anchor's recommended TypeScript client patterns:

1. **Direct IDL and Type Imports**: Uses `import type { Subs3 } from "target/types/subs3"` and `import idl from "target/idl/subs3.json"`
2. **Properly Typed Program**: Uses `Program<Subs3>` instead of `Program<any>` for full type safety
3. **Generated Types Only**: No custom interface definitions that duplicate Anchor's generated types
4. **Relative Path References**: IDL and types are imported directly from the Anchor build output

## File Organization Best Practices

This project follows a clean, modular structure where:

1. **No duplication of generated files**: IDL and types are imported directly from Anchor's output
2. **Focused utility modules**: Utilities are split by purpose rather than monolithic files
3. **Clear separation**: Client logic, tool implementations, and utilities are in separate directories
4. **Type safety**: Full TypeScript integration with Anchor's generated types

## Common Period Durations

The server provides predefined period durations:

- `MINUTE`: 60 seconds
- `HOUR`: 3,600 seconds  
- `DAILY`: 86,400 seconds
- `WEEKLY`: 604,800 seconds
- `MONTHLY`: 2,592,000 seconds
- `YEARLY`: 31,536,000 seconds

## Error Handling

All tools return structured responses with:
- `success`: Boolean indicating operation result
- `message`: Human-readable description
- `data`: Operation result data (on success)

Failed operations include helpful error messages to aid in debugging.

## Development

### Adding New Tools

1. Add the tool schema to `tools/subscription-tools.ts`
2. Implement the tool method in the `SubscriptionTools` class
3. Add the corresponding client method to `SolanaSubscriptionClient` if needed
4. Register the tool in the main `index.ts` file

### Testing

You can test the server manually or integrate it with MCP-compatible applications like Claude Desktop.

## Security Considerations

- Store private keys securely and never commit them to version control
- Use environment variables for sensitive configuration
- Consider using hardware wallets or key management services in production
- Validate all inputs before sending transactions

## Support

For issues related to the Solana program itself, refer to the main project documentation.
For MCP server specific issues, check the implementation in this directory.
