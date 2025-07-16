import { useState } from "react";
import { CheckCircle, XCircle, Clock, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { Message, CreateMessage } from "ai";

interface TransactionSigningProps {
  data?: {
    success: boolean;
    message: string;
    requiresSignature?: boolean;
    data?: {
      transactionType: string;
      serializedTransaction: string;
      instructions: string;
      authority?: string;
      provider?: string;
      subscriber?: string;
      planAddress?: string;
      vaultAddress?: string;
      subscriptionAddress?: string;
      amount?: string;
      metadata?: any;
    };
  };
  append?: (message: Message | CreateMessage) => Promise<string | null | undefined>;
}

export const TransactionSigning = ({ data, append }: TransactionSigningProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [signedTransaction, setSignedTransaction] = useState<string | null>(null);
  const [transactionMetadata, setTransactionMetadata] = useState<any>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-zinc-300 dark:bg-zinc-600 rounded w-32"></div>
        </div>
      </div>
    );
  }

  const handleCopyTransaction = () => {
    if (data.data?.serializedTransaction) {
      navigator.clipboard.writeText(data.data.serializedTransaction);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // Check if Phantom wallet is available
      if (typeof window !== 'undefined' && (window as any).solana) {
        const wallet = (window as any).solana;
        if (wallet.isPhantom) {
          await wallet.connect();
          setIsConnecting(false);
          return wallet;
        }
      }
      
      // If no wallet found, show error
      setError("No Solana wallet found. Please install Phantom or another Solana wallet.");
      setIsConnecting(false);
      return null;
    } catch (error) {
      setError(`Failed to connect wallet: ${error instanceof Error ? error.message : String(error)}`);
      setIsConnecting(false);
      return null;
    }
  };

  const handleSignTransaction = async () => {
    setIsSigning(true);
    setError(null);
    
    try {
      const wallet = await handleConnectWallet();
      if (!wallet || !data.data) {
        setIsSigning(false);
        return;
      }

      // Deserialize the transaction
      const transactionBuffer = Buffer.from(data.data.serializedTransaction, 'base64');
      const { Transaction } = await import('@solana/web3.js');
      const transaction = Transaction.from(transactionBuffer);
      
      // Sign the transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      const signedTransactionBase64 = Buffer.from(signedTransaction.serialize()).toString('base64');
      
      // Store the signed transaction in the component state for display
      setSignedTransaction(signedTransactionBase64);
      setTransactionMetadata(data.data.metadata);
      
      setIsSigning(false);
    } catch (error) {
      setError(`Failed to sign transaction: ${error instanceof Error ? error.message : String(error)}`);
      setIsSigning(false);
    }
  };

  const handleExecuteTransaction = () => {
    if (signedTransaction && transactionMetadata) {
      if (append) {
        // Create a formatted message for the chat
        const executeMessage = `🚀 **Execute Signed Transaction**

**Transaction Type:** ${getTransactionTypeLabel(data.data?.transactionType || '')}
**Signed Transaction:** ${signedTransaction}

${transactionMetadata ? `**Metadata:**\n\`\`\`json\n${JSON.stringify(transactionMetadata, null, 2)}\n\`\`\`` : ''}

Please execute this signed transaction.`;

        // Send the message to the chat
        append({
          role: 'user',
          content: executeMessage,
        });
      } else {
        // Fallback to clipboard copy if append is not available
        const executePrompt = `Execute this signed transaction:
Transaction Type: ${data.data?.transactionType}
Signed Transaction: ${signedTransaction}
Metadata: ${JSON.stringify(transactionMetadata)}

Please execute this transaction.`;
        
        navigator.clipboard.writeText(executePrompt);
        alert('Execute command copied to clipboard. Paste it in the chat to execute the transaction.');
      }
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'initialize_manager':
        return 'Initialize Manager';
      case 'create_subscription_plan':
        return 'Create Subscription Plan';
      case 'subscribe':
        return 'Subscribe to Plan';
      case 'process_payment':
        return 'Process Payment';
      default:
        return type;
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        {data.success ? (
          <Clock className="w-5 h-5 text-blue-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
          {data.data ? getTransactionTypeLabel(data.data.transactionType) : 'Transaction'}
        </h3>
        {data.requiresSignature && (
          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
            Requires Signature
          </span>
        )}
      </div>
      
      <p className="text-zinc-600 dark:text-zinc-400 mb-4">{data.message}</p>
      
      {data.data && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                {data.data.instructions}
              </p>
            </div>
          </div>
          
          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Type:</span>
              <p className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
                {getTransactionTypeLabel(data.data.transactionType)}
              </p>
            </div>
            
            {data.data.authority && (
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Authority:</span>
                <p 
                  className="font-mono text-sm text-zinc-800 dark:text-zinc-200 truncate cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 px-1 -mx-1 rounded transition-colors"
                  onClick={() => data.data?.authority && handleCopyAddress(data.data.authority)}
                  title="Click to copy address"
                >
                  {data.data.authority}
                  {copiedAddress === data.data.authority && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">Copied!</span>
                  )}
                </p>
              </div>
            )}
            
            {data.data.provider && (
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Provider:</span>
                <p 
                  className="font-mono text-sm text-zinc-800 dark:text-zinc-200 truncate cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 px-1 -mx-1 rounded transition-colors"
                  onClick={() => data.data?.provider && handleCopyAddress(data.data.provider)}
                  title="Click to copy address"
                >
                  {data.data.provider}
                  {copiedAddress === data.data.provider && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">Copied!</span>
                  )}
                </p>
              </div>
            )}
            
            {data.data.subscriber && (
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Subscriber:</span>
                <p 
                  className="font-mono text-sm text-zinc-800 dark:text-zinc-200 truncate cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 px-1 -mx-1 rounded transition-colors"
                  onClick={() => data.data?.subscriber && handleCopyAddress(data.data.subscriber)}
                  title="Click to copy address"
                >
                  {data.data.subscriber}
                  {copiedAddress === data.data.subscriber && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">Copied!</span>
                  )}
                </p>
              </div>
            )}
            
            {data.data.planAddress && (
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Plan Address:</span>
                <p 
                  className="font-mono text-sm text-zinc-800 dark:text-zinc-200 truncate cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 px-1 -mx-1 rounded transition-colors"
                  onClick={() => data.data?.planAddress && handleCopyAddress(data.data.planAddress)}
                  title="Click to copy address"
                >
                  {data.data.planAddress}
                  {copiedAddress === data.data.planAddress && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">Copied!</span>
                  )}
                </p>
              </div>
            )}
            
            {data.data.vaultAddress && (
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Vault Address:</span>
                <p 
                  className="font-mono text-sm text-zinc-800 dark:text-zinc-200 truncate cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 px-1 -mx-1 rounded transition-colors"
                  onClick={() => data.data?.vaultAddress && handleCopyAddress(data.data.vaultAddress)}
                  title="Click to copy address"
                >
                  {data.data.vaultAddress}
                  {copiedAddress === data.data.vaultAddress && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">Copied!</span>
                  )}
                </p>
              </div>
            )}
            
            {data.data.subscriptionAddress && (
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Subscription Address:</span>
                <p 
                  className="font-mono text-sm text-zinc-800 dark:text-zinc-200 truncate cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 px-1 -mx-1 rounded transition-colors"
                  onClick={() => data.data?.subscriptionAddress && handleCopyAddress(data.data.subscriptionAddress)}
                  title="Click to copy address"
                >
                  {data.data.subscriptionAddress}
                  {copiedAddress === data.data.subscriptionAddress && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">Copied!</span>
                  )}
                </p>
              </div>
            )}
            
            {data.data.amount && (
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Amount:</span>
                <p className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
                  {data.data.amount} tokens
                </p>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            {!signedTransaction ? (
              <>
                <button
                  onClick={handleSignTransaction}
                  disabled={isSigning || isConnecting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                >
                  {isSigning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing...
                    </>
                  ) : isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Sign Transaction
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleCopyTransaction}
                  className="px-4 py-2 bg-zinc-500 hover:bg-zinc-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy TX'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleExecuteTransaction}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {append ? 'Send to Chat' : 'Execute Transaction'}
                </button>
              </>
            )}
          </div>
          
          {/* Show signed transaction info */}
          {signedTransaction && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Transaction Signed Successfully
                </span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                Your transaction has been signed and is ready to execute. Click "{append ? 'Send to Chat' : 'Execute Transaction'}" to {append ? 'send the execution request directly to the chat' : 'copy the execute command to your clipboard'}.
              </p>
              <div className="text-xs text-green-600 dark:text-green-400 font-mono break-all">
                {signedTransaction.substring(0, 100)}...
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface TransactionExecutionProps {
  data?: {
    success: boolean;
    message: string;
    data?: {
      signature: string;
      transactionType: string;
      confirmed: boolean;
      [key: string]: any;
    };
  };
}

export const TransactionExecution = ({ data }: TransactionExecutionProps) => {
  const [copied, setCopied] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-zinc-300 dark:bg-zinc-600 rounded w-32"></div>
        </div>
      </div>
    );
  }

  const handleCopySignature = () => {
    if (data.data?.signature) {
      navigator.clipboard.writeText(data.data.signature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleViewOnExplorer = () => {
    if (data.data?.signature) {
      const url = `https://explorer.solana.com/tx/${data.data.signature}?cluster=devnet`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        {data.success ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
          Transaction Executed
        </h3>
        {data.data?.confirmed && (
          <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
            Confirmed
          </span>
        )}
      </div>
      
      <p className="text-zinc-600 dark:text-zinc-400 mb-4">{data.message}</p>
      
      {data.data && (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 break-words">
                <span className="text-sm text-green-600 dark:text-green-400">Transaction Signature:</span>
                <p 
                  className="font-mono text-sm text-green-800 dark:text-green-200 truncate cursor-pointer hover:bg-green-100 dark:hover:bg-green-800 p-1 px-1 -mx-1 rounded transition-colors"
                  onClick={handleCopySignature}
                  title="Click to copy signature"
                >
                  {data.data.signature}
                  {copied && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">Copied!</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 ml-2">
                <button
                  onClick={handleCopySignature}
                  className="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded"
                  title="Copy signature"
                >
                  <Copy className="w-4 h-4 text-green-600 dark:text-green-400" />
                </button>
                <button
                  onClick={handleViewOnExplorer}
                  className="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="w-4 h-4 text-green-600 dark:text-green-400" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Show additional data from the transaction */}
          {Object.keys(data.data).length > 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              {Object.entries(data.data).map(([key, value]) => {
                if (key === 'signature' || key === 'transactionType' || key === 'confirmed') return null;
                
                const isAddress = typeof value === 'string' && (
                  key.toLowerCase().includes('address') || 
                  key.toLowerCase().includes('authority') ||
                  key.toLowerCase().includes('provider') ||
                  key.toLowerCase().includes('subscriber') ||
                  key.toLowerCase().includes('mint') ||
                  value.length > 40 // Likely a Solana address or similar
                );
                
                return (
                  <div key={key}>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                    </span>
                    <p 
                      className={`font-mono text-sm text-zinc-800 dark:text-zinc-200 truncate ${
                        isAddress ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 px-1 -mx-1 rounded transition-colors' : ''
                      }`}
                      onClick={isAddress ? () => handleCopyAddress(value as string) : undefined}
                      title={isAddress ? 'Click to copy address' : undefined}
                    >
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                      {isAddress && copiedAddress === value && (
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">Copied!</span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
