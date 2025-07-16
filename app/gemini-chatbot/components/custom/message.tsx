"use client";

import { Attachment, ToolInvocation, Message as AIMessage, CreateMessage } from "ai";
import { motion } from "framer-motion";
import { ReactNode } from "react";

import { BotIcon, UserIcon } from "./icons";
import { Markdown } from "./markdown";
import { PreviewAttachment } from "./preview-attachment";
import { 
  SubscriptionManager, 
  SubscriptionPlan, 
  SubscriptionList, 
  SubscriptionAction, 
  PeriodDurations, 
  WalletInfo 
} from "./subscription-components";
import { TransactionSigning, TransactionExecution } from "./transaction-components";

export const Message = ({
  chatId,
  role,
  content,
  toolInvocations,
  attachments,
  append,
}: {
  chatId: string;
  role: string;
  content: string | ReactNode;
  toolInvocations: Array<ToolInvocation> | undefined;
  attachments?: Array<Attachment>;
  append?: (message: AIMessage | CreateMessage) => Promise<string | null | undefined>;
}) => {
  return (
    <motion.div
      className={`flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0 first-of-type:pt-20 break-words`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="size-[24px] border rounded-sm p-1 flex flex-col justify-center items-center shrink-0 text-zinc-500">
        {role === "assistant" ? <BotIcon /> : <UserIcon />}
      </div>

      <div className="flex flex-col gap-2 w-full">
        {content && typeof content === "string" && (
          <div className="text-zinc-800 dark:text-zinc-300 flex flex-col gap-4">
            <Markdown>{content}</Markdown>
          </div>
        )}

        {toolInvocations && (
          <div className="flex flex-col gap-4">
            {toolInvocations.map((toolInvocation) => {
              const { toolName, toolCallId, state } = toolInvocation;

              if (state === "result") {
                const { result } = toolInvocation;

                return (
                  <div key={toolCallId}>
                    {toolName === "initialize_manager" ? (
                      <SubscriptionManager data={result} />
                    ) : toolName === "get_subscription_manager" ? (
                      <SubscriptionManager data={result} />
                    ) : toolName === "create_subscription_plan" ? (
                      <SubscriptionPlan data={result} />
                    ) : toolName === "get_subscription_plan" ? (
                      <SubscriptionPlan data={result} />
                    ) : toolName === "get_provider_plans" ? (
                      <SubscriptionList data={result} />
                    ) : toolName === "get_subscriber_subscriptions" ? (
                      <SubscriptionList data={result} />
                    ) : toolName === "subscribe" ? (
                      <SubscriptionAction data={result} />
                    ) : toolName === "process_payment" ? (
                      <SubscriptionAction data={result} />
                    ) : toolName === "get_subscription" ? (
                      <SubscriptionAction data={result} />
                    ) : toolName === "get_plan_address" ? (
                      <SubscriptionAction data={result} />
                    ) : toolName === "get_subscription_address" ? (
                      <SubscriptionAction data={result} />
                    ) : toolName === "get_period_durations" ? (
                      <PeriodDurations data={result} />
                    ) : toolName === "get_wallet_info" ? (
                      <WalletInfo data={result} />
                    ) : toolName === "build_initialize_manager_tx" ? (
                      <TransactionSigning data={result} append={append} />
                    ) : toolName === "build_create_subscription_plan_tx" ? (
                      <TransactionSigning data={result} append={append} />
                    ) : toolName === "build_subscribe_tx" ? (
                      <TransactionSigning data={result} append={append} />
                    ) : toolName === "build_process_payment_tx" ? (
                      <TransactionSigning data={result} append={append} />
                    ) : toolName === "execute_transaction" ? (
                      <TransactionExecution data={result} />
                    ) : (
                      <div>{JSON.stringify(result, null, 2)}</div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div key={toolCallId} className="skeleton">
                    {toolName === "initialize_manager" ? (
                      <SubscriptionManager />
                    ) : toolName === "get_subscription_manager" ? (
                      <SubscriptionManager />
                    ) : toolName === "create_subscription_plan" ? (
                      <SubscriptionPlan />
                    ) : toolName === "get_subscription_plan" ? (
                      <SubscriptionPlan />
                    ) : toolName === "get_provider_plans" ? (
                      <SubscriptionList />
                    ) : toolName === "get_subscriber_subscriptions" ? (
                      <SubscriptionList />
                    ) : toolName === "subscribe" ? (
                      <SubscriptionAction />
                    ) : toolName === "process_payment" ? (
                      <SubscriptionAction />
                    ) : toolName === "get_subscription" ? (
                      <SubscriptionAction />
                    ) : toolName === "get_plan_address" ? (
                      <SubscriptionAction />
                    ) : toolName === "get_subscription_address" ? (
                      <SubscriptionAction />
                    ) : toolName === "get_period_durations" ? (
                      <PeriodDurations />
                    ) : toolName === "get_wallet_info" ? (
                      <WalletInfo />
                    ) : toolName === "build_initialize_manager_tx" ? (
                      <TransactionSigning />
                    ) : toolName === "build_create_subscription_plan_tx" ? (
                      <TransactionSigning />
                    ) : toolName === "build_subscribe_tx" ? (
                      <TransactionSigning />
                    ) : toolName === "build_process_payment_tx" ? (
                      <TransactionSigning />
                    ) : toolName === "execute_transaction" ? (
                      <TransactionExecution />
                    ) : null}
                  </div>
                );
              }
            })}
          </div>
        )}

        {attachments && (
          <div className="flex flex-row gap-2">
            {attachments.map((attachment) => (
              <PreviewAttachment key={attachment.url} attachment={attachment} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
