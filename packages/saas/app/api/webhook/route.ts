import { NextRequest, NextResponse } from "next/server";

// Step 4: Stripe webhookハンドラ
export async function POST(_req: NextRequest) {
  return NextResponse.json({ received: true });
}
