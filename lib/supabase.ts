import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
