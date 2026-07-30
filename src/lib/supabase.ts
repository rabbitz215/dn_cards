import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = url && anon ? createClient(url, anon) : null;

export function isSupabaseConfigured() {
  return !!supabase;
}

export type CardStat = { stat: string; values: number[] };
export type MonsterCard = {
  card_no: number;
  name: string;
  nest: string;
  stats: CardStat[];
};
