import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Subs3 } from "../target/types/subs3";

describe("subs3", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.subs3 as Program<Subs3>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initializeManager().rpc();
    console.log("Your transaction signature", tx);
  });
});
