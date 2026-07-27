import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export async function isGoogleProviderEnabled() {
  if (!isSupabaseConfigured) return false;
  const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/settings`, {
    headers: { apikey: supabaseAnonKey },
  });
  if (!response.ok) throw new Error("인증 설정을 확인하지 못했습니다");
  const settings = await response.json() as { external?: { google?: boolean } };
  return settings.external?.google === true;
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  },
);
