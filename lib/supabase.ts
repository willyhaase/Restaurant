import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    _client = createClient(url, key);
  }
  return _client;
}

// Convenience alias — only call from client components (useEffect / event handlers)
export const supabase = {
  from: (...args: Parameters<SupabaseClient["from"]>) => getSupabase().from(...args),
};

export type KitchenType = "hot" | "cold";

export interface PrepSession {
  id: string;
  prep_date: string;
  created_at: string;
}

export interface PrepTask {
  id: string;
  session_id: string;
  name: string;
  unit: string;
  kitchen_type: KitchenType;
  note: string | null;
  done: boolean;
  created_at: string;
}

export interface PrepItemTemplate {
  id: string;
  name: string;
  unit: string;
  kitchen_type: KitchenType;
}
