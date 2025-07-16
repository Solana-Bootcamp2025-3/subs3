import NextAuth, { User, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { createWalletUser, getUserByWalletAddress } from "@/db/queries";

import { authConfig } from "./auth.config";
import { PublicKey } from "@solana/web3.js";

import nacl from "tweetnacl";

interface ExtendedSession extends Session {
  user: User & { id: string; walletAddress?: string; authType?: "email" | "wallet" };
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    /*Credentials({
      id: "email-password",
      credentials: {},
      async authorize({ email, password }: any) {
        let users = await getUser(email);
        if (users.length === 0) return null;
        let passwordsMatch = await compare(password, users[0].password!);
        if (passwordsMatch) return users[0] as any;
      },
    }),*/
    // Solana Wallet authentication
    Credentials({
      id: "solana-wallet",
      credentials: {},
      async authorize({ walletAddress, signature, message }: any) {
        // Verify the signature
        const publicKey = new PublicKey(walletAddress);
        const signatureBuffer = Buffer.from(signature, "base64");
        const messageBuffer = new TextEncoder().encode(message);

        const isValid = nacl.sign.detached.verify(
          messageBuffer,
          signatureBuffer,
          publicKey.toBuffer()
        );

        if (!isValid) {
          console.error("Signature verification failed");
          return null;
        }

        // Check if user exists
        let users = await getUserByWalletAddress(walletAddress);
        console.log("Found users:", users);
        
        if (users.length === 0) {
          console.log("No user found, creating new wallet user");
          // Create new wallet user
          const newUsers = await createWalletUser(walletAddress);
          if (newUsers.length === 0) {
            console.error("Failed to create new wallet user");
            return null;
          }
          return newUsers[0] as any;
        }

        return users[0] as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.walletAddress = user.walletAddress;
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.walletAddress = token.walletAddress;
      }

      return session;
    },
  },
});
