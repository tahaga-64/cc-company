import { createClient } from "@supabase/supabase-js";

// ビルド時に空文字だと createClient が throw するためプレースホルダーを使う
// 実際の動作には .env.local への設定が必要
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
