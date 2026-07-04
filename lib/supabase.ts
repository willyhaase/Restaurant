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

export const supabase = {
  from: (...args: Parameters<SupabaseClient["from"]>) => getSupabase().from(...args),
};

export type KitchenType = "hot" | "cold";
export type QuantityMode = "full" | "half";

export interface PrepSession {
  id: string;
  prep_date: string;
  created_at: string;
}

export interface PrepTask {
  id: string;
  session_id: string;
  name: string;
  name_en: string;
  name_de: string;
  unit: string;
  kitchen_type: KitchenType;
  note: string | null;
  done: boolean;
  quantity_mode: QuantityMode | null;
  template_id: string | null;
  created_at: string;
}

export interface PrepItemTemplate {
  id: string;
  name: string;
  name_en: string;
  name_de: string;
  unit: string;
  kitchen_type: KitchenType;
  full_quantity: string;
  half_quantity: string;
  active: boolean;
}

export interface SupplyItem {
  id: string;
  name: string;
  name_en: string | null;
  name_de: string | null;
  unit: string;
  category: string | null;
  active: boolean;
  sort_order: number;
}

export interface SupplyFlag {
  id: string;
  item_id: string;
  status: "low" | "out";
  quantity_remaining: number | null;
  unit: string | null;
  notes: string | null;
  reported_by_name: string | null;
  reported_at: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by_name: string | null;
  supply_items?: SupplyItem;
}

export function localizedName(tmpl: Pick<PrepItemTemplate, "name" | "name_en" | "name_de">, locale: string): string {
  if (locale === "en" && tmpl.name_en) return tmpl.name_en;
  if (locale === "de" && tmpl.name_de) return tmpl.name_de;
  return tmpl.name;
}
