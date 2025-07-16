import { motion } from "framer-motion";
import Link from "next/link";

import { BlocksIcon, MessageCircleIcon } from "lucide-react";

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-[500px] mt-20 mx-4 md:mx-0"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="border-none bg-muted/50 rounded-2xl p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700">
        <p className="flex flex-row justify-center gap-4 items-center text-zinc-900 dark:text-zinc-50">
          <MessageCircleIcon strokeWidth={1} />
          <span>.</span>
          <BlocksIcon strokeWidth={1} />
        </p>
        <p>
          Chatbot powered by Subs3 to help you manage your subscriptions on Solana.
          Ask the bot about subscription plans, payments, and more.
        </p>
        <p>
          Start by typing your question in the input box below or by using the quick actions.
        </p>
      </div>
    </motion.div>
  );
};
