import { CheckCircle, XCircle, Clock, User, CreditCard, Calendar, ArrowRight } from "lucide-react";

interface SubscriptionManagerProps {
  data?: {
    success: boolean;
    message: string;
    data?: {
      authority?: string;
      totalProviders?: number;
      totalSubscriptions?: number;
      signature?: string;
      managerAddress?: string;
    };
    suggestion?: string;
  };
}

export const SubscriptionManager = ({ data }: SubscriptionManagerProps) => {
  if (!data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 w-48 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        {data.success ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
          Subscription Manager
        </h3>
      </div>
      
      <p className="text-zinc-600 dark:text-zinc-400 mb-3">{data.message}</p>
      
      {data.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          {data.data.authority && (
            <div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Authority</div>
              <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200 break-all">
                {data.data.authority}
              </div>
            </div>
          )}
          {data.data.totalProviders !== undefined && (
            <div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Total Providers</div>
              <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                {data.data.totalProviders}
              </div>
            </div>
          )}
          {data.data.totalSubscriptions !== undefined && (
            <div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Total Subscriptions</div>
              <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                {data.data.totalSubscriptions}
              </div>
            </div>
          )}
          {data.data.signature && (
            <div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Transaction</div>
              <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200 break-all">
                {data.data.signature}
              </div>
            </div>
          )}
          {data.data.managerAddress && (
            <div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Manager Address</div>
              <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200 break-all">
                {data.data.managerAddress}
              </div>
            </div>
          )}
        </div>
      )}
      
      {data.suggestion && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-blue-800 dark:text-blue-200">{data.suggestion}</p>
        </div>
      )}
    </div>
  );
};

interface SubscriptionPlanProps {
  data?: {
    success: boolean;
    message: string;
    data?: {
      planId?: string;
      name?: string;
      description?: string;
      pricePerPeriod?: string;
      periodDuration?: string;
      periodDurationSeconds?: number;
      paymentToken?: string;
      maxSubscribers?: string;
      currentSubscribers?: number;
      totalRevenue?: string;
      isActive?: boolean;
      createdAt?: string;
      provider?: string;
      address?: string;
      signature?: string;
      planAddress?: string;
      vaultAddress?: string;
      planDetails?: any;
    };
  };
}

export const SubscriptionPlan = ({ data }: SubscriptionPlanProps) => {
  if (!data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-48 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
          <div className="h-3 w-32 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
        </div>
      </div>
    );
  }

  const planData = data.data?.planDetails || data.data;
  
  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        {data.success ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
          {planData?.name || "Subscription Plan"}
        </h3>
        {planData?.isActive && (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
            Active
          </span>
        )}
      </div>
      
      <p className="text-zinc-600 dark:text-zinc-400 mb-3">{data.message}</p>
      
      {planData && (
        <div className="space-y-4">
          {planData.description && (
            <p className="text-zinc-700 dark:text-zinc-300">{planData.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            {planData.planId && (
              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Plan ID</div>
                <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
                  {planData.planId}
                </div>
              </div>
            )}
            {planData.pricePerPeriod && (
              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Price</div>
                <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {planData.pricePerPeriod} tokens / {planData.periodDuration || "period"}
                </div>
              </div>
            )}
            {planData.currentSubscribers !== undefined && (
              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Subscribers</div>
                <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {planData.currentSubscribers} / {planData.maxSubscribers || "∞"}
                </div>
              </div>
            )}
            {planData.totalRevenue && (
              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Total Revenue</div>
                <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {planData.totalRevenue} tokens
                </div>
              </div>
            )}
            {planData.createdAt && (
              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Created</div>
                <div className="text-sm text-zinc-800 dark:text-zinc-200">
                  {new Date(planData.createdAt).toLocaleString()}
                </div>
              </div>
            )}
            {planData.provider && (
              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Provider</div>
                <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200 break-all">
                  {planData.provider}
                </div>
              </div>
            )}
            {planData.paymentToken && (
              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Payment Token</div>
                <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200 break-all">
                  {planData.paymentToken}
                </div>
              </div>
            )}
          </div>
          
          {(data.data?.signature || data.data?.planAddress) && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              {data.data.signature && (
                <div className="mb-2">
                  <div className="text-sm text-blue-700 dark:text-blue-300">Transaction</div>
                  <div className="font-mono text-sm text-blue-800 dark:text-blue-200 break-all">
                    {data.data.signature}
                  </div>
                </div>
              )}
              {data.data.planAddress && (
                <div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Plan Address</div>
                  <div className="font-mono text-sm text-blue-800 dark:text-blue-200 break-all">
                    {data.data.planAddress}
                  </div>
                </div>
              )}
              {data.data.vaultAddress && (
                <div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Vault Address</div>
                  <div className="font-mono text-sm text-blue-800 dark:text-blue-200 break-all">
                    {data.data.vaultAddress}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SubscriptionListProps {
  data?: {
    success: boolean;
    message: string;
    data?: {
      providerAddress?: string;
      subscriberAddress?: string;
      totalPlans?: number;
      totalSubscriptions?: number;
      plans?: Array<{
        address: string;
        planId: string;
        name: string;
        description: string;
        pricePerPeriod: string;
        periodDuration: string;
        currentSubscribers: number;
        maxSubscribers: string;
        totalRevenue: string;
        isActive: boolean;
        createdAt: string;
      }>;
      subscriptions?: Array<{
        address: string;
        subscriptionPlan: string;
        startTime: string;
        nextPaymentDue: string;
        isActive: boolean;
        isPaused: boolean;
        totalPaymentsMade: number;
        totalAmountPaid: string;
      }>;
    };
  };
}

export const SubscriptionList = ({ data }: SubscriptionListProps) => {
  if (!data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-48 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
          <div className="h-3 w-32 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
        </div>
      </div>
    );
  }

  const items = data.data?.plans || data.data?.subscriptions || [];
  const isPlans = !!data.data?.plans;

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        {data.success ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
          {isPlans ? "Subscription Plans" : "Subscriptions"}
        </h3>
      </div>
      
      <p className="text-zinc-600 dark:text-zinc-400 mb-3">{data.message}</p>
      
      {data.data && (
        <div className="space-y-4">
          {(data.data.providerAddress || data.data.subscriberAddress) && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                {isPlans ? "Provider" : "Subscriber"}
              </div>
              <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200 break-all">
                {data.data.providerAddress || data.data.subscriberAddress}
              </div>
            </div>
          )}
          
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  {isPlans ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {(item as any).name}
                          </h4>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {(item as any).description}
                          </p>
                        </div>
                        {(item as any).isActive && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-zinc-500 dark:text-zinc-400">Price:</span>
                          <div className="font-semibold">{(item as any).pricePerPeriod}</div>
                        </div>
                        <div>
                          <span className="text-zinc-500 dark:text-zinc-400">Period:</span>
                          <div>{(item as any).periodDuration}</div>
                        </div>
                        <div>
                          <span className="text-zinc-500 dark:text-zinc-400">Subscribers:</span>
                          <div>{(item as any).currentSubscribers}</div>
                        </div>
                        <div>
                          <span className="text-zinc-500 dark:text-zinc-400">Revenue:</span>
                          <div>{(item as any).totalRevenue}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
                            {(item as any).address.slice(0, 16)}...
                          </h4>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Plan: {(item as any).subscriptionPlan.slice(0, 16)}...
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {(item as any).isActive && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                              Active
                            </span>
                          )}
                          {(item as any).isPaused && (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
                              Paused
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-zinc-500 dark:text-zinc-400">Started:</span>
                          <div>{new Date((item as any).startTime).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <span className="text-zinc-500 dark:text-zinc-400">Next Payment:</span>
                          <div>{new Date((item as any).nextPaymentDue).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <span className="text-zinc-500 dark:text-zinc-400">Paid:</span>
                          <div>{(item as any).totalAmountPaid} tokens</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              No {isPlans ? "plans" : "subscriptions"} found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SubscriptionActionProps {
  data?: {
    success: boolean;
    message: string;
    data?: {
      signature?: string;
      subscriptionAddress?: string;
      subscriber?: string;
      planAddress?: string;
      startTime?: string;
      nextPaymentDue?: string;
      amount?: string;
      paymentNumber?: number;
      provider?: string;
      planId?: string;
      address?: string;
      note?: string;
      isActive?: boolean;
      isPaused?: boolean;
      pausedAt?: string | null;
      cancelledAt?: string | null;
      totalPaymentsMade?: number;
      totalAmountPaid?: string;
      paymentNonce?: string;
    };
  };
}

export const SubscriptionAction = ({ data }: SubscriptionActionProps) => {
  if (!data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 w-48 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        {data.success ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
          {data.data?.subscriptionAddress || data.data?.planAddress ? "Subscription Details" : "Action Result"}
        </h3>
        {data.data?.isActive && (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
            Active
          </span>
        )}
        {data.data?.isPaused && (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
            Paused
          </span>
        )}
      </div>
      
      <p className="text-zinc-600 dark:text-zinc-400 mb-3">{data.message}</p>
      
      {data.data && (
        <div className="space-y-3">
          {data.data.signature && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">Transaction Signature</div>
              <div className="font-mono text-sm text-blue-800 dark:text-blue-200 break-all">
                {data.data.signature}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(data.data)
              .filter(([key]) => key !== 'signature')
              .map(([key, value]) => {
                if (value === null || value === undefined) return null;
                
                const isAddress = key.includes('Address') || key === 'subscriber' || key === 'provider';
                const isTimestamp = key.includes('Time') || key.includes('At');
                const displayValue = isAddress && typeof value === 'string' && value.length > 20 
                  ? `${value.slice(0, 16)}...` 
                  : isTimestamp && typeof value === 'string' && value !== 'null'
                  ? new Date(value).toLocaleString()
                  : String(value);
                
                return (
                  <div key={key} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className={`text-sm text-zinc-800 dark:text-zinc-200 ${isAddress ? 'font-mono break-all' : ''}`}>
                      {displayValue}
                    </div>
                  </div>
                );
              })
              .filter(Boolean)}
          </div>
        </div>
      )}
    </div>
  );
};

interface PeriodDurationsProps {
  data?: {
    success: boolean;
    message: string;
    data?: {
      durations: Array<{
        name: string;
        seconds: number;
        humanReadable: string;
      }>;
      note?: string;
    };
  };
}

export const PeriodDurations = ({ data }: PeriodDurationsProps) => {
  if (!data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 w-48 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
          Period Durations
        </h3>
      </div>
      
      <p className="text-zinc-600 dark:text-zinc-400 mb-3">{data.message}</p>
      
      {data.data && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.data.durations.map((duration, index) => (
              <div key={index} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {duration.name}
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {duration.humanReadable}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
                      {duration.seconds}s
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {data.data.note && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-blue-800 dark:text-blue-200 text-sm">{data.data.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface WalletInfoProps {
  data?: {
    success: boolean;
    message: string;
    data?: {
      address: string;
      note?: string;
    };
  };
}

export const WalletInfo = ({ data }: WalletInfoProps) => {
  if (!data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 w-48 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <User className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
          Wallet Information
        </h3>
      </div>
      
      <p className="text-zinc-600 dark:text-zinc-400 mb-3">{data.message}</p>
      
      {data.data && (
        <div className="space-y-3">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Address</div>
            <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200 break-all">
              {data.data.address}
            </div>
          </div>
          
          {data.data.note && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-blue-800 dark:text-blue-200 text-sm">{data.data.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
