"use client";

import { Message } from "@/lib/anthropic";

interface Props {
  message: Message;
  isLoading?: boolean;
}

export default function MessageBubble({ message, isLoading }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs mr-2 flex-shrink-0 mt-1">
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-100 text-gray-800 rounded-bl-sm"
        }`}
      >
        {isLoading ? (
          <span className="flex items-center gap-1">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce [animation-delay:0.1s]">●</span>
            <span className="animate-bounce [animation-delay:0.2s]">●</span>
          </span>
        ) : (
          <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
        )}
      </div>
    </div>
  );
}
