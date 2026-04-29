import { createClient } from "@supabase/supabase-js";

// サーバーサイド専用（APIルートからのみ使用）
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// プラン別月間上限
export const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  standard: Infinity,
  season: Infinity,
};

// 今月の月初ISO文字列
export function monthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
