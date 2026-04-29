import { NextRequest, NextResponse } from "next/server";
import { anthropic, SYSTEM_PROMPT, Message } from "@/lib/anthropic";
import {
  createServiceClient,
  isSupabaseConfigured,
  PLAN_LIMITS,
  monthStart,
} from "@/lib/supabase-server";
import type { ImageBlockParam, Base64PDFSource } from "@anthropic-ai/sdk/resources/messages";

export const runtime = "nodejs";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

// ユーザーIDとプランを解決する
async function resolveUser(
  token: string | null
): Promise<{ userId: string | null; plan: string }> {
  if (!token || !isSupabaseConfigured) return { userId: null, plan: "free" };

  try {
    const db = createServiceClient();
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return { userId: null, plan: "free" };

    const { data: profile } = await db
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    return { userId: user.id, plan: profile?.plan ?? "free" };
  } catch {
    return { userId: null, plan: "free" };
  }
}

// 今月の利用回数を確認し、上限チェック
async function checkAndLogUsage(userId: string, plan: string): Promise<boolean> {
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  if (limit === Infinity) {
    // 無制限プランでもログは記録
    await createServiceClient().from("usage_logs").insert({ user_id: userId });
    return true;
  }

  const db = createServiceClient();
  const { count } = await db
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart());

  if ((count ?? 0) >= limit) return false;

  await db.from("usage_logs").insert({ user_id: userId });
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // リクエストのパース（FormData / JSON 両対応）
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

    // 認証チェック
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const { userId, plan } = await resolveUser(token);

    // ログインユーザーの利用回数チェック
    if (userId && isSupabaseConfigured) {
      const allowed = await checkAndLogUsage(userId, plan);
      if (!allowed) {
        const limitNum = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
        return NextResponse.json(
          {
            error: `今月の利用回数（${limitNum}回）に達しました。スタンダードプランにアップグレードすると無制限でご利用いただけます。`,
            upgrade: true,
          },
          { status: 429 }
        );
      }
    }

    // ユーザーメッセージのコンテンツブロックを構築
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
          source: { type: "base64", media_type: mime as AcceptedImageType, data: base64 },
        });
      } else if (mime === "application/pdf") {
        userContent.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
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
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
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
