"use server";

import { z } from "zod";

import { signIn } from "./auth";
import { PublicKey } from "@solana/web3.js";

const authFormWalletSchema = z.object({
  walletAddress: z.string().refine(
    (address) => {
      try {
        new PublicKey(address);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid Solana public key" }
  ),
  signature: z.string().min(1, "Signature is required"),
  message: z.string().min(1, "Message is required"),
});


export interface LoginActionState {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
}

export const loginWithWallet = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormWalletSchema.parse({
      walletAddress: formData.get("walletAddress"),
      signature: formData.get("signature"),
      message: formData.get("message"),
    });

    await signIn('solana-wallet', {
      walletAddress: validatedData.walletAddress,
      signature: validatedData.signature,
      message: validatedData.message,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};
