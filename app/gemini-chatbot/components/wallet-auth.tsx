'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useActionState, useEffect, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Session } from "next-auth"
import { LoginActionState, loginWithWallet } from '@/app/(auth)/actions';
import { useRouter } from 'next/navigation';
import nacl from "tweetnacl";
import dynamic from 'next/dynamic';

interface WalletAuthProps {
  onAuthSuccess?: (walletAddress: string) => void;
  onAuthError?: (error: string) => void;
  session: Session | null;
}

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);


export function WalletAuth({ onAuthSuccess, onAuthError, session }: WalletAuthProps) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    loginWithWallet,
    {
      status: "idle",
    },
  );

  useEffect(() => {
    if (state.status === "failed") {
      toast.error("Invalid credentials!");
    } else if (state.status === "invalid_data") {
      toast.error("Failed validating your submission!");
    } else if (state.status === "success") {
      router.refresh();
    }
  }, [state.status, router]);

  // Auto-authenticate when wallet connects
  /*useEffect(() => {
    if (connected && publicKey && !session?.user?.walletAddress) {
      handleWalletAuth();
    }
  }, [connected, publicKey, session]);*/

  const handleWalletAuth = async () => {
    if (!publicKey || !signMessage) {
      onAuthError?.('Wallet not connected or does not support message signing');
      return;
    }

    setIsLoading(true);
    try {
      // Create a message to sign for verification
      const message = `Sign this message to authenticate with Subs3. Wallet: ${publicKey.toBase58()}. Timestamp: ${Date.now()}.`;
      const encodedMessage = new TextEncoder().encode(message);

      // Sign the message
      const signature = await signMessage(encodedMessage);

      // Prepare form data for NextAuth
      const formData = new FormData();
      formData.append('walletAddress', publicKey.toBase58());
      formData.append('signature', Buffer.from(signature).toString('base64'));
      formData.append('message', message);
      
      formAction(formData);

      onAuthSuccess?.(publicKey.toBase58());
    } catch (error) {
      console.error('Wallet authentication error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to authenticate with wallet';
      onAuthError?.(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    await signOut({ redirect: false });
  };

  if (session?.user?.walletAddress) {
    return (
      <div className="w-full max-w-md border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Wallet Connected</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Authenticated with Solana wallet
          </p>
        </div>
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Connected Wallet:
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 font-mono">
              {session.user.walletAddress}
            </p>
          </div>
          <Button
            onClick={handleDisconnect}
            variant="outline"
            className="w-full"
          >
            Disconnect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connect Wallet</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Connect your Solana wallet to access subscription management
        </p>
      </div>
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <WalletMultiButtonDynamic className=" !bg-blue-600 hover:!bg-blue-700" />
          
          {connected && publicKey && (
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Wallet Connected:
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-mono">
                  {publicKey.toBase58()}
                </p>
              </div>
              
              <Button
                onClick={handleWalletAuth}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Authenticating...' : 'Authenticate with Wallet'}
              </Button>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Supported wallets: Phantom, Solflare, Backpack, and more
          </p>
        </div>
      </div>
    </div>
  );
}

export default WalletAuth;
