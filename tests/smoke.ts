import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import type { Subs3 } from "../target/types/subs3";
import { assert } from "chai";
import { Keypair } from "@solana/web3.js";
import fs from "fs";
import os from "os";
// Note: We'll skip client import for smoke test to avoid MCP dependencies

describe("Basic Smoke Tests", () => {
  // Set up provider with default values if environment variables are not set
  const rpcUrl = process.env.ANCHOR_PROVIDER_URL || "http://localhost:8899";
  let walletPath = process.env.ANCHOR_WALLET || "~/.config/solana/id.json";
  
  // Expand tilde to home directory
  if (walletPath.startsWith("~/")) {
    walletPath = walletPath.replace("~", os.homedir());
  }
  
  // Set environment variables if not already set
  if (!process.env.ANCHOR_PROVIDER_URL) {
    process.env.ANCHOR_PROVIDER_URL = rpcUrl;
  }
  if (!process.env.ANCHOR_WALLET) {
    process.env.ANCHOR_WALLET = walletPath;
  }

  // Create a test wallet if the default one doesn't exist
  if (!fs.existsSync(walletPath)) {
    console.log(`Creating test wallet at ${walletPath}`);
    const testKeypair = Keypair.generate();
    const dir = walletPath.substring(0, walletPath.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(walletPath, JSON.stringify(Array.from(testKeypair.secretKey)));
  }

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.subs3 as Program<Subs3>;

  it("Should load program successfully", () => {
    assert.isDefined(program);
    assert.isDefined(program.programId);
    console.log("Program ID:", program.programId.toBase58());
  });

  it("Should have correct program interface", () => {
    // Verify program has the expected methods
    assert.isDefined(program.methods.initializeManager);
    assert.isDefined(program.methods.createSubscriptionPlan);
    assert.isDefined(program.methods.subscribe);
    assert.isDefined(program.methods.processPayment);
    
    // Verify program has the expected accounts
    assert.isDefined(program.account.subscriptionManager);
    assert.isDefined(program.account.subscriptionPlan);
    assert.isDefined(program.account.subscription);
  });

  /*it("Should be able to create subscription client", () => {
    // This test verifies that the client can be instantiated
    // even if we don't have all the required env vars for actual operations
    try {
      const client = new SolanaSubscriptionClient({
        rpcUrl: "http://localhost:8899",
        programId: program.programId.toBase58(),
        privateKey: "fake-key-for-testing" // This will fail on actual operations but that's ok for this test
      });
      
      // If we get here without throwing, the client was created successfully
      assert.isDefined(client);
    } catch (error) {
      // This is expected since we're using a fake private key
      assert.include(error.message, "Invalid");
    }
  });*/

  it("Should be able to access program constants", () => {
    // These should be accessible from the IDL
    assert.isDefined(program.programId);
    assert.equal(program.programId.toBase58(), "4vWTjxHPJx6YzWeMfmimgeA2cMcyC9kXg3jqCq93mmo2");
  });
});
