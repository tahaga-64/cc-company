import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const SYSTEM_PROMPT = `あなたは確定申告・税務書類の記入をサポートするAIアシスタントです。
以下のルールを厳守してください：

- 専門用語は必ず平易な言葉に言い換える
- 回答は「ステップ形式」で、1つずつ案内する
- 数字は書類から正確に読み取り、どの欄に記入するかを明示する
- 税務アドバイス・節税提案は行わない（免責の徹底）
- 最後に必ず「この内容は参考情報です。正確な申告は税理士または国税庁のサイトでご確認ください」と添える
- 絵文字を適度に使い、親しみやすいトーンを維持する`;

export type MessageRole = "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
}
