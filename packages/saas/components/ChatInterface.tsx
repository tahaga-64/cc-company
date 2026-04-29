"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/lib/anthropic";
import MessageBubble from "./MessageBubble";
import FileUploader from "./FileUploader";

type Mode = "photo" | "scan" | "chat";

const INITIAL_MESSAGES: Message[] = [
  {
    role: "assistant",
    content:
      "こんにちは！ 📋 確定申告・税務書類のサポートをします。\n\n書類の写真を撮るか、テキストでご質問ください。どんな書類でもお気軽にどうぞ！",
  },
];

const TABS: { mode: Mode; label: string }[] = [
  { mode: "photo", label: "📸 写真" },
  { mode: "scan", label: "📄 スキャン" },
  { mode: "chat", label: "💬 チャット" },
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<Mode>("chat");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // モード切り替え時にファイルをクリア
  const handleModeChange = (mode: Mode) => {
    setActiveMode(mode);
    setSelectedFile(null);
  };

  const canSend = (input.trim() || selectedFile !== null) && !isLoading;

  const sendMessage = async () => {
    if (!canSend) return;

    const trimmed = input.trim();
    const file = selectedFile;

    // ユーザーメッセージの表示テキスト
    let displayContent = trimmed;
    if (file && trimmed) displayContent = `📎 ${file.name}\n${trimmed}`;
    else if (file) displayContent = `📎 ${file.name}`;

    const priorHistory = [...messages];
    setMessages([
      ...priorHistory,
      { role: "user", content: displayContent },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setSelectedFile(null);
    setIsLoading(true);

    try {
      let res: Response;

      if (file) {
        const formData = new FormData();
        formData.append("message", trimmed);
        formData.append("history", JSON.stringify(priorHistory));
        formData.append("file", file);
        res = await fetch("/api/analyze", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history: priorHistory }),
        });
      }

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw) as { text?: string; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              assistantText += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantText };
                return updated;
              });
            }
          } catch {
            // malformed chunk - skip
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "エラーが発生しました。もう一度お試しください。",
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto">
      {/* ヘッダー */}
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-3">
        <span className="text-xl">📋</span>
        <div>
          <h1 className="font-bold text-base">確定申告サポート</h1>
          <p className="text-xs text-blue-200">AIが書類の記入をお手伝い</p>
        </div>
      </div>

      {/* モードタブ */}
      <div className="flex border-b border-gray-200 bg-white">
        {TABS.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeMode === mode
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ファイルアップローダー */}
      <FileUploader
        mode={activeMode}
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
      />

      {/* メッセージリスト */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            message={msg}
            isLoading={
              isLoading &&
              idx === messages.length - 1 &&
              msg.role === "assistant" &&
              msg.content === ""
            }
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ローディング表示 */}
      {isLoading && (
        <div className="px-4 py-1">
          <p className="text-xs text-gray-400 animate-pulse">
            書類を読み取っています...
          </p>
        </div>
      )}

      {/* 入力エリア */}
      <div className="border-t border-gray-200 px-4 py-3 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeMode === "chat"
                ? "質問を入力してください..."
                : "コメントを追加（任意）..."
            }
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 max-h-32 overflow-y-auto"
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!canSend}
            className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 active:bg-blue-800 transition-colors flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          ※ AIの回答は参考情報です。正確な内容は税理士にご確認ください
        </p>
      </div>
    </div>
  );
}
