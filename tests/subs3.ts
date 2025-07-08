import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import type { Subs3 } from "../target/types/subs3";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram,
  TransactionConfirmationStrategy
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";
import { SolanaSubscriptionClient } from "@subs3-mcp/client/subscription-client";
import { 
  createTestAccounts,
  derivePdas,
  createTestPlan,
  createTestSubscription,
  DEFAULT_TEST_PLAN
} from "./utils/test-helpers";
import {
  SUBSCRIPTION_PLAN_SEED,
  SUBSCRIPTION_SEED,
  PROVIDER_VAULT_SEED,
  SHORT_PERIOD_PLAN_ID,
  SHORT_PERIOD_PRICE,
  SHORT_PERIOD_MAX_SUBSCRIBERS,
  LONG_PERIOD_PLAN_ID,
  LONG_PERIOD_PRICE,
  ONE_SECOND,
  TEST_WAIT_TIME,
  CLIENT_TEST_PLAN_ID,
  CLIENT_PLAN_PRICE,
  CLIENT_PLAN_MAX_SUBSCRIBERS,
  ONE_DAY_SECONDS,
  SOL_AIRDROP_AMOUNT,
  PAYMENT_NOT_DUE_ERROR,
  UNAUTHORIZED_ERROR,
  MAX_SEED_LENGTH_ERROR,
  PLAN_ID_TOO_LONG_ERROR
} from "./utils/constants";
import os from "os";

describe("Subs3 Program Integration Tests", () => {
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

  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.subs3 as Program<Subs3>;
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  // Test accounts
  let subscriptionManagerPda: PublicKey;
  let subscriptionPlanPda: PublicKey;
  let providerVaultPda: PublicKey;
  let subscriptionPda: PublicKey;
  let paymentTokenMint: PublicKey;
  let providerTokenAccount: PublicKey;
  let subscriberTokenAccount: PublicKey;
  
  // Test keypairs
  let provider1: Keypair;
  let subscriber1: Keypair;
  let subscriber2: Keypair;

  // Client for integration testing
  let subscriptionClient: SolanaSubscriptionClient;

  before(async () => {
    // Create and fund test accounts using helper
    const testAccounts = await createTestAccounts(connection, wallet.payer);
    provider1 = testAccounts.provider;
    subscriber1 = testAccounts.subscriber;
    subscriber2 = Keypair.generate(); // Additional subscriber for multi-user tests
    paymentTokenMint = testAccounts.paymentTokenMint;
    providerTokenAccount = testAccounts.providerTokenAccount;
    subscriberTokenAccount = testAccounts.subscriberTokenAccount;

    // Fund additional subscriber
    const subscriber2Airdrop = await connection.requestAirdrop(subscriber2.publicKey, SOL_AIRDROP_AMOUNT);
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: subscriber2Airdrop,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });

    // Derive PDAs using helper
    const pdas = derivePdas(program.programId, provider1.publicKey, subscriber1.publicKey, DEFAULT_TEST_PLAN.planId);
    subscriptionManagerPda = pdas.subscriptionManagerPda;
    subscriptionPlanPda = pdas.subscriptionPlanPda;
    providerVaultPda = pdas.providerVaultPda;
    subscriptionPda = pdas.subscriptionPda;

    // Initialize subscription client for integration tests
    subscriptionClient = new SolanaSubscriptionClient({
      rpcUrl: "http://localhost:8899",
      programId: program.programId.toBase58(),
      privateKey: Buffer.from(provider1.secretKey).toString('base64')
    });
  });

  describe("Direct Program Testing", () => {
    let initialProvidersCount: number;
    let initialSubscriptionsCount: number;

    before(async () => {
      // Get initial state if manager exists
      try {
        const initialManagerState = await program.account.subscriptionManager.fetch(subscriptionManagerPda);
        initialProvidersCount = initialManagerState.totalProviders.toNumber();
        initialSubscriptionsCount = initialManagerState.totalSubscriptions.toNumber();
      } catch (error) {
        // Manager doesn't exist yet
        initialProvidersCount = 0;
        initialSubscriptionsCount = 0;
      }
    });

    it("Should initialize subscription manager", async () => {
      // Check if manager is already initialized
      try {
        await program.account.subscriptionManager.fetch(subscriptionManagerPda);
        console.log("Manager already initialized, skipping...");
        return;
      } catch (error) {
        // Manager doesn't exist, proceed with initialization
      }

      const tx = await program.methods
        .initializeManager()
        .accountsStrict({
          subscriptionManager: subscriptionManagerPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      console.log("Initialize manager transaction:", tx);

      // Verify manager state
      const managerAccount = await program.account.subscriptionManager.fetch(subscriptionManagerPda);
      assert.equal(managerAccount.authority.toBase58(), wallet.publicKey.toBase58());
      assert.equal(managerAccount.totalProviders.toNumber(), 0);
      assert.equal(managerAccount.totalSubscriptions.toNumber(), 0);
      
      // Update initial state for other tests
      initialProvidersCount = 0;
      initialSubscriptionsCount = 0;
    });

    it("Should create a subscription plan", async () => {
      const tx = await createTestPlan(program, {
        provider: provider1,
        subscriptionManagerPda,
        subscriptionPlanPda,
        providerVaultPda,
        paymentTokenMint,
        planParams: {
          planId: DEFAULT_TEST_PLAN.planId,
          name: DEFAULT_TEST_PLAN.name,
          description: DEFAULT_TEST_PLAN.description,
          pricePerPeriod: DEFAULT_TEST_PLAN.pricePerPeriod,
          periodDurationSeconds: DEFAULT_TEST_PLAN.periodDurationSeconds,
          maxSubscribers: DEFAULT_TEST_PLAN.maxSubscribers
        }
      });

      console.log("Create subscription plan transaction:", tx);

      // Verify plan state
      const planAccount = await program.account.subscriptionPlan.fetch(subscriptionPlanPda);
      assert.equal(planAccount.provider.toBase58(), provider1.publicKey.toBase58());
      assert.equal(planAccount.planId, DEFAULT_TEST_PLAN.planId);
      assert.equal(planAccount.name, DEFAULT_TEST_PLAN.name);
      assert.equal(planAccount.description, DEFAULT_TEST_PLAN.description);
      assert.equal(planAccount.pricePerPeriod.toNumber(), DEFAULT_TEST_PLAN.pricePerPeriod.toNumber());
      assert.equal(planAccount.periodDurationSeconds.toNumber(), DEFAULT_TEST_PLAN.periodDurationSeconds.toNumber());
      assert.equal(planAccount.maxSubscribers, DEFAULT_TEST_PLAN.maxSubscribers);
      assert.equal(planAccount.currentSubscribers, 0);
      assert.equal(planAccount.totalRevenue.toNumber(), 0);
      assert.equal(planAccount.isActive, true);

      // Verify manager state updated - check if this is the first provider or additional
      const managerAccount = await program.account.subscriptionManager.fetch(subscriptionManagerPda);
      const currentProviders = managerAccount.totalProviders.toNumber();
      
      // Could be first provider (1) or additional provider (> initial count)
      assert.isTrue(
        currentProviders === 1 || currentProviders > initialProvidersCount,
        `Expected providers to be 1 or > ${initialProvidersCount}, got ${currentProviders}`
      );
    });

    it("Should allow subscription to a plan", async () => {
      const tx = await createTestSubscription(program, {
        subscriber: subscriber1,
        subscriptionPda,
        subscriptionPlanPda,
        subscriptionManagerPda
      });

      console.log("Subscribe transaction:", tx);

      // Verify subscription state
      const subscriptionAccount = await program.account.subscription.fetch(subscriptionPda);
      assert.equal(subscriptionAccount.subscriber.toBase58(), subscriber1.publicKey.toBase58());
      assert.equal(subscriptionAccount.subscriptionPlan.toBase58(), subscriptionPlanPda.toBase58());
      assert.equal(subscriptionAccount.isActive, true);
      assert.equal(subscriptionAccount.isPaused, false);
      assert.equal(subscriptionAccount.totalPaymentsMade, 0);
      assert.equal(subscriptionAccount.totalAmountPaid.toNumber(), 0);

      // Verify plan updated
      const planAccount = await program.account.subscriptionPlan.fetch(subscriptionPlanPda);
      assert.equal(planAccount.currentSubscribers, 1);

      // Verify manager updated
      const managerAccount = await program.account.subscriptionManager.fetch(subscriptionManagerPda);
      assert.equal(managerAccount.totalSubscriptions.toNumber(), initialSubscriptionsCount + 1);
    });

    it("Should process payment for subscription while due", async () => {
      // Create a plan with very short period for immediate payment testing
      const shortPeriodPlan = {
        planId: SHORT_PERIOD_PLAN_ID,
        name: "Short Period Plan",
        description: "A plan with short period for testing",
        pricePerPeriod: new BN(SHORT_PERIOD_PRICE),
        periodDurationSeconds: new BN(ONE_SECOND),
        maxSubscribers: SHORT_PERIOD_MAX_SUBSCRIBERS
      };

      const [shortPlanPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(SUBSCRIPTION_PLAN_SEED),
          provider1.publicKey.toBuffer(),
          Buffer.from(shortPeriodPlan.planId)
        ],
        program.programId
      );

      const [shortVaultPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(PROVIDER_VAULT_SEED),
          provider1.publicKey.toBuffer(),
          Buffer.from(shortPeriodPlan.planId)
        ],
        program.programId
      );

      const [shortSubscriptionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(SUBSCRIPTION_SEED),
          subscriber1.publicKey.toBuffer(),
          shortPlanPda.toBuffer()
        ],
        program.programId
      );

      // Create the short period plan
      await createTestPlan(program, {
        provider: provider1,
        subscriptionManagerPda,
        subscriptionPlanPda: shortPlanPda,
        providerVaultPda: shortVaultPda,
        paymentTokenMint,
        planParams: shortPeriodPlan
      });

      // Create subscription to the short period plan
      await createTestSubscription(program, {
        subscriber: subscriber1,
        subscriptionPda: shortSubscriptionPda,
        subscriptionPlanPda: shortPlanPda,
        subscriptionManagerPda
      });

      // Wait for payment to be due
      await new Promise(resolve => setTimeout(resolve, TEST_WAIT_TIME));

      const tx = await program.methods
        .processPayment()
        .accountsStrict({
          subscription: shortSubscriptionPda,
          subscriptionPlan: shortPlanPda,
          subscriberTokenAccount: subscriberTokenAccount,
          providerVault: shortVaultPda,
          subscriber: subscriber1.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID
        })
        .signers([subscriber1])
        .rpc();

      console.log("Process payment transaction:", tx);

      // Verify subscription state updated
      const subscriptionAccount = await program.account.subscription.fetch(shortSubscriptionPda);
      assert.equal(subscriptionAccount.totalPaymentsMade, 1);
      assert.equal(subscriptionAccount.totalAmountPaid.toNumber(), shortPeriodPlan.pricePerPeriod.toNumber());
      assert.equal(subscriptionAccount.paymentNonce.toNumber(), 1);

      // Verify plan revenue updated
      const planAccount = await program.account.subscriptionPlan.fetch(shortPlanPda);
      assert.equal(planAccount.totalRevenue.toNumber(), shortPeriodPlan.pricePerPeriod.toNumber());
    });

    it("Should payment fail when payment is not due yet", async () => {
      // Create a plan with long period duration so payment won't be due immediately
      const longPeriodPlan = {
        planId: LONG_PERIOD_PLAN_ID,
        name: "Long Period Plan", 
        description: "A plan with long period for testing payment not due",
        pricePerPeriod: new BN(LONG_PERIOD_PRICE),
        periodDurationSeconds: new BN(ONE_DAY_SECONDS), // 24 hours
        maxSubscribers: 10
      };

      const [longPlanPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(SUBSCRIPTION_PLAN_SEED),
          provider1.publicKey.toBuffer(),
          Buffer.from(longPeriodPlan.planId)
        ],
        program.programId
      );

      const [longVaultPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(PROVIDER_VAULT_SEED),
          provider1.publicKey.toBuffer(),
          Buffer.from(longPeriodPlan.planId)
        ],
        program.programId
      );

      const [longSubscriptionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(SUBSCRIPTION_SEED),
          subscriber1.publicKey.toBuffer(),
          longPlanPda.toBuffer()
        ],
        program.programId
      );

      // Create the long period plan
      await createTestPlan(program, {
        provider: provider1,
        subscriptionManagerPda,
        subscriptionPlanPda: longPlanPda,
        providerVaultPda: longVaultPda,
        paymentTokenMint,
        planParams: longPeriodPlan
      });

      // Create subscription to the long period plan
      await createTestSubscription(program, {
        subscriber: subscriber1,
        subscriptionPda: longSubscriptionPda,
        subscriptionPlanPda: longPlanPda,
        subscriptionManagerPda
      });

      // Try to process payment immediately (should fail since payment not due for 24 hours)
      try {
        await program.methods
          .processPayment()
          .accountsStrict({
            subscription: longSubscriptionPda,
            subscriptionPlan: longPlanPda,
            subscriberTokenAccount: subscriberTokenAccount,
            providerVault: longVaultPda,
            subscriber: subscriber1.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID
          })
          .signers([subscriber1])
          .rpc();
        
        assert.fail("Expected transaction to fail with PaymentNotDue error");
      } catch (error) {
        assert.include(error.toString(), PAYMENT_NOT_DUE_ERROR);
        console.log("Payment not due error correctly thrown:", error.message);
      }
    });

    it("Should fail when provider tries to subscribe to own plan", async () => {
      const [providerSubscriptionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(SUBSCRIPTION_SEED),
          provider1.publicKey.toBuffer(),
          subscriptionPlanPda.toBuffer()
        ],
        program.programId
      );

      try {
        await program.methods
          .subscribe()
          .accountsStrict({
            subscription: providerSubscriptionPda,
            subscriptionPlan: subscriptionPlanPda,
            subscriptionManager: subscriptionManagerPda,
            subscriber: provider1.publicKey,
            systemProgram: SystemProgram.programId
          })
          .signers([provider1])
          .rpc();
        
        assert.fail("Expected transaction to fail");
      } catch (error) {
        assert.include(error.toString(), UNAUTHORIZED_ERROR);
      }
    });

    it("Should fail when creating plan with invalid parameters", async () => {
      const invalidPlanId = "invalid-plan-too-long-id-that-exceeds-limit";
      
      try {
        const [invalidPlanPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from(SUBSCRIPTION_PLAN_SEED),
            provider1.publicKey.toBuffer(),
            Buffer.from(invalidPlanId)
          ],
          program.programId
        );

        const [invalidVaultPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from(PROVIDER_VAULT_SEED),
            provider1.publicKey.toBuffer(),
            Buffer.from(invalidPlanId)
          ],
          program.programId
        );

        await program.methods
          .createSubscriptionPlan(
            invalidPlanId,
            DEFAULT_TEST_PLAN.name,
            DEFAULT_TEST_PLAN.description,
            DEFAULT_TEST_PLAN.pricePerPeriod,
            DEFAULT_TEST_PLAN.periodDurationSeconds,
            DEFAULT_TEST_PLAN.maxSubscribers
          )
          .accountsStrict({
            provider: provider1.publicKey,
            subscriptionManager: subscriptionManagerPda,
            subscriptionPlan: invalidPlanPda,
            providerVault: invalidVaultPda,
            paymentTokenMint: paymentTokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId
          })
          .signers([provider1])
          .rpc();
        
        assert.fail("Expected transaction to fail");
      } catch (error) {
        // The error should be about max seed length or plan ID being too long
        assert.isTrue(
          error.toString().includes(MAX_SEED_LENGTH_ERROR) || 
          error.toString().includes(PLAN_ID_TOO_LONG_ERROR),
          `Expected seed length or plan ID error, got: ${error.toString()}`
        );
      }
    });
  });

  describe("Client Integration Testing", () => {
    it("Should initialize manager using client", async () => {
      // Skip if already initialized
      const isInitialized = await subscriptionClient.isManagerInitialized();
      if (isInitialized) {
        console.log("Manager already initialized, skipping...");
        return;
      }

      const result = await subscriptionClient.initializeManager();
      assert.isString(result.signature);
      assert.isString(result.managerAddress);
      console.log("Client initialize manager result:", result);
    });

    it("Should create subscription plan using client", async () => {
      const params = {
        planId: CLIENT_TEST_PLAN_ID,
        name: "Client Test Plan",
        description: "A subscription plan created via client",
        pricePerPeriod: CLIENT_PLAN_PRICE,
        periodDurationSeconds: ONE_DAY_SECONDS,
        paymentTokenMint: paymentTokenMint.toBase58(),
        maxSubscribers: CLIENT_PLAN_MAX_SUBSCRIBERS
      };

      const result = await subscriptionClient.createSubscriptionPlan(params);
      assert.isString(result.signature);
      assert.isString(result.planAddress);
      assert.isString(result.vaultAddress);
      console.log("Client create plan result:", result);

      // Verify plan exists
      const planData = await subscriptionClient.getSubscriptionPlan(result.planAddress);
      assert.equal(planData.planId, params.planId);
      assert.equal(planData.name, params.name);
    });

    it("Should get provider plans using client", async () => {
      const plans = await subscriptionClient.getProviderPlans();
      assert.isArray(plans);
      assert.isAtLeast(plans.length, 1);
      console.log("Provider plans:", plans.length);
    });

    it("Should get subscription manager data using client", async () => {
      const managerData = await subscriptionClient.getSubscriptionManager();
      assert.isAtLeast(managerData.totalProviders.toNumber(), 1);
      assert.isAtLeast(managerData.totalSubscriptions.toNumber(), 0);
      console.log("Manager data:", managerData);
    });
  });

  describe("Error Handling", () => {
    it("Should handle non-existent plan gracefully", async () => {
      const nonExistentPlan = Keypair.generate().publicKey.toBase58();
      
      try {
        await subscriptionClient.getSubscriptionPlan(nonExistentPlan);
        assert.fail("Expected to throw error");
      } catch (error) {
        assert.include(error.message, "Failed to fetch subscription plan");
      }
    });

    it("Should validate plan parameters", async () => {
      const invalidParams = {
        planId: "", // Empty plan ID
        name: "Test Plan",
        description: "Test description",
        pricePerPeriod: 1000000,
        periodDurationSeconds: 86400,
        paymentTokenMint: paymentTokenMint.toBase58()
      };

      try {
        await subscriptionClient.createSubscriptionPlan(invalidParams);
        assert.fail("Expected to throw error");
      } catch (error) {
        assert.include(error.message, "Invalid plan ID");
      }
    });
  });
});
