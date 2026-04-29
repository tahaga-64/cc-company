import { NextRequest, NextResponse } from "next/server";
import { anthropic, SYSTEM_PROMPT, Message } from "@/lib/anthropic";
import type { ImageBlockParam, Base64PDFSource } from "@anthropic-ai/sdk/resources/messages";

export const runtime = "nodejs";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

export async function POST(req: NextRequest) {
  try {
    // FormData（ファイル有り）と JSON（テキストのみ）の両方を受け付ける
    const contentType = req.headers.get("content-type") ?? "";
    let message = "";
    let history: Message[] = [];
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      message = (formData.get("message") as string) ?? "";
      const historyRaw = (formData.get("history") as string) ?? "[]";
      history = JSON.parse(historyRaw) as Message[];
      file = formData.get("file") as File | null;
    } else {
      const body = (await req.json()) as { message: string; history: Message[] };
      message = body.message ?? "";
      history = body.history ?? [];
    }

    if (!message.trim() && !file) {
      return NextResponse.json({ error: "メッセージまたはファイルが必要です" }, { status: 400 });
    }

    // ユーザーメッセージのコンテンツを構築
    type ContentBlock =
      | ImageBlockParam
      | { type: "document"; source: Base64PDFSource }
      | { type: "text"; text: string };

    const userContent: ContentBlock[] = [];

    if (file) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mime = file.type;

      if (ACCEPTED_IMAGE_TYPES.includes(mime as AcceptedImageType)) {
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mime as AcceptedImageType,
            data: base64,
          },
        });
      } else if (mime === "application/pdf") {
        userContent.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64,
          },
        });
      }
    }

    userContent.push({
      type: "text",
      text: message.trim() || "この書類を分析して、何をどこにどう記入すればよいか教えてください。",
    });

    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userContent },
    ];

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = await anthropic.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: SYSTEM_PROMPT,
            messages,
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[analyze] error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
